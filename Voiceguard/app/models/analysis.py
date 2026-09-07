from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, JSON

from app.core.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(64), unique=True, nullable=False, index=True)

    filename = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)

    model_version = Column(String(100), nullable=False)

    prediction = Column(String(50), nullable=False)
    confidence = Column(Float, nullable=False)

    real_probability = Column(Float, nullable=True)
    synthetic_probability = Column(Float, nullable=True)

    duration_seconds = Column(Float, nullable=True)

    risk_level = Column(String(30), nullable=False)
    risk_score = Column(Float, nullable=False)

    security_action = Column(String(30), nullable=False)

    features = Column(JSON, nullable=True)
    result_data = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)