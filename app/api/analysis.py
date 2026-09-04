from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.services.audio_detector import (
    MODEL_VERSION,
    SUPPORTED_EXTENSIONS,
    analyze_audio,
)

from app.services.security_engine import (
    evaluate_security_action,
)

from app.services.incident_logger import (
    create_incident,
)


router = APIRouter()


MAX_FILE_SIZE = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = SUPPORTED_EXTENSIONS


# ---------------------------------------------------------
# Development memory storage
# ---------------------------------------------------------
#
# This is intentionally temporary.
#
# Later:
#
# PostgreSQL
#     +
# SQLAlchemy
#     +
# persistent incident storage
#
# will replace these lists.
# ---------------------------------------------------------

analysis_history = []

incident_history = []


@router.get("/analysis/status")
async def analysis_status():
    return {
        "status": "ready",
        "service": "VoiceGuard Analysis Engine",
        "model": MODEL_VERSION,
        "version": "2.0.0",
        "pipeline": {
            "audio_validation": True,
            "preprocessing": True,
            "feature_extraction": True,
            "baseline_detection": True,
        },
    }


@router.get("/analyses")
async def get_analyses(
    limit: int = 100,
):
    limit = max(
        1,
        min(limit, 100),
    )

    records = analysis_history[-limit:]

    records = list(
        reversed(records)
    )

    return {
        "analyses": records,
        "total": len(
            analysis_history
        ),
        "limit": limit,
    }


@router.post("/analysis/analyze")
async def analyze_audio_endpoint(
    file: UploadFile = File(...),
):
    # ---------------------------------------------------------
    # 1. Filename validation
    # ---------------------------------------------------------

    filename = (
        file.filename or ""
    ).strip()

    if not filename:
        raise HTTPException(
            status_code=400,
            detail=(
                "No filename provided."
            ),
        )

    # Prevent path-like filenames from becoming trusted
    # filesystem paths.
    filename = Path(
        filename
    ).name

    extension = Path(
        filename
    ).suffix.lower()

    # ---------------------------------------------------------
    # 2. Extension validation
    # ---------------------------------------------------------

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio format: "
                f"{extension or 'unknown'}. "
                "Supported formats: WAV, MP3, "
                "M4A, OGG and WEBM."
            ),
        )

    # ---------------------------------------------------------
    # 3. Read uploaded bytes
    # ---------------------------------------------------------

    try:
        contents = await file.read()

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to read the uploaded "
                "audio file."
            ),
        ) from exc

    # ---------------------------------------------------------
    # 4. Empty-file validation
    # ---------------------------------------------------------

    if not contents:
        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded audio file is empty."
            ),
        )

    # ---------------------------------------------------------
    # 5. File-size validation
    # ---------------------------------------------------------

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=(
                "Audio file exceeds the "
                "50 MB limit."
            ),
        )

    # ---------------------------------------------------------
    # 6. Analysis pipeline
    # ---------------------------------------------------------

    try:

        # Audio validation
        # +
        # preprocessing
        # +
        # feature extraction
        # +
        # development baseline detection

        result = analyze_audio(
            contents,
            filename,
        )

        # -----------------------------------------------------
        # 7. Security decision engine
        # -----------------------------------------------------

        decision = (
            evaluate_security_action(
                label=result["label"],
                risk_level=result[
                    "risk_level"
                ],
                confidence=result[
                    "confidence"
                ],
                anomaly_score=result[
                    "anomaly_score"
                ],
            )
        )

        result[
            "security_decision"
        ] = decision

        # -----------------------------------------------------
        # 8. Incident/audit logging
        # -----------------------------------------------------

        incident = create_incident(
            audio_bytes=contents,
            filename=filename,
            analysis_result=result,
        )

        result[
            "incident"
        ] = incident

        # -----------------------------------------------------
        # 9. Timestamp
        # -----------------------------------------------------

        result[
            "created_at"
        ] = datetime.now(
            timezone.utc
        ).isoformat()

        # -----------------------------------------------------
        # 10. Development storage
        # -----------------------------------------------------

        analysis_history.append(
            result
        )

        incident_history.append(
            incident
        )

        return result

    except ValueError as exc:
        # Expected audio validation/processing error.
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        # Unexpected backend processing error.
        raise HTTPException(
            status_code=500,
            detail=(
                "Unexpected audio processing "
                "error."
            ),
        ) from exc


@router.get("/incidents")
async def get_incidents(
    limit: int = 100,
):
    limit = max(
        1,
        min(limit, 100),
    )

    records = incident_history[-limit:]

    records = list(
        reversed(records)
    )

    return {
        "incidents": records,
        "total": len(
            incident_history
        ),
        "limit": limit,
    }


@router.get("/analysis/model")
async def model_status():
    return {
        "model_version": MODEL_VERSION,
        "status": "development",
        "type": "acoustic-feature-baseline",
        "production_ready": False,
        "pipeline": {
            "audio_validation": True,
            "preprocessing": True,
            "feature_extraction": True,
            "trained_ml_model": False,
        },
        "message": (
            "VoiceGuard currently uses a "
            "development-stage acoustic feature "
            "baseline. A trained anti-spoofing "
            "model is required for production "
            "deployment."
        ),
    }