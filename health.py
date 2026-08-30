from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.analysis import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except:
        db_status = "error"
    
    return HealthResponse(
        status="operational",
        database=db_status,
        model_status="baseline-cnn-v1",
        version="1.0.0"
    )

@router.get("/system/health")
async def system_health():
    return {
        "status": "ok",
        "timestamp": "2026-08-31T00:00:00Z"
    }
