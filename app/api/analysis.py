from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.audio_detector import analyze_audio
from app.services.security_engine import evaluate_security_action
from app.services.incident_logger import create_incident

router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024

# Temporary development storage.
# Later this can be replaced by PostgreSQL/SQLAlchemy.
analysis_history = []
incident_history = []


@router.get("/analysis/status")
async def analysis_status():
    return {
        "status": "ready",
        "service": "VoiceGuard Analysis Engine",
        "model": "baseline-audio-v1",
        "version": "1.0.0",
    }


@router.get("/analyses")
async def get_analyses(limit: int = 100):
    limit = max(1, min(limit, 100))

    records = analysis_history[-limit:]
    records = list(reversed(records))

    return {
        "analyses": records,
        "total": len(analysis_history),
        "limit": limit,
    }


@router.post("/analysis/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    filename = file.filename or ""

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided.",
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio format: {extension}. "
                "Use WAV, MP3, M4A, or OGG."
            ),
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty.",
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 50 MB limit.",
        )

    try:
        # 1. Analyze the audio
        result = analyze_audio(contents, filename)

        # 2. Evaluate security response
        decision = evaluate_security_action(
            label=result["label"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            anomaly_score=result["anomaly_score"],
        )

        result["security_decision"] = decision

        # 3. Create security incident/audit record
        incident = create_incident(
            audio_bytes=contents,
            filename=filename,
            analysis_result=result,
        )

        result["incident"] = incident

        # 4. Add timestamp
        result["created_at"] = datetime.now(timezone.utc).isoformat()

        # 5. Store records in development memory
        analysis_history.append(result)
        incident_history.append(incident)

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Audio processing failed: {str(exc)}",
        )


@router.get("/incidents")
async def get_incidents(limit: int = 100):
    limit = max(1, min(limit, 100))

    records = incident_history[-limit:]
    records = list(reversed(records))

    return {
        "incidents": records,
        "total": len(incident_history),
        "limit": limit,
    }


@router.get("/analysis/model")
async def model_status():
    return {
        "model_version": "baseline-audio-v1",
        "status": "development",
        "type": "acoustic-feature-baseline",
        "production_ready": False,
        "message": (
            "Prototype acoustic feature detector. "
            "A trained anti-spoofing model is required "
            "for production deployment."
        ),
    }