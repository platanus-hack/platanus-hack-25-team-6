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
    caller_number: Optional[str]
    called_number: Optional[str]
    created_at: datetime
    updated_at: datetime


class ScamMetadata(BaseModel):
    """Metadata about the scam attempt"""
    impersonating: Optional[str] = None  # Entity being impersonated (e.g., "Banco de Chile", "SAT")
    scam_type: Optional[str] = None  # Type of scam (e.g., "phishing bancario", "tech support")
    urgency_level: Optional[str] = None  # Urgency tactics used (e.g., "alta", "media", "baja")
    information_requested: list[str] = []  # What info they're trying to get
    payment_methods: list[str] = []  # Payment methods mentioned


class ScamAnalysis(BaseModel):
    is_scam: bool
    risk_level: ScamRiskLevel
    confidence: float
    indicators: list[str]
    reasoning: str
    recommended_actions: list[str]
    meta: Optional[ScamMetadata] = None


class TranscriptionResponse(BaseModel):
    recording_id: str
    transcript: str
    duration: Optional[float]
