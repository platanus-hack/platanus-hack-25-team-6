from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from twilio.twiml.voice_response import VoiceResponse, Connect
from ..core.config import get_settings
from ..core.database import get_database
from ..models.recording import Recording, RecordingStatus
from ..core.storage import minio_client
from datetime import datetime
from pathlib import Path
import json
import base64
import uuid
import os
import asyncio

router = APIRouter(prefix="/twilio", tags=["twilio"])
active_recordings = {}

NOTIFICATION_AUDIO_PATH = Path("./recordings/notification.raw")


@router.post("/incoming-call")
async def incoming_call(request: Request):
    """Webhook handler for incoming Twilio calls"""
    settings = get_settings()
    form_data = await request.form()
    caller_number = form_data.get("From")
    call_sid = form_data.get("CallSid")

    print(f"📞 Call from {caller_number} (SID: {call_sid})")

    response = VoiceResponse()

    # Use Connect for bidirectional streaming
    connect = Connect()
    base_url_clean = settings.base_url.replace('https://', '').replace('http://', '')
    websocket_url = f'wss://{base_url_clean}/api/v1/twilio/media-stream'
    connect.stream(url=websocket_url)
    response.append(connect)

    return Response(content=str(response), media_type="application/xml")


@router.post("/conference-status")
async def conference_status(request: Request):
    """Conference status callback"""
    return Response(content="OK", status_code=200)


@router.get("/health")
async def twilio_health():
    """Health check"""
    settings = get_settings()
    return {
        "status": "ok",
        "twilio_configured": bool(settings.twilio_account_sid and settings.twilio_auth_token)
    }


async def play_notification_audio(websocket: WebSocket, stream_sid: str):
    """Play notification audio after 5 seconds"""
    await asyncio.sleep(5)

    try:
        if not NOTIFICATION_AUDIO_PATH.exists():
            print("❌ Notification audio file not found")
            return

        print("🔊 Playing notification audio...")

        with open(NOTIFICATION_AUDIO_PATH, 'rb') as f:
            audio_data = f.read()

        # Send audio in chunks (160 bytes = 20ms at 8kHz)
        chunk_size = 160
        for i in range(0, len(audio_data), chunk_size):
            chunk = audio_data[i:i + chunk_size]
            payload = base64.b64encode(chunk).decode('utf-8')

            message = {
                "event": "media",
                "streamSid": stream_sid,
                "media": {
                    "payload": payload
                }
            }

            await websocket.send_text(json.dumps(message))
            await asyncio.sleep(0.02)  # 20ms delay between chunks

        print("✅ Notification audio completed")

    except Exception as e:
        print(f"❌ Error playing notification: {str(e)}")


async def process_recording(recording_id: str, raw_path: str):
    """Convert raw audio to WAV"""
    from ..services.audio_converter import convert_mulaw_to_wav

    try:
        # Convert to WAV
        wav_path = raw_path.replace('.raw', '.wav')
        await convert_mulaw_to_wav(raw_path, wav_path)

        # Upload to MinIO
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        object_name = f"recordings/{timestamp}_{recording_id}.wav"

        with open(wav_path, 'rb') as f:
            file_url = await minio_client.upload_file(f, object_name, "audio/wav")

        # Update database
        db = get_database()
        await db.recordings.update_one(
            {"_id": recording_id},
            {"$set": {"file_path": object_name, "file_url": file_url, "status": RecordingStatus.TRANSCRIBED}}
        )

        print(f"✅ Recording saved: {wav_path}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db = get_database()
        await db.recordings.update_one(
            {"_id": recording_id},
            {"$set": {"status": RecordingStatus.FAILED}}
        )


@router.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    """WebSocket endpoint for Twilio media streams"""
    await websocket.accept()

    stream_sid = None
    recording_id = None
    recording_file = None
    recording_path = None

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            event = msg.get('event')

            if event == 'start':
                stream_sid = msg.get('streamSid')
                call_sid = msg['start']['callSid']
                recording_id = str(uuid.uuid4())
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

                # Create file
                recordings_dir = Path("./recordings")
                recordings_dir.mkdir(exist_ok=True)
                recording_path = recordings_dir / f"recording-{call_sid}-{timestamp}.raw"

                recording_file = open(recording_path, 'wb')

                active_recordings[stream_sid] = {
                    'recording_id': recording_id,
                    'path': str(recording_path),
                    'start_time': datetime.utcnow()
                }

                # Save to database
                db = get_database()
                recording = Recording(id=recording_id, user_id=call_sid, status=RecordingStatus.PROCESSING)
                recording_dict = recording.model_dump(by_alias=True, exclude={"id"})
                recording_dict["_id"] = recording_id
                await db.recordings.insert_one(recording_dict)

                print(f"🎙️ Recording started: {call_sid}")

                # Start notification audio playback task
                asyncio.create_task(play_notification_audio(websocket, stream_sid))

            elif event == 'media':
                if msg.get('media') and msg['media'].get('payload'):
                    audio_chunk = base64.b64decode(msg['media']['payload'])
                    if recording_file:
                        recording_file.write(audio_chunk)
                        recording_file.flush()

            elif event == 'stop':
                if recording_file:
                    recording_file.close()
                    recording_file = None

                if stream_sid in active_recordings:
                    info = active_recordings[stream_sid]
                    asyncio.create_task(process_recording(info['recording_id'], info['path']))
                    del active_recordings[stream_sid]
                    print(f"✅ Recording completed")

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
    finally:
        if recording_file:
            recording_file.close()
        if stream_sid in active_recordings:
            del active_recordings[stream_sid]
