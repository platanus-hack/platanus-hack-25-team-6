from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from ..schemas.recording import RecordingResponse, TranscriptionResponse, ScamAnalysis
from ..models.recording import Recording, RecordingStatus, ScamRiskLevel
from ..core.database import get_database
from ..core.storage import minio_client
from ..services.transcription import transcription_service
from ..services.scam_detection import scam_detection_service
from datetime import datetime
from pathlib import Path
import uuid
import aiofiles
import os

router = APIRouter(prefix="/recordings", tags=["recordings"])


async def process_recording(recording_id: str, file_path: str):
    """Background task to process recording: transcribe and analyze"""
    db = get_database()

    try:
        # Step 1: Transcribe audio
        transcription_result = await transcription_service.transcribe_audio(file_path)
        transcript = transcription_result["text"]
        duration = transcription_result.get("duration")

        # Update recording with transcript
        await db.recordings.update_one(
            {"_id": recording_id},
            {
                "$set": {
                    "transcript": transcript,
                    "duration": duration,
                    "status": RecordingStatus.TRANSCRIBED,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Step 2: Analyze for scams
        scam_analysis = await scam_detection_service.analyze_conversation(transcript)

        # Update recording with analysis
        await db.recordings.update_one(
            {"_id": recording_id},
            {
                "$set": {
                    "status": RecordingStatus.ANALYZED,
                    "scam_analysis": scam_analysis.model_dump(),
                    "scam_risk_level": scam_analysis.risk_level,
                    "scam_confidence": scam_analysis.confidence,
                    "scam_indicators": scam_analysis.indicators,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # Clean up local file
        if os.path.exists(file_path):
            os.remove(file_path)

    except Exception as e:
        print(f"Error processing recording {recording_id}: {str(e)}")
        # Update recording status to failed
        await db.recordings.update_one(
            {"_id": recording_id},
            {
                "$set": {
                    "status": RecordingStatus.FAILED,
                    "updated_at": datetime.utcnow()
                }
            }
        )


@router.post("/upload", response_model=RecordingResponse)
async def upload_recording(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = None
):
    """Upload audio recording for processing"""
    db = get_database()

    # Validate file type
    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    try:
        # Generate unique recording ID and filename
        recording_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        file_extension = Path(file.filename).suffix or ".webm"
        object_name = f"recordings/{timestamp}_{recording_id}{file_extension}"

        # Save file temporarily for processing
        temp_dir = Path("/tmp/recordings")
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file_path = str(temp_dir / f"{recording_id}{file_extension}")

        async with aiofiles.open(temp_file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        # Upload to MinIO
        file_url = await minio_client.upload_file(
            open(temp_file_path, 'rb'),
            object_name,
            file.content_type
        )

        # Create recording document
        recording = Recording(
            id=recording_id,
            user_id=user_id,
            file_path=object_name,
            file_url=file_url,
            status=RecordingStatus.PROCESSING
        )

        # Insert into database
        recording_dict = recording.model_dump(by_alias=True, exclude={"id"})
        recording_dict["_id"] = recording_id
        await db.recordings.insert_one(recording_dict)

        # Process in background
        background_tasks.add_task(process_recording, recording_id, temp_file_path)

        return RecordingResponse(
            id=recording_id,
            user_id=user_id,
            file_url=file_url,
            duration=None,
            status=RecordingStatus.PROCESSING,
            transcript=None,
            scam_risk_level=None,
            scam_confidence=None,
            scam_indicators=None,
            created_at=recording.created_at,
            updated_at=recording.updated_at
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload recording: {str(e)}")


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(recording_id: str):
    """Get recording details and analysis"""
    db = get_database()

    recording = await db.recordings.find_one({"_id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    return RecordingResponse(
        id=recording["_id"],
        user_id=recording.get("user_id"),
        file_url=recording.get("file_url"),
        duration=recording.get("duration"),
        status=recording.get("status", RecordingStatus.PROCESSING),
        transcript=recording.get("transcript"),
        scam_risk_level=recording.get("scam_risk_level"),
        scam_confidence=recording.get("scam_confidence"),
        scam_indicators=recording.get("scam_indicators"),
        caller_number=recording.get("caller_number"),
        called_number=recording.get("called_number"),
        created_at=recording.get("created_at"),
        updated_at=recording.get("updated_at")
    )


@router.get("/", response_model=list[RecordingResponse])
async def list_recordings(user_id: str = None, limit: int = 50, skip: int = 0):
    """List all recordings"""
    db = get_database()

    query = {}
    if user_id:
        query["user_id"] = user_id

    cursor = db.recordings.find(query).sort("created_at", -1).skip(skip).limit(limit)
    recordings = await cursor.to_list(length=limit)

    return [
        RecordingResponse(
            id=rec["_id"],
            user_id=rec.get("user_id"),
            file_url=rec.get("file_url"),
            duration=rec.get("duration"),
            status=rec.get("status", RecordingStatus.PROCESSING),
            transcript=rec.get("transcript"),
            scam_risk_level=rec.get("scam_risk_level"),
            scam_confidence=rec.get("scam_confidence"),
            scam_indicators=rec.get("scam_indicators"),
            caller_number=rec.get("caller_number"),
            called_number=rec.get("called_number"),
            created_at=rec.get("created_at"),
            updated_at=rec.get("updated_at")
        )
        for rec in recordings
    ]


@router.delete("/{recording_id}")
async def delete_recording(recording_id: str):
    """Delete recording"""
    db = get_database()

    recording = await db.recordings.find_one({"_id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")

    # Delete from MinIO
    if recording.get("file_path"):
        try:
            await minio_client.delete_file(recording["file_path"])
        except Exception as e:
            print(f"Error deleting file from MinIO: {str(e)}")

    # Delete from database
    await db.recordings.delete_one({"_id": recording_id})

    return {"message": "Recording deleted successfully"}
