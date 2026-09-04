from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, JSON

from app.core.database import Base


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(String(64), unique=True, nullable=False, index=True)
    analysis_id = Column(String(64), nullable=True, index=True)

    event_type = Column(String(50), nullable=False)

    prediction = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)

    risk_level = Column(String(30), nullable=False)
    risk_score = Column(Float, nullable=False)

    action = Column(String(30), nullable=False)

    file_hash = Column(String(64), nullable=True)

    message = Column(Text, nullable=True)
    event_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)