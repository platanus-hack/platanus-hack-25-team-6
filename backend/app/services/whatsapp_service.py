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
            try:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                # Log detailed error information
                error_detail = {
                    "status_code": e.response.status_code,
                    "response_body": e.response.text,
                    "url": url,
                    "phone_number_id": self.phone_number_id,
                    "api_key_present": bool(self.api_key),
                    "api_key_length": len(self.api_key) if self.api_key else 0
                }
                print(f"Kapso API Error: {error_detail}")
                raise Exception(f"Kapso API error: {e.response.status_code} - {e.response.text}")

    async def send_scam_alert(self, to: str, risk_level: str, summary: str, caller_number: str = None, duration: int = None) -> dict:
        """
        Send a scam alert notification via WhatsApp

        Args:
            to: Phone number to notify
            risk_level: Risk level (low, medium, high, critical)
            summary: Summary of the detected scam
            caller_number: Phone number that initiated the call
            duration: Call duration in seconds

        Returns:
            API response from Kapso
        """
        # Use alert emoji based on risk level
        emoji = "🚨" if risk_level.lower() in ["high", "critical"] else "⚠️"

        # Map risk levels to Spanish
        risk_level_spanish = {
            "low": "Bajo",
            "medium": "Medio",
            "high": "Alto",
            "critical": "Crítico"
        }
        risk_text = risk_level_spanish.get(risk_level.lower(), risk_level.upper())

        message = f"{emoji} *SafeLine - Alerta de Estafa*\n\n"
        message += f"*Nivel de Riesgo:* {risk_text}\n\n"

        if caller_number:
            message += f"*Número que llama:* {caller_number}\n\n"

        if duration is not None:
            minutes = int(duration // 60)
            seconds = int(duration % 60)
            message += f"*Duración:* {minutes}m {seconds}s\n"

        message += f"\n*Análisis:*\n{summary}"

        return await self.send_text_message(to, message)


whatsapp_service = WhatsAppService()
