import httpx
from ..core.config import get_settings


class WhatsAppService:
    """Service for sending WhatsApp messages via Kapso.ai"""

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.kapso_api_key
        self.phone_number_id = settings.kapso_phone_number_id
        self.base_url = "https://api.kapso.ai/meta/whatsapp/v21.0"

    async def send_text_message(self, to: str, message: str) -> dict:
        """
        Send a text message via WhatsApp

        Args:
            to: Phone number in international format (e.g., "56912345678")
            message: Text message to send

        Returns:
            API response from Kapso
        """
        url = f"{self.base_url}/{self.phone_number_id}/messages"

        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()

    async def send_scam_alert(self, to: str, risk_level: str, summary: str, call_id: str = None) -> dict:
        """
        Send a scam alert notification via WhatsApp

        Args:
            to: Phone number to notify
            risk_level: Risk level (low, medium, high, critical)
            summary: Summary of the detected scam
            call_id: Optional call ID for reference

        Returns:
            API response from Kapso
        """
        emoji_map = {
            "low": "🟢",
            "medium": "🟡",
            "high": "🟠",
            "critical": "🔴"
        }

        emoji = emoji_map.get(risk_level.lower(), "⚪")

        message = f"{emoji} *SafeLine Alert*\n\n"
        message += f"*Risk Level:* {risk_level.upper()}\n\n"
        message += f"*Summary:*\n{summary}\n"

        if call_id:
            message += f"\n_Call ID: {call_id}_"

        return await self.send_text_message(to, message)


whatsapp_service = WhatsAppService()
