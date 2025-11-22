from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from ..models.recording import ScamRiskLevel, RecordingStatus


class RecordingCreate(BaseModel):
    user_id: Optional[str] = None


class RecordingResponse(BaseModel):
    id: str
    user_id: Optional[str]
    file_url: Optional[str]
    duration: Optional[float]
    status: RecordingStatus
    transcript: Optional[str]
    scam_risk_level: Optional[ScamRiskLevel]
    scam_confidence: Optional[float]
    scam_indicators: Optional[list[str]]
    created_at: datetime
    updated_at: datetime


class ScamAnalysis(BaseModel):
    is_scam: bool
    risk_level: ScamRiskLevel
    confidence: float
    indicators: list[str]
    reasoning: str
    recommended_actions: list[str]


class TranscriptionResponse(BaseModel):
    recording_id: str
    transcript: str
    duration: Optional[float]
