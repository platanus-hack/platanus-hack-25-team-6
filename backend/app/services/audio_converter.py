import asyncio
import subprocess
from pathlib import Path


async def convert_mulaw_to_wav(input_path: str, output_path: str) -> str:
    """
    Convert μ-law encoded raw audio to WAV format using ffmpeg.

    Args:
        input_path: Path to raw μ-law audio file
        output_path: Path for output WAV file

    Returns:
        Path to converted WAV file

    Raises:
        Exception: If conversion fails
    """
    try:
        # Build ffmpeg command
        command = [
            'ffmpeg',
            '-f', 'mulaw',           # Input format: μ-law
            '-ar', '8000',           # Sample rate: 8kHz (Twilio standard)
            '-ac', '1',              # Audio channels: 1 (mono)
            '-i', input_path,        # Input file
            '-y',                    # Overwrite output file if exists
            output_path              # Output file
        ]

        # Run ffmpeg
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            error_msg = stderr.decode() if stderr else "Unknown error"
            raise Exception(f"FFmpeg conversion failed: {error_msg}")

        print(f"✅ Converted to WAV: {output_path}")
        return output_path

    except FileNotFoundError:
        raise Exception("FFmpeg not found. Please install ffmpeg: https://ffmpeg.org/download.html")
    except Exception as e:
        raise Exception(f"Audio conversion failed: {str(e)}")


def convert_mulaw_to_wav_sync(input_path: str, output_path: str) -> str:
    """
    Synchronous version of μ-law to WAV conversion.

    Args:
        input_path: Path to raw μ-law audio file
        output_path: Path for output WAV file

    Returns:
        Path to converted WAV file

    Raises:
        Exception: If conversion fails
    """
    try:
        command = [
            'ffmpeg',
            '-f', 'mulaw',
            '-ar', '8000',
            '-ac', '1',
            '-i', input_path,
            '-y',
            output_path
        ]

        result = subprocess.run(
            command,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise Exception(f"FFmpeg conversion failed: {result.stderr}")

        print(f"✅ Converted to WAV: {output_path}")
        return output_path

    except FileNotFoundError:
        raise Exception("FFmpeg not found. Please install ffmpeg: https://ffmpeg.org/download.html")
    except Exception as e:
        raise Exception(f"Audio conversion failed: {str(e)}")
