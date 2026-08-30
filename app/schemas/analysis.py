from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime


class AnalysisResponse(BaseModel):
    id: Optional[int] = None
    filename: str
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    risk_level: str
    action: str
    processing_time: Optional[float] = None
    model_version: str = "baseline-placeholder"