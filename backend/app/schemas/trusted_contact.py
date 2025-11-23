from pydantic import BaseModel, Field
from typing import Optional


class TrustedContactCreate(BaseModel):
    """Schema for creating a trusted contact"""
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^569\d{8}$")  # Chilean mobile format
    relationship: Optional[str] = Field(None, max_length=50)


class TrustedContactUpdate(BaseModel):
    """Schema for updating a trusted contact"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^569\d{8}$")
    relationship: Optional[str] = Field(None, max_length=50)


class TrustedContactResponse(BaseModel):
    """Schema for trusted contact response"""
    id: str
    user_id: str
    name: str
    phone: str
    relationship: Optional[str] = None
    created_at: str
    updated_at: str


class BulkTrustedContactCreate(BaseModel):
    """Schema for creating multiple trusted contacts at once"""
    contacts: list[TrustedContactCreate] = Field(..., min_items=1, max_items=50)
