from typing import Optional
from ..core.database import get_database
from .whatsapp_service import whatsapp_service
import logging

logger = logging.getLogger(__name__)


class ImpersonationAlertService:
    """Service to handle impersonation detection and alerts"""

    async def check_and_alert_impersonation(
        self,
        user_id: str,
        impersonating_entity: str,
        scam_indicators: list[str],
        transcript: str,
        risk_level: str
    ) -> dict:
        """
        Check if impersonation matches a trusted contact and send WhatsApp alert

        Args:
            user_id: ID of the user receiving the call
            impersonating_entity: Who the scammer is pretending to be
            scam_indicators: List of scam indicators detected
            transcript: Call transcript
            risk_level: Risk level (low, medium, high, critical)

        Returns:
            Dictionary with alert status
        """
        try:
            db = get_database()

            # Search for matching trusted contact
            # Try to match by name (case insensitive, partial match)
            matching_contacts = []

            if impersonating_entity:
                # Clean and normalize the impersonating entity name
                search_term = impersonating_entity.lower().strip()

                # Get all user's trusted contacts
                contacts = await db.trusted_contacts.find({
                    "user_id": user_id
                }).to_list(length=100)

                # Find matches
                for contact in contacts:
                    contact_name = contact["name"].lower()
                    relationship = contact.get("relationship", "").lower()

                    # Check if impersonating entity matches name or relationship
                    if (search_term in contact_name or
                        contact_name in search_term or
                        (relationship and search_term in relationship) or
                        (relationship and relationship in search_term)):
                        matching_contacts.append(contact)

            logger.info(f"Found {len(matching_contacts)} matching trusted contacts for impersonation: {impersonating_entity}")

            # Send alert to each matching contact
            alerts_sent = []

            for contact in matching_contacts:
                try:
                    # Create alert message
                    message = self._create_alert_message(
                        contact_name=contact["name"],
                        impersonating_entity=impersonating_entity,
                        risk_level=risk_level,
                        scam_indicators=scam_indicators
                    )

                    # Send WhatsApp message
                    await whatsapp_service.send_text_message(
                        to=contact["phone"],
                        message=message
                    )

                    alerts_sent.append({
                        "contact_id": contact["_id"],
                        "contact_name": contact["name"],
                        "contact_phone": contact["phone"],
                        "status": "sent"
                    })

                    logger.info(f"✅ Alert sent to {contact['name']} ({contact['phone']})")

                except Exception as e:
                    logger.error(f"❌ Failed to send alert to {contact['name']}: {str(e)}")
                    alerts_sent.append({
                        "contact_id": contact["_id"],
                        "contact_name": contact["name"],
                        "contact_phone": contact["phone"],
                        "status": "failed",
                        "error": str(e)
                    })

            return {
                "alerts_sent": len([a for a in alerts_sent if a["status"] == "sent"]),
                "alerts_failed": len([a for a in alerts_sent if a["status"] == "failed"]),
                "details": alerts_sent,
                "matching_contacts": len(matching_contacts)
            }

        except Exception as e:
            logger.error(f"Error in impersonation alert service: {str(e)}")
            return {
                "alerts_sent": 0,
                "alerts_failed": 0,
                "error": str(e)
            }

    def _create_alert_message(
        self,
        contact_name: str,
        impersonating_entity: str,
        risk_level: str,
        scam_indicators: list[str]
    ) -> str:
        """Create WhatsApp alert message"""

        risk_emoji = {
            "low": "⚠️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔴"
        }

        risk_text = {
            "low": "BAJO",
            "medium": "MEDIO",
            "high": "ALTO",
            "critical": "CRÍTICO"
        }

        emoji = risk_emoji.get(risk_level, "⚠️")
        risk = risk_text.get(risk_level, risk_level.upper())

        message = f"""{emoji} *ALERTA DE SUPLANTACIÓN DETECTADA*

Hola *{contact_name}*,

🔍 Alguien que te tiene registrado como contacto cercano en *SafeLine* acaba de recibir una llamada sospechosa.

⚠️ *El estafador está pretendiendo ser: {impersonating_entity}*

📊 *Nivel de Riesgo:* {risk}

¿Eres tú quien está llamando a esta persona?

👉 *Responde a este mensaje:*
• ✅ *SÍ* - Confirmo que soy yo
• ❌ *NO* - No soy yo, es una estafa

_Si no eres tú, la persona recibirá una alerta inmediata para que cuelgue la llamada._

---
🛡️ SafeLine - Protección contra estafas
"""

        return message

    async def process_contact_response(
        self,
        contact_phone: str,
        response: str,
        recording_id: Optional[str] = None
    ) -> dict:
        """
        Process response from trusted contact

        Args:
            contact_phone: Phone number of the contact responding
            response: The response text ("SÍ", "NO", etc.)
            recording_id: Optional recording ID to update

        Returns:
            Dictionary with processing result
        """
        try:
            response_lower = response.lower().strip()

            # Determine if legitimate or scam
            is_scam = False

            # Check for negative responses (scam confirmation)
            if any(word in response_lower for word in ["no", "falso", "estafa", "fake"]):
                is_scam = True

            # Check for positive responses (legitimate)
            elif any(word in response_lower for word in ["si", "sí", "yes", "verdad", "cierto"]):
                is_scam = False
            else:
                # Ambiguous response
                return {
                    "status": "ambiguous",
                    "message": "Respuesta no clara. Por favor responde SÍ o NO."
                }

            # TODO: Update the recording/call status based on response
            # This could trigger an immediate alert to the user

            db = get_database()

            # Log the response
            await db.impersonation_responses.insert_one({
                "contact_phone": contact_phone,
                "response": response,
                "is_scam": is_scam,
                "recording_id": recording_id,
                "timestamp": None  # Will be set by MongoDB
            })

            return {
                "status": "processed",
                "is_scam": is_scam,
                "action": "ALERT_USER" if is_scam else "MARK_SAFE"
            }

        except Exception as e:
            logger.error(f"Error processing contact response: {str(e)}")
            return {
                "status": "error",
                "error": str(e)
            }


impersonation_alert_service = ImpersonationAlertService()
