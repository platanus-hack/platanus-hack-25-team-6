from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.whatsapp_service import whatsapp_service
from ..core.config import get_settings

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

class SendMessageRequest(BaseModel):
    to: str
    message: str


class SendAlertRequest(BaseModel):
    to: str
    risk_level: str
    summary: str
    call_id: str | None = None


@router.post("/send")
async def send_message(request: SendMessageRequest):
    """
    Send a WhatsApp text message via Kapso.ai
    """
    try:
        result = await whatsapp_service.send_text_message(
            to=request.to,
            message=request.message
        )
        return {
            "status": "success",
            "message": "WhatsApp message sent successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alert")
async def send_alert(request: SendAlertRequest):
    """
    Send a scam alert notification via WhatsApp
    """
    try:
        result = await whatsapp_service.send_scam_alert(
            to=request.to,
            risk_level=request.risk_level,
            summary=request.summary,
            call_id=request.call_id
        )
        return {
            "status": "success",
            "message": "Alert sent successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config/debug")
async def debug_config():
    """
    Debug endpoint to verify Kapso configuration (does not expose secrets)
    """
    settings = get_settings()
    return {
        "kapso_api_key_configured": bool(settings.kapso_api_key),
        "kapso_api_key_length": len(settings.kapso_api_key) if settings.kapso_api_key else 0,
        "kapso_phone_number_id": settings.kapso_phone_number_id,
        "api_url": f"https://api.kapso.ai/meta/whatsapp/v21.0/{settings.kapso_phone_number_id}/messages"
    }
