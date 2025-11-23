import random
import string
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.whatsapp_service import whatsapp_service
from ..core.database import get_database
from ..utils.auth import create_access_token, get_current_user
from fastapi import Depends

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_EXPIRY_MINUTES = 5

class SendOTPRequest(BaseModel):
    phone: str


class VerifyOTPRequest(BaseModel):
    phone: str
    code: str


def generate_otp() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=6))


@router.post("/send-otp")
async def send_otp(request: SendOTPRequest):
    """
    Generate and send OTP code via WhatsApp
    """
    try:
        phone = request.phone
        db = get_database()

        # Generate OTP
        otp_code = generate_otp()

        # Store OTP in MongoDB (upsert to replace any existing OTP for this phone)
        await db.otp_codes.update_one(
            {"phone": phone},
            {
                "$set": {
                    "code": otp_code,
                    "expires_at": datetime.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
                    "attempts": 0,
                    "created_at": datetime.now()
                }
            },
            upsert=True
        )

        # Send OTP via WhatsApp
        message = f"🔐 *SafeLine*\n\nTu código de verificación es: *{otp_code}*\n\nEste código expira en {OTP_EXPIRY_MINUTES} minutos.\n\n_No compartas este código con nadie._"

        await whatsapp_service.send_text_message(to=phone, message=message)

        return {
            "status": "success",
            "message": "OTP sent successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP code
    """
    try:
        phone = request.phone
        code = request.code
        db = get_database()

        # Check if OTP exists
        otp_data = await db.otp_codes.find_one({"phone": phone})

        if not otp_data:
            raise HTTPException(status_code=400, detail="No OTP found for this phone number")

        # Check expiry
        if datetime.now() > otp_data["expires_at"]:
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(status_code=400, detail="OTP has expired")

        # Check attempts (max 3)
        if otp_data["attempts"] >= 3:
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")

        # Verify code
        # Development bypass: accept "000000" or "123456" in development mode
        from ..core.config import get_settings
        settings = get_settings()
        is_dev_code = (settings.environment == "development" and code in ["000000", "123456"])

        if code != otp_data["code"] and not is_dev_code:
            await db.otp_codes.update_one(
                {"phone": phone},
                {"$inc": {"attempts": 1}}
            )
            raise HTTPException(status_code=400, detail="Invalid OTP code")

        # Success - clean up
        await db.otp_codes.delete_one({"phone": phone})

        # Check if user exists, create if not
        user = await db.users.find_one({"phone": phone})

        if not user:
            # Create new user
            user_id = str(uuid.uuid4())
            user_data = {
                "_id": user_id,
                "phone": phone,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "onboarding_completed": False
            }
            await db.users.insert_one(user_data)
        else:
            user_id = user["_id"]

        # Generate JWT token
        access_token = create_access_token(
            data={"user_id": user_id, "phone": phone}
        )

        return {
            "status": "success",
            "message": "OTP verified successfully",
            "authenticated": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_id,
            "phone": phone,
            "onboarding_completed": user.get("onboarding_completed", False) if user else False
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-onboarding")
async def complete_onboarding(
    current_user: dict = Depends(get_current_user)
):
    """
    Mark user's onboarding as completed
    """
    try:
        db = get_database()

        await db.users.update_one(
            {"_id": current_user["user_id"]},
            {
                "$set": {
                    "onboarding_completed": True,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "status": "success",
            "message": "Onboarding completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
