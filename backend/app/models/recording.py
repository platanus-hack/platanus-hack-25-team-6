from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class ScamRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RecordingStatus(str, Enum):
    PROCESSING = "processing"
    TRANSCRIBED = "transcribed"
    ANALYZED = "analyzed"
    FAILED = "failed"


class Recording(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    duration: Optional[float] = None
    status: RecordingStatus = RecordingStatus.PROCESSING
    transcript: Optional[str] = None
    scam_analysis: Optional[dict] = None
    scam_risk_level: Optional[ScamRiskLevel] = None
    scam_confidence: Optional[float] = None
    scam_indicators: Optional[list[str]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "user_id": "user123",
                "file_path": "recordings/2024-01-01/recording.webm",
                "status": "processing",
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
