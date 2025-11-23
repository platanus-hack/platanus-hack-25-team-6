from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.whatsapp_service import whatsapp_service

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
