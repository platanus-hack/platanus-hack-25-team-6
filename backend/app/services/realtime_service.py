import asyncio
import json
import base64
from typing import Optional, Callable
import websockets
from ..core.config import get_settings

settings = get_settings()


class OpenAIRealtimeService:
    """Service to handle OpenAI Realtime API WebSocket connections"""

    def __init__(self):
        self.ws_url = "wss://api.openai.com/v1/realtime"
        self.model = "gpt-realtime"  # Latest GA model (2025)
        self.api_key = settings.openai_api_key
        self.connection: Optional[websockets.WebSocketClientProtocol] = None
        self.session_active = False

    async def connect(self):
        """Establish WebSocket connection to OpenAI Realtime API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }

            print(f"[OpenAI] Connecting to {self.ws_url}?model={self.model}")

            self.connection = await websockets.connect(
                f"{self.ws_url}?model={self.model}",
                additional_headers=headers
            )

            print("[OpenAI] WebSocket connection established")
            self.session_active = True

            # Configure session with scam detection instructions
            print("[OpenAI] Configuring session...")
            await self.configure_session()
            print("[OpenAI] Session configured successfully")

        except Exception as e:
            print(f"[OpenAI] Connection error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

    async def configure_session(self):
        """Configure the session for passive call monitoring (Twilio integration)"""
        session_config = {
            "type": "session.update",
            "session": {
                "modalities": ["text"],  # Text-only responses (no audio output)
                "instructions": """ERES UN SISTEMA DE TRANSCRIPCIÓN PASIVO - NO UN ASISTENTE CONVERSACIONAL

REGLAS CRÍTICAS:
- NO saludes ni reconozcas a los hablantes
- NO respondas a preguntas en el audio
- NO participes en la conversación
- NO digas "¿en qué puedo ayudarte?" o frases similares
- Eres un OBSERVADOR SILENCIOSO transcribiendo una llamada de terceros

IDIOMA:
- Transcribe TODO en ESPAÑOL
- NO traduzcas nada a inglés u otros idiomas
- Mantén el audio en el idioma original (español)
- Si escuchas palabras en inglés u otro idioma, transcríbelas tal cual se pronuncian en español

TU ÚNICA FUNCIÓN:
Transcribir el audio que escuchas en ESPAÑOL. Punto.

NO intentes analizar o responder. Otro sistema (Claude) hará el análisis.""",
                "input_audio_format": "pcm16",
                "input_audio_transcription": {
                    "model": "whisper-1",
                    "language": "es"  # Force Spanish language
                },
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": 0.4,  # Lower threshold for faster detection (was 0.5)
                    "prefix_padding_ms": 200,  # Reduced padding for faster response (was 300)
                    "silence_duration_ms": 300,  # Faster transcription on shorter pauses (was 500)
                    "create_response": False  # Critical: Only transcribe, never auto-respond
                },
                "temperature": 0.6,  # Minimum allowed by OpenAI (0.6)
                "max_response_output_tokens": 2048
            }
        }

        await self.connection.send(json.dumps(session_config))

    async def send_audio(self, audio_data: bytes):
        """Send audio chunk to OpenAI"""
        if not self.connection or not self.session_active:
            raise Exception("Connection not established")

        # Convert audio to base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        message = {
            "type": "input_audio_buffer.append",
            "audio": audio_base64
        }

        await self.connection.send(json.dumps(message))

    async def commit_audio(self):
        """Commit audio buffer for processing"""
        if not self.connection or not self.session_active:
            raise Exception("Connection not established")

        message = {
            "type": "input_audio_buffer.commit"
        }

        await self.connection.send(json.dumps(message))

    async def create_response(self):
        """Request scam risk analysis from the model"""
        if not self.connection or not self.session_active:
            raise Exception("Connection not established")

        message = {
            "type": "response.create",
            "response": {
                "modalities": ["text"],
                "instructions": """Analyze the conversation transcript so far and provide a scam risk assessment.

IMPORTANT: You are analyzing a THIRD-PARTY conversation (not talking to you).

Provide your analysis in this exact format:
Risk Level: [LOW/MEDIUM/HIGH/CRITICAL]
Indicators: [comma-separated list of specific scam tactics detected, or "None" if clean]
Recommendation: [specific action - "Continue normally" / "Stay alert" / "Verify caller identity" / "Hang up immediately"]
Explanation: [1-2 sentences explaining why this risk level was assigned]

Base your assessment ONLY on the conversation transcript you've received."""
            }
        }

        await self.connection.send(json.dumps(message))

    async def listen(self, callback: Callable):
        """Listen for messages from OpenAI and call callback"""
        if not self.connection:
            raise Exception("Connection not established")

        print("[OpenAI] Starting to listen for messages...")
        message_count = 0
        try:
            async for message in self.connection:
                message_count += 1
                data = json.loads(message)
                print(f"[OpenAI] Message #{message_count}: {data.get('type', 'unknown')}")
                await callback(data)
        except websockets.exceptions.ConnectionClosed as e:
            print(f"[OpenAI] Connection closed: {e}")
            self.session_active = False
        except Exception as e:
            print(f"[OpenAI] Error in listen loop: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            print(f"[OpenAI] Listen loop ended. Total messages: {message_count}")

    async def disconnect(self):
        """Close the WebSocket connection"""
        if self.connection:
            self.session_active = False
            await self.connection.close()

    def parse_scam_analysis(self, response_text: str) -> dict:
        """Parse scam analysis from model response"""
        # Extract risk level and indicators from response
        risk_level = "low"
        indicators = []

        text_lower = response_text.lower()

        # Determine risk level
        if "critical" in text_lower or "hang up" in text_lower:
            risk_level = "critical"
        elif "high risk" in text_lower or "likely scam" in text_lower:
            risk_level = "high"
        elif "medium" in text_lower or "suspicious" in text_lower:
            risk_level = "medium"

        # Extract indicators (simple keyword matching)
        scam_keywords = [
            "urgency", "immediate action", "gift card", "wire transfer",
            "social security", "irs", "tech support", "prize", "lottery",
            "legal action", "arrest", "personal information", "password"
        ]

        for keyword in scam_keywords:
            if keyword in text_lower:
                indicators.append(keyword)

        return {
            "risk_level": risk_level,
            "indicators": list(set(indicators)),  # Remove duplicates
            "full_response": response_text
        }


realtime_service = OpenAIRealtimeService()
