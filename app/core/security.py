from sqlalchemy import Column, String, DateTime, Text
from datetime import datetime
from app.core.database import Base

class SecurityEvent(Base):
    __tablename__ = "security_events"
    
    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(String, index=True)
    event_type = Column(String)  # analysis, verification, block
    event_payload_hash = Column(String)
    previous_hash = Column(String, nullable=True)
    event_hash = Column(String, unique=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            "id": self.id,
            "analysis_id": self.analysis_id,
            "event_type": self.event_type,
            "event_hash": self.event_hash,
            "timestamp": self.timestamp.isoformat(),
        }
