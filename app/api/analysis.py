from fastapi import APIRouter, File, UploadFile, HTTPException
from datetime import datetime
import time
import uuid

from app.schemas.analysis import AnalysisResponse

router = APIRouter()


ALLOWED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_audio(file: UploadFile = File(...)):
    """
    Phase 1/2 analysis endpoint.

    Current implementation validates the uploaded audio and returns
    a clearly marked placeholder result. The real ML detector will
    replace this logic in the ML phase.
    """

    start_time = time.perf_counter()

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    content_type = (file.content_type or "").lower()

    # Allow common audio formats. Some browsers may send an empty
    # or generic MIME type, so extension checking is also performed.
    allowed_extensions = (".wav", ".mp3", ".m4a")

    if (
        content_type not in ALLOWED_AUDIO_TYPES
        and not file.filename.lower().endswith(allowed_extensions)
    ):
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format. Use WAV, MP3, or M4A."
        )

    audio_data = await file.read()

    if not audio_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty."
        )

    if len(audio_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 25 MB size limit."
        )

    processing_time = time.perf_counter() - start_time

    # IMPORTANT:
    # This is NOT an ML prediction.
    # It is only a temporary development response until the
    # actual voice-clone detector is connected.
    return AnalysisResponse(
        id=uuid.uuid4().int % 2147483647,
        filename=file.filename,
        label="pending",
        confidence=0.0,
        risk_level="UNKNOWN",
        action="REVIEW",
        processing_time=round(processing_time, 4),
        model_version="not-connected"
    )