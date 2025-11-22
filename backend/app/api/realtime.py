from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.realtime_service import OpenAIRealtimeService
from ..services.scam_detection import scam_detection_service
from ..core.database import get_database
from ..models.recording import Recording, RecordingStatus
from datetime import datetime
import json
import uuid
import asyncio

router = APIRouter(prefix="/realtime", tags=["realtime"])


class RealtimeSession:
    """Manages a real-time transcription and analysis session"""

    def __init__(self, websocket: WebSocket, session_id: str):
        self.websocket = websocket
        self.session_id = session_id
        self.openai_service = OpenAIRealtimeService()
        self.recording_id: str = None
        self.transcript_buffer = []
        self.current_risk_level = "low"
        self.active = False

    async def start(self):
        """Start the real-time session"""
        try:
            print(f"[Session {self.session_id}] Starting session...")

            # Connect to OpenAI Realtime API
            print(f"[Session {self.session_id}] Connecting to OpenAI...")
            await self.openai_service.connect()
            self.active = True
            print(f"[Session {self.session_id}] Connected to OpenAI successfully")

            # Create recording document
            db = get_database()
            self.recording_id = str(uuid.uuid4())
            recording = Recording(
                id=self.recording_id,
                user_id=None,
                file_path=f"realtime/{self.session_id}",
                status=RecordingStatus.PROCESSING,
                transcript=""
            )

            recording_dict = recording.model_dump(by_alias=True, exclude={"id"})
            recording_dict["_id"] = self.recording_id
            await db.recordings.insert_one(recording_dict)
            print(f"[Session {self.session_id}] Recording created: {self.recording_id}")

            # Send session started message
            await self.websocket.send_json({
                "type": "session.started",
                "session_id": self.session_id,
                "recording_id": self.recording_id
            })
            print(f"[Session {self.session_id}] Session started message sent")

            # Start listening to OpenAI responses
            asyncio.create_task(self.listen_to_openai())
            print(f"[Session {self.session_id}] Listening task started")

        except Exception as e:
            print(f"[Session {self.session_id}] ERROR starting session: {str(e)}")
            import traceback
            traceback.print_exc()

            try:
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"Failed to start session: {str(e)}"
                })
            except:
                print(f"[Session {self.session_id}] Could not send error to client")

            self.active = False

    async def handle_audio(self, audio_data: bytes):
        """Handle incoming audio from client"""
        try:
            if not hasattr(self, '_audio_chunks_received'):
                self._audio_chunks_received = 0
            self._audio_chunks_received += 1

            if self._audio_chunks_received % 50 == 0:
                print(f"[Session {self.session_id}] Received {self._audio_chunks_received} audio chunks ({len(audio_data)} bytes)")

            await self.openai_service.send_audio(audio_data)
        except Exception as e:
            print(f"[Session {self.session_id}] Error handling audio: {str(e)}")
            await self.websocket.send_json({
                "type": "error",
                "message": f"Failed to process audio: {str(e)}"
            })

    async def listen_to_openai(self):
        """Listen for events from OpenAI Realtime API"""
        print(f"[Session {self.session_id}] Starting to listen to OpenAI events...")
        try:
            async def handle_event(event: dict):
                event_type = event.get("type")
                print(f"[Session {self.session_id}] OpenAI event: {event_type}")

                # Handle different event types
                if event_type == "conversation.item.input_audio_transcription.completed":
                    # Transcription of user's audio
                    transcript = event.get("transcript", "")
                    self.transcript_buffer.append({
                        "role": "user",
                        "text": transcript,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                    # Send transcript to client
                    await self.websocket.send_json({
                        "type": "transcript.update",
                        "role": "user",
                        "text": transcript
                    })

                    # Update database
                    await self.update_recording()

                elif event_type == "error":
                    error_msg = event.get("error", {}).get("message", "Unknown error")
                    await self.websocket.send_json({
                        "type": "error",
                        "message": error_msg
                    })

            print(f"[Session {self.session_id}] Calling openai_service.listen()...")
            await self.openai_service.listen(handle_event)
            print(f"[Session {self.session_id}] openai_service.listen() completed")

        except Exception as e:
            print(f"[Session {self.session_id}] Error in listen_to_openai: {str(e)}")
            import traceback
            traceback.print_exc()

            try:
                await self.websocket.send_json({
                    "type": "error",
                    "message": f"OpenAI connection error: {str(e)}"
                })
            except:
                print(f"[Session {self.session_id}] Could not send error to client")

            self.active = False

    async def analyze_with_claude(self):
        """Analyze conversation using Claude (same as async analysis)"""
        try:
            # Get all user transcripts (filter out assistant analysis)
            user_transcripts = [
                item['text'] for item in self.transcript_buffer
                if item['role'] == 'user'
            ]

            if not user_transcripts:
                # No transcript yet, send low risk
                await self.websocket.send_json({
                    "type": "analysis.complete",
                    "risk_level": "low",
                    "indicators": [],
                    "text": "Nivel de Riesgo: BAJO\nIndicadores: Ninguno detectado\nRecomendación: Continuar normalmente\nExplicación: No se ha detectado conversación aún."
                })
                return

            # Combine transcripts
            full_transcript = "\n".join(user_transcripts)
            print(f"[Session {self.session_id}] Analyzing transcript with Claude: {full_transcript[:100]}...")

            # Use Claude Haiku for fast realtime analysis
            analysis = await scam_detection_service.analyze_conversation(
                full_transcript,
                use_fast_model=True  # Use Haiku for speed in realtime
            )

            # Map to our format
            risk_level_map = {
                "low": "low",
                "medium": "medium",
                "high": "high",
                "critical": "critical"
            }

            risk_level = risk_level_map.get(analysis.risk_level.value, "low")
            self.current_risk_level = risk_level

            # Create formatted text response in Spanish
            risk_level_spanish = {
                "low": "BAJO",
                "medium": "MEDIO",
                "high": "ALTO",
                "critical": "CRÍTICO"
            }

            # Build formatted text with metadata
            formatted_parts = [
                f"Nivel de Riesgo: {risk_level_spanish.get(risk_level, risk_level.upper())}",
                f"Indicadores: {', '.join(analysis.indicators) if analysis.indicators else 'Ninguno detectado'}",
            ]

            # Add metadata if present
            if analysis.meta:
                if analysis.meta.impersonating:
                    formatted_parts.append(f"Suplantando: {analysis.meta.impersonating}")
                if analysis.meta.scam_type:
                    formatted_parts.append(f"Tipo de Estafa: {analysis.meta.scam_type}")
                if analysis.meta.urgency_level:
                    formatted_parts.append(f"Nivel de Urgencia: {analysis.meta.urgency_level}")
                if analysis.meta.information_requested:
                    formatted_parts.append(f"Información Solicitada: {', '.join(analysis.meta.information_requested)}")
                if analysis.meta.payment_methods:
                    formatted_parts.append(f"Métodos de Pago: {', '.join(analysis.meta.payment_methods)}")

            formatted_parts.extend([
                f"Recomendación: {analysis.recommended_actions[0] if analysis.recommended_actions else 'Continuar normalmente'}",
                f"Explicación: {analysis.reasoning}"
            ])

            formatted_text = "\n".join(formatted_parts)

            print(f"[Session {self.session_id}] ✅ Claude analysis: {risk_level} risk, {len(analysis.indicators)} indicators")

            # Add analysis to transcript buffer for history
            self.transcript_buffer.append({
                "role": "assistant",
                "text": formatted_text,
                "timestamp": datetime.utcnow().isoformat()
            })

            # Send to client
            await self.websocket.send_json({
                "type": "analysis.complete",
                "risk_level": risk_level,
                "indicators": analysis.indicators,
                "text": formatted_text
            })

            # Update recording
            await self.update_recording()

        except Exception as e:
            print(f"[Session {self.session_id}] Error in Claude analysis: {str(e)}")
            import traceback
            traceback.print_exc()

    async def update_recording(self):
        """Update recording in database with latest transcript"""
        db = get_database()

        # Combine all transcripts
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

    async def stop(self):
        """Stop the session"""
        print(f"[Session {self.session_id}] Stopping session...")
        self.active = False

        if self.openai_service:
            try:
                await self.openai_service.disconnect()
                print(f"[Session {self.session_id}] OpenAI disconnected")
            except Exception as e:
                print(f"[Session {self.session_id}] Error disconnecting from OpenAI: {e}")

        # Perform final comprehensive analysis and mark recording as complete
        if self.recording_id:
            try:
                db = get_database()

                # Get full conversation transcript for final analysis
                user_transcripts = [
                    item['text'] for item in self.transcript_buffer
                    if item['role'] == 'user'
                ]

                if user_transcripts:
                    print(f"[Session {self.session_id}] Performing final comprehensive analysis...")
                    full_transcript = "\n".join(user_transcripts)

                    # Use Sonnet 4 for accurate final analysis (not Haiku)
                    final_analysis = await scam_detection_service.analyze_conversation(
                        full_transcript,
                        use_fast_model=False  # Use Sonnet 4 for deep, accurate analysis
                    )

                    # Prepare update data with complete analysis
                    update_data = {
                        "status": RecordingStatus.ANALYZED,
                        "scam_risk_level": final_analysis.risk_level.value,
                        "scam_confidence": final_analysis.confidence,
                        "scam_indicators": final_analysis.indicators,
                        "updated_at": datetime.utcnow()
                    }

                    # Add metadata if present
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

                    print(f"[Session {self.session_id}] ✅ Final analysis saved: {final_analysis.risk_level.value} risk, {final_analysis.confidence:.2f} confidence")
                else:
                    # No transcript, just mark as analyzed
                    await db.recordings.update_one(
                        {"_id": self.recording_id},
                        {
                            "$set": {
                                "status": RecordingStatus.ANALYZED,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    print(f"[Session {self.session_id}] Recording marked as analyzed (no transcript)")

            except Exception as e:
                print(f"[Session {self.session_id}] Error in final analysis: {e}")
                import traceback
                traceback.print_exc()

                # Still try to mark as analyzed even if analysis fails
                try:
                    await db.recordings.update_one(
                        {"_id": self.recording_id},
                        {
                            "$set": {
                                "status": RecordingStatus.ANALYZED,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                except:
                    pass

        # Try to send stopped message, but don't fail if client is gone
        try:
            await self.websocket.send_json({
                "type": "session.stopped",
                "recording_id": self.recording_id
            })
            print(f"[Session {self.session_id}] Stopped message sent")
        except Exception as e:
            print(f"[Session {self.session_id}] Could not send stopped message (client likely disconnected): {e}")


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time transcription and scam detection"""
    await websocket.accept()

    session_id = str(uuid.uuid4())
    session = RealtimeSession(websocket, session_id)

    try:
        # Start the session
        await session.start()

        # Handle incoming messages
        print(f"[Session {session_id}] Starting message loop...")
        while session.active:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                print(f"[Session {session_id}] Client disconnected")
                break

            if "bytes" in message:
                # Audio data
                audio_data = message["bytes"]
                await session.handle_audio(audio_data)

            elif "text" in message:
                # Control messages
                data = json.loads(message["text"])
                print(f"[Session {session_id}] Control message: {data.get('type')}")

                if data.get("type") == "stop":
                    print(f"[Session {session_id}] Stop requested by client")
                    break
                elif data.get("type") == "analyze":
                    # Request immediate analysis using Claude
                    print(f"[Session {session_id}] Analysis requested")
                    await session.analyze_with_claude()

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass  # Client already disconnected
    finally:
        await session.stop()
        # Don't try to close if already closed
        try:
            await websocket.close()
        except:
            pass  # Already closed
