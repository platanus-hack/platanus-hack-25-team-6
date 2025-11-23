from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TrustedContact(BaseModel):
    """Model for user's trusted contacts (cercanos)"""
    id: Optional[str] = Field(None, alias="_id")
    user_id: str  # The user who owns this contact
    name: str  # Contact's name
    phone: str  # Contact's phone number (format: 569XXXXXXXX)
    relationship: Optional[str] = None  # e.g., "Madre", "Hijo", "Banco", etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "name": "María González",
                "phone": "56912345678",
                "relationship": "Madre"
            }
        }
