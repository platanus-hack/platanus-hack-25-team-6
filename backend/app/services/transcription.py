from openai import AsyncOpenAI
from ..core.config import get_settings
import aiofiles
from pathlib import Path

settings = get_settings()


class TranscriptionService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def transcribe_audio(self, file_path: str) -> dict:
        """
        Transcribe audio file using OpenAI Whisper

        Args:
            file_path: Path to audio file

        Returns:
            dict with transcript and metadata
        """
        try:
            async with aiofiles.open(file_path, 'rb') as audio_file:
                content = await audio_file.read()

            # Create a temporary file-like object for OpenAI
            from io import BytesIO
            audio_buffer = BytesIO(content)
            audio_buffer.name = Path(file_path).name

            # Transcribe using Whisper with Spanish forced
            transcript = await self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_buffer,
                language="es",  # Force Spanish language
                response_format="verbose_json"
            )

            return {
                "text": transcript.text,
                "duration": transcript.duration if hasattr(transcript, 'duration') else None,
                "language": transcript.language if hasattr(transcript, 'language') else None,
            }
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")


transcription_service = TranscriptionService()
