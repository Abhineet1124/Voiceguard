from sqlalchemy import Column, String, Float, Integer, DateTime, Text
from datetime import datetime
from app.core.database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    filename = Column(String)
    label = Column(String)  # real, synthetic, uncertain
    confidence = Column(Float)
    risk_level = Column(String)  # low, medium, high, critical
    action = Column(String)  # allow, verify, alert, block
    processing_time = Column(Float)
    model_version = Column(String)
    event_hash = Column(String, unique=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "filename": self.filename,
            "label": self.label,
            "confidence": self.confidence,
            "risk_level": self.risk_level,
            "action": self.action,
            "processing_time": self.processing_time,
            "model_version": self.model_version,
            "event_hash": self.event_hash,
        }
