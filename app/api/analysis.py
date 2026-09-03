from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
from datetime import datetime, timezone

from app.services.audio_detector import analyze_audio


router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg"}
MAX_FILE_SIZE = 50 * 1024 * 1024

# Development storage.
# This will later be replaced by PostgreSQL/SQLAlchemy.
analysis_history = []


@router.get("/analysis/status")
async def analysis_status():
    return {
        "status": "ready",
        "service": "VoiceGuard Analysis Engine",
        "model": "baseline-audio-v1",
        "version": "1.0.0"
    }


@router.get("/analyses")
async def get_analyses(limit: int = 100):
    limit = max(1, min(limit, 100))

    records = analysis_history[-limit:]
    records = list(reversed(records))

    return {
        "analyses": records,
        "total": len(analysis_history),
        "limit": limit
    }


@router.post("/analysis/analyze")
async def analyze_audio_endpoint(file: UploadFile = File(...)):
    filename = file.filename or ""

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio format: {extension}. "
                "Use WAV, MP3, M4A, or OGG."
            )
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty."
        )

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 50 MB limit."
        )

    try:
        result = analyze_audio(contents, filename)

        result["created_at"] = datetime.now(
            timezone.utc
        ).isoformat()

        analysis_history.append(result)

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Audio processing failed: {str(exc)}"
        )


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
        )
    }