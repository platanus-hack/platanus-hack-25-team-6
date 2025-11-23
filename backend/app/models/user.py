"""
User Model

Represents a registered user in the SafeLine system.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    """User model for registered users"""
    id: str = Field(alias="_id")
    phone: str
    created_at: datetime
    updated_at: datetime
    onboarding_completed: bool = False

    class Config:
        populate_by_name = True


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    phone: str


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    onboarding_completed: Optional[bool] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
