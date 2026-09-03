from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path

router = APIRouter()


@router.get("/analysis/status")
async def analysis_status():
    return {
        "status": "ready",
        "service": "VoiceGuard Analysis Engine",
        "version": "1.0.0"
    }


@router.get("/analyses")
async def get_analyses(limit: int = 100):
    return {
        "analyses": [],
        "total": 0,
        "limit": limit
    }


@router.post("/analysis/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    allowed_extensions = {".wav", ".mp3", ".m4a", ".ogg"}

    extension = Path(file.filename or "").suffix.lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {extension}"
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty"
        )

    return {
        "filename": file.filename,
        "status": "analyzed",
        "prediction": "PENDING_MODEL",
        "confidence": 0.0,
        "message": "Audio received successfully. AI detection model integration is next."
    }