from fastapi import APIRouter, Request, Response, WebSocket, WebSocketDisconnect
from twilio.twiml.voice_response import VoiceResponse, Connect
from twilio.rest import Client as TwilioClient
from ..core.config import get_settings
from ..core.database import get_database
from ..models.recording import Recording, RecordingStatus
from ..services.realtime_service import OpenAIRealtimeService
from ..services.scam_detection import scam_detection_service
from ..services.whatsapp_service import whatsapp_service
from datetime import datetime
import json
import base64
import uuid
import asyncio
from pathlib import Path

router = APIRouter(prefix="/twilio", tags=["twilio"])

# Active sessions: call_sid -> session info
active_sessions = {}


class TwilioCallSession:
    """Manages a Twilio call with real-time transcription and scam detection"""

    # Configuration: risk levels that trigger audio warning
    WARNING_AUDIO_TRIGGERS = ["high", "critical"]  # Customize as needed

    def __init__(self, call_sid: str, stream_sid: str, caller_number: str, called_number: str = None):
        self.call_sid = call_sid
        self.stream_sid = stream_sid
        self.caller_number = caller_number  # From (quien llama)
        self.called_number = called_number  # To (tu número Twilio)
        self.recording_id = str(uuid.uuid4())
        self.openai_service = OpenAIRealtimeService()
        self.transcript_buffer = []
        self.current_risk_level = "low"
        self.active = False
        self.twilio_websocket = None
        self.frontend_websockets = set()  # Multiple frontends can watch
        self.audio_chunks_received = 0
        self.start_time = datetime.utcnow()  # Track call start time
        self.duration = 0  # Duration in seconds
        self.warning_audio_played = False  # Track if warning already played
        self.whatsapp_alert_sent = False  # Track if WhatsApp alert already sent

    async def start(self, twilio_ws: WebSocket):
        """Start the call session"""
        try:
            print(f"[Twilio Call {self.call_sid}] Starting session...")
            self.twilio_websocket = twilio_ws

            # Connect to OpenAI Realtime API
            await self.openai_service.connect()
            self.active = True
            print(f"[Twilio Call {self.call_sid}] Connected to OpenAI")

            # Create recording document
            db = get_database()
            recording = Recording(
                id=self.recording_id,
                user_id=self.caller_number,
                file_path=f"twilio/{self.call_sid}",
                status=RecordingStatus.PROCESSING,
                transcript="",
                caller_number=self.caller_number,
                called_number=self.called_number
            )

            recording_dict = recording.model_dump(by_alias=True, exclude={"id"})
            recording_dict["_id"] = self.recording_id
            await db.recordings.insert_one(recording_dict)
            print(f"[Twilio Call {self.call_sid}] Recording created: {self.recording_id}")

            # Notify frontends
            await self.broadcast_to_frontends({
                "type": "call.started",
                "call_sid": self.call_sid,
                "caller_number": self.caller_number,
                "called_number": self.called_number,
                "recording_id": self.recording_id,
                "start_time": self.start_time.isoformat()
            })

            # Start listening to OpenAI responses
            asyncio.create_task(self.listen_to_openai())

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] ERROR starting: {str(e)}")
            import traceback
            traceback.print_exc()
            self.active = False

    async def handle_audio(self, audio_payload: str):
        """Handle incoming audio from Twilio (mulaw base64)"""
        try:
            self.audio_chunks_received += 1

            if self.audio_chunks_received % 50 == 0:
                print(f"[Twilio Call {self.call_sid}] Received {self.audio_chunks_received} audio chunks")

            # Decode mulaw audio
            audio_data = base64.b64decode(audio_payload)

            # Convert mulaw to PCM16 for OpenAI
            # Twilio sends 8kHz mulaw, OpenAI expects 24kHz PCM16
            pcm16_audio = self.convert_mulaw_to_pcm16(audio_data)

            # Send to OpenAI
            await self.openai_service.send_audio(pcm16_audio)

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] Error handling audio: {str(e)}")

    def convert_mulaw_to_pcm16(self, mulaw_data: bytes) -> bytes:
        """Convert 8kHz mulaw to 24kHz PCM16 for OpenAI"""
        import audioop

        # Decode mulaw to PCM (linear)
        pcm_8k = audioop.ulaw2lin(mulaw_data, 2)

        # Resample from 8kHz to 24kHz
        pcm_24k, _ = audioop.ratecv(pcm_8k, 2, 1, 8000, 24000, None)

        return pcm_24k

    async def listen_to_openai(self):
        """Listen for transcription events from OpenAI"""
        print(f"[Twilio Call {self.call_sid}] Starting to listen to OpenAI events...")
        try:
            async def handle_event(event: dict):
                event_type = event.get("type")

                if event_type == "conversation.item.input_audio_transcription.completed":
                    transcript = event.get("transcript", "")
                    self.transcript_buffer.append({
                        "role": "user",
                        "text": transcript,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                    # Broadcast to frontends
                    await self.broadcast_to_frontends({
                        "type": "transcript.update",
                        "role": "user",
                        "text": transcript
                    })

                    # Update database
                    await self.update_recording()

                    # Trigger analysis every 3 transcripts (more frequent for calls)
                    user_transcript_count = sum(1 for item in self.transcript_buffer if item['role'] == 'user')
                    if user_transcript_count % 3 == 0:
                        asyncio.create_task(self.analyze_with_claude())

                elif event_type == "error":
                    error_msg = event.get("error", {}).get("message", "Unknown error")
                    print(f"[Twilio Call {self.call_sid}] OpenAI error: {error_msg}")

            await self.openai_service.listen(handle_event)

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] Error in listen_to_openai: {str(e)}")
            import traceback
            traceback.print_exc()
            self.active = False

    async def analyze_with_claude(self):
        """Analyze conversation using Claude"""
        try:
            user_transcripts = [
                item['text'] for item in self.transcript_buffer
                if item['role'] == 'user'
            ]

            if not user_transcripts:
                return

            full_transcript = "\n".join(user_transcripts)
            print(f"[Twilio Call {self.call_sid}] Analyzing with Claude...")

            # Use Haiku for fast real-time analysis
            analysis = await scam_detection_service.analyze_conversation(
                full_transcript,
                use_fast_model=True
            )

            risk_level = analysis.risk_level.value
            self.current_risk_level = risk_level

            # Format Spanish response
            risk_level_spanish = {
                "low": "BAJO",
                "medium": "MEDIO",
                "high": "ALTO",
                "critical": "CRÍTICO"
            }

            formatted_parts = [
                f"Nivel de Riesgo: {risk_level_spanish.get(risk_level, risk_level.upper())}",
                f"Indicadores: {', '.join(analysis.indicators) if analysis.indicators else 'Ninguno detectado'}",
            ]

            if analysis.meta:
                if analysis.meta.impersonating:
                    formatted_parts.append(f"Suplantando: {analysis.meta.impersonating}")
                if analysis.meta.scam_type:
                    formatted_parts.append(f"Tipo de Estafa: {analysis.meta.scam_type}")
                if analysis.meta.urgency_level:
                    formatted_parts.append(f"Nivel de Urgencia: {analysis.meta.urgency_level}")

            formatted_parts.extend([
                f"Recomendación: {analysis.recommended_actions[0] if analysis.recommended_actions else 'Continuar normalmente'}",
                f"Explicación: {analysis.reasoning}"
            ])

            formatted_text = "\n".join(formatted_parts)

            print(f"[Twilio Call {self.call_sid}] ✅ Analysis: {risk_level} risk")

            # Add to transcript buffer
            self.transcript_buffer.append({
                "role": "assistant",
                "text": formatted_text,
                "timestamp": datetime.utcnow().isoformat()
            })

            # Broadcast to frontends
            await self.broadcast_to_frontends({
                "type": "analysis.complete",
                "risk_level": risk_level,
                "indicators": analysis.indicators,
                "text": formatted_text,
                "is_danger": risk_level in ["medium", "high", "critical"]
            })

            # Inject warning audio if risk level triggers it
            if risk_level in self.WARNING_AUDIO_TRIGGERS:
                print(f"[Twilio Call {self.call_sid}] 🚨 Risk level {risk_level.upper()} detected - triggering audio warning")
                asyncio.create_task(self.inject_warning_audio())

            # Send WhatsApp alert for medium, high, or critical risk
            if risk_level in ["medium", "high", "critical"] and not self.whatsapp_alert_sent:
                asyncio.create_task(self.send_whatsapp_alert(
                    risk_level=risk_level,
                    summary=analysis.reasoning,
                    indicators=analysis.indicators
                ))

            # Update recording
            await self.update_recording()

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] Error in analysis: {str(e)}")
            import traceback
            traceback.print_exc()

    async def update_recording(self):
        """Update recording in database"""
        db = get_database()

        full_transcript = "\n".join([
            f"[{item['role'].upper()}]: {item['text']}"
            for item in self.transcript_buffer
        ])

        await db.recordings.update_one(
            {"_id": self.recording_id},
            {
                "$set": {
                    "transcript": full_transcript,
                    "scam_risk_level": self.current_risk_level,
                    "updated_at": datetime.utcnow()
                }
            }
        )

    async def broadcast_to_frontends(self, message: dict):
        """Broadcast message to all connected frontends"""
        disconnected = set()
        for ws in self.frontend_websockets:
            try:
                await ws.send_json(message)
            except:
                disconnected.add(ws)

        # Remove disconnected websockets
        self.frontend_websockets -= disconnected

    async def inject_warning_audio(self):
        """Inject warning audio into the active Twilio call"""
        if self.warning_audio_played:
            print(f"[Twilio Call {self.call_sid}] ⚠️ Warning audio already played, skipping")
            return

        try:
            settings = get_settings()

            # Check if Twilio is configured
            if not settings.twilio_account_sid or not settings.twilio_auth_token:
                print(f"[Twilio Call {self.call_sid}] ❌ Twilio credentials not configured")
                return

            # Find warning audio file directly from filesystem
            audio_dir = Path(__file__).parent.parent.parent / "assets" / "audio"
            audio_file = None

            # Look for warning audio in order of preference
            for filename in ["warning.mp3", "warning.wav", "warning.ogg"]:
                file_path = audio_dir / filename
                if file_path.exists():
                    audio_file = file_path
                    break

            if not audio_file:
                print(f"[Twilio Call {self.call_sid}] ⚠️ No warning audio file found in {audio_dir}")
                print(f"[Twilio Call {self.call_sid}] Expected: warning.mp3, warning.wav, or warning.ogg")
                return

            # Build URL to audio endpoint (reads from filesystem)
            base_url = settings.base_url.rstrip('/')
            audio_url = f"{base_url}/api/v1/twilio/warning-audio"

            print(f"[Twilio Call {self.call_sid}] 🔊 Injecting warning audio into call...")
            print(f"[Twilio Call {self.call_sid}]    Audio URL: {audio_url}")

            # Initialize Twilio client
            client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)

            # Update the call to play audio from our endpoint
            call = client.calls(self.call_sid).update(
                twiml=f'<Response><Play>{audio_url}</Play></Response>'
            )

            self.warning_audio_played = True
            print(f"[Twilio Call {self.call_sid}] ✅ Warning audio injected successfully")

            # Notify frontends that audio was played
            await self.broadcast_to_frontends({
                "type": "warning.audio_played",
                "message": "Audio de advertencia reproducido en la llamada"
            })

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] ❌ Error injecting audio: {str(e)}")
            import traceback
            traceback.print_exc()

    async def send_whatsapp_alert(self, risk_level: str, summary: str, indicators: list):
        """Send WhatsApp scam alert to all registered users"""
        if self.whatsapp_alert_sent:
            print(f"[Twilio Call {self.call_sid}] WhatsApp alert already sent, skipping")
            return

        try:
            # Format summary with indicators
            full_summary = summary
            if indicators:
                full_summary += f"\n\n*Indicadores detectados:* {', '.join(indicators)}"

            # Get all registered users from database
            db = get_database()
            users = await db.users.find({}).to_list(length=None)

            if not users:
                print(f"[Twilio Call {self.call_sid}] No registered users found for WhatsApp alert")
                return

            print(f"[Twilio Call {self.call_sid}] 📱 Sending WhatsApp alert to {len(users)} registered users")

            sent_count = 0
            for user in users:
                phone_number = user.get("phone", "").replace("+", "")
                if not phone_number:
                    continue

                try:
                    # Calculate current duration
                    current_duration = (datetime.utcnow() - self.start_time).total_seconds()

                    await whatsapp_service.send_scam_alert(
                        to=phone_number,
                        risk_level=risk_level,
                        summary=full_summary,
                        caller_number=self.caller_number,
                        duration=current_duration
                    )
                    sent_count += 1
                    print(f"[Twilio Call {self.call_sid}] ✅ Alert sent to {phone_number}")
                except Exception as e:
                    print(f"[Twilio Call {self.call_sid}] ❌ Error sending to {phone_number}: {str(e)}")

            self.whatsapp_alert_sent = True
            print(f"[Twilio Call {self.call_sid}] ✅ WhatsApp alerts sent to {sent_count}/{len(users)} users")

            # Notify frontends
            await self.broadcast_to_frontends({
                "type": "alert.whatsapp_sent",
                "sent_count": sent_count,
                "risk_level": risk_level
            })

        except Exception as e:
            print(f"[Twilio Call {self.call_sid}] ❌ Error sending WhatsApp alerts: {str(e)}")
            import traceback
            traceback.print_exc()

    async def stop(self):
        """Stop the call session"""
        print(f"[Twilio Call {self.call_sid}] Stopping session...")
        self.active = False

        # Calculate duration
        self.duration = (datetime.utcnow() - self.start_time).total_seconds()

        if self.openai_service:
            try:
                await self.openai_service.disconnect()
            except Exception as e:
                print(f"[Twilio Call {self.call_sid}] Error disconnecting OpenAI: {e}")

        # Perform final analysis
        if self.recording_id:
            try:
                db = get_database()
                user_transcripts = [
                    item['text'] for item in self.transcript_buffer
                    if item['role'] == 'user'
                ]

                if user_transcripts:
                    print(f"[Twilio Call {self.call_sid}] Performing final analysis...")
                    full_transcript = "\n".join(user_transcripts)

                    # Use Sonnet 4 for accurate final analysis
                    final_analysis = await scam_detection_service.analyze_conversation(
                        full_transcript,
                        use_fast_model=False
                    )

                    update_data = {
                        "status": RecordingStatus.ANALYZED,
                        "scam_risk_level": final_analysis.risk_level.value,
                        "scam_confidence": final_analysis.confidence,
                        "scam_indicators": final_analysis.indicators,
                        "duration": self.duration,
                        "updated_at": datetime.utcnow()
                    }

                    if final_analysis.meta:
                        update_data["scam_metadata"] = {
                            "impersonating": final_analysis.meta.impersonating,
                            "scam_type": final_analysis.meta.scam_type,
                            "urgency_level": final_analysis.meta.urgency_level,
                            "information_requested": final_analysis.meta.information_requested,
                            "payment_methods": final_analysis.meta.payment_methods
                        }

                    await db.recordings.update_one(
                        {"_id": self.recording_id},
                        {"$set": update_data}
                    )

                    print(f"[Twilio Call {self.call_sid}] ✅ Final analysis saved")
                else:
                    await db.recordings.update_one(
                        {"_id": self.recording_id},
                        {"$set": {"status": RecordingStatus.ANALYZED, "duration": self.duration, "updated_at": datetime.utcnow()}}
                    )

            except Exception as e:
                print(f"[Twilio Call {self.call_sid}] Error in final analysis: {e}")
                import traceback
                traceback.print_exc()

        # Notify frontends
        await self.broadcast_to_frontends({
            "type": "call.stopped",
            "recording_id": self.recording_id,
            "duration": self.duration
        })

        # Close frontend connections
        for ws in self.frontend_websockets:
            try:
                await ws.close()
            except:
                pass


@router.post("/incoming-call")
async def incoming_call(request: Request):
    """Webhook handler for incoming Twilio calls"""
    settings = get_settings()
    form_data = await request.form()
    caller_number = form_data.get("From")
    called_number = form_data.get("To")
    call_sid = form_data.get("CallSid")

    print(f"📞 Incoming call from {caller_number} to {called_number} (SID: {call_sid})")

    response = VoiceResponse()

    # Connect to media stream with custom parameters
    connect = Connect()
    base_url_clean = settings.base_url.replace('https://', '').replace('http://', '')
    websocket_url = f'wss://{base_url_clean}/api/v1/twilio/media-stream'

    # Pass phone numbers as custom parameters
    stream = connect.stream(url=websocket_url)
    stream.parameter(name='From', value=caller_number)
    stream.parameter(name='To', value=called_number)

    response.append(connect)

    return Response(content=str(response), media_type="application/xml")


@router.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    """WebSocket endpoint for Twilio media streams"""
    await websocket.accept()

    session = None
    stream_sid = None

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            event = msg.get('event')

            if event == 'start':
                stream_sid = msg.get('streamSid')
                call_sid = msg['start']['callSid']

                # Extract phone numbers from the start event
                # Twilio sends these in the 'start' payload
                start_data = msg['start']
                caller_number = start_data.get('customParameters', {}).get('From') or start_data.get('from', 'Unknown')
                called_number = start_data.get('customParameters', {}).get('To') or start_data.get('to', 'Unknown')

                print(f"🎙️ Media stream started: {call_sid}")
                print(f"   From: {caller_number} → To: {called_number}")

                # Create session
                session = TwilioCallSession(call_sid, stream_sid, caller_number, called_number)
                active_sessions[call_sid] = session

                # Start session
                await session.start(websocket)

            elif event == 'media':
                if session and msg.get('media', {}).get('payload'):
                    await session.handle_audio(msg['media']['payload'])

            elif event == 'stop':
                print(f"🛑 Media stream stopped: {stream_sid}")
                if session:
                    await session.stop()
                    if session.call_sid in active_sessions:
                        del active_sessions[session.call_sid]
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ WebSocket error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        if session:
            await session.stop()
            if session.call_sid in active_sessions:
                del active_sessions[session.call_sid]


@router.websocket("/monitor/{call_sid}")
async def monitor_call(websocket: WebSocket, call_sid: str):
    """WebSocket endpoint for frontends to monitor active calls"""
    await websocket.accept()

    session = active_sessions.get(call_sid)
    if not session:
        await websocket.send_json({
            "type": "error",
            "message": "Call not found or not active"
        })
        await websocket.close()
        return

    # Add frontend to session
    session.frontend_websockets.add(websocket)
    print(f"[Monitor] Frontend connected to call {call_sid}")

    # Send current state
    current_duration = (datetime.utcnow() - session.start_time).total_seconds()
    await websocket.send_json({
        "type": "call.state",
        "call_sid": call_sid,
        "caller_number": session.caller_number,
        "called_number": session.called_number,
        "recording_id": session.recording_id,
        "current_risk_level": session.current_risk_level,
        "transcript": session.transcript_buffer,
        "start_time": session.start_time.isoformat(),
        "duration": current_duration
    })

    try:
        # Keep connection alive
        while True:
            message = await websocket.receive_text()
            # Frontends can send control messages here if needed
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[Monitor] Error: {e}")
    finally:
        if session and websocket in session.frontend_websockets:
            session.frontend_websockets.remove(websocket)
        print(f"[Monitor] Frontend disconnected from call {call_sid}")


@router.get("/active-calls")
async def get_active_calls():
    """Get list of active calls"""
    return {
        "active_calls": [
            {
                "call_sid": session.call_sid,
                "caller_number": session.caller_number,
                "called_number": session.called_number,
                "recording_id": session.recording_id,
                "current_risk_level": session.current_risk_level,
                "transcript_count": len(session.transcript_buffer),
                "start_time": session.start_time.isoformat(),
                "duration": (datetime.utcnow() - session.start_time).total_seconds()
            }
            for session in active_sessions.values()
        ]
    }


@router.get("/health")
async def twilio_health():
    """Health check"""
    settings = get_settings()
    return {
        "status": "ok",
        "twilio_configured": bool(settings.twilio_account_sid and settings.twilio_auth_token),
        "active_calls": len(active_sessions)
    }


@router.get("/warning-audio")
async def get_warning_audio():
    """Serve the warning audio file for Twilio to play during calls"""
    from fastapi.responses import FileResponse

    # Find warning audio file from filesystem
    audio_dir = Path(__file__).parent.parent.parent / "assets" / "audio"

    # Look for warning audio in order of preference
    for filename in ["warning.mp3", "warning.wav", "warning.ogg"]:
        file_path = audio_dir / filename
        if file_path.exists():
            # Determine media type
            media_types = {
                ".mp3": "audio/mpeg",
                ".wav": "audio/wav",
                ".ogg": "audio/ogg"
            }
            media_type = media_types.get(file_path.suffix, "audio/mpeg")

            return FileResponse(
                path=str(file_path),
                media_type=media_type,
                filename=filename
            )

    # If no audio file found, return error
    return Response(
        content="Warning audio file not found. Please add warning.mp3, warning.wav, or warning.ogg to backend/assets/audio/",
        status_code=404,
        media_type="text/plain"
    )
