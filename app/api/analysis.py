from __future__ import annotations

import hashlib
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.inference import inference_service
from app.models.analysis import AnalysisResult
from app.models.security import SecurityEvent
from app.services import incident_logger
from app.services.audio_detector import (
    MODEL_VERSION as BASELINE_MODEL_VERSION,
    SUPPORTED_EXTENSIONS,
    analyze_audio,
)
from app.services.security_engine import evaluate_risk, risk_score


# main.py already adds /api
router = APIRouter(
    tags=["analysis"],
)

MAX_FILE_SIZE = 50 * 1024 * 1024


# ============================================================
# JSON SAFETY
# ============================================================

def _json_safe(value: Any) -> Any:
    """
    Convert common Python/NumPy values into JSON-safe values.
    """

    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, dict):
        return {
            str(key): _json_safe(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]

    # NumPy scalar support without importing NumPy here.
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    # NumPy array support.
    if hasattr(value, "tolist"):
        try:
            return value.tolist()
        except Exception:
            pass

    return str(value)


# ============================================================
# ANALYSIS STATUS
# ============================================================

@router.get("/analysis/status")
def analysis_status() -> dict[str, Any]:

    cnn_status = inference_service.status()

    return {
        "status": "operational",

        "baseline_model": {
            "version": BASELINE_MODEL_VERSION,
            "available": True,
            "production_ready": False,
        },

        "cnn_model": cnn_status,

        "production_ready": False,

        "active_model": (
            "cnn"
            if cnn_status.get("available", False)
            else "baseline"
        ),

        "message": (
            "VoiceGuard uses the trained CNN when a valid "
            "checkpoint is available. Otherwise it uses the "
            "development-stage baseline detector."
        ),
    }


# ============================================================
# MODEL STATUS
# ============================================================

@router.get("/analysis/model")
def model_status() -> dict[str, Any]:

    cnn_status = inference_service.status()

    return {
        "baseline": {
            "version": BASELINE_MODEL_VERSION,
            "available": True,
            "production_ready": False,
        },

        "cnn": cnn_status,

        "active_model": (
            "cnn"
            if cnn_status.get("available", False)
            else "baseline"
        ),

        "production_ready": False,

        "pipeline": {
            "audio_validation": True,
            "audio_preprocessing": True,
            "feature_extraction": True,
            "trained_ml_model": cnn_status.get(
                "available",
                False,
            ),
            "risk_assessment": True,
            "security_decision": True,
            "incident_logging": True,
            "database_storage": True,
        },

        "development_notice": (
            "The CNN is not production-ready until it has "
            "been trained and evaluated on an appropriate "
            "voice deepfake dataset."
        ),
    }


# ============================================================
# AUDIO ANALYSIS
# ============================================================

@router.post("/analysis/analyze")
async def analyze_uploaded_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:

    # --------------------------------------------------------
    # 1. Validate filename
    # --------------------------------------------------------

    filename = Path(
        file.filename or "audio.wav"
    ).name

    extension = Path(filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported audio format '{extension}'. "
                f"Supported formats: "
                f"{sorted(SUPPORTED_EXTENSIONS)}"
            ),
        )

    # --------------------------------------------------------
    # 2. Read uploaded file
    # --------------------------------------------------------

    try:
        audio_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to read uploaded audio file: {exc}",
        )

    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded audio file is empty.",
        )

    # --------------------------------------------------------
    # 3. File size validation
    # --------------------------------------------------------

    if len(audio_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Audio file exceeds the 50 MB limit.",
        )

    # --------------------------------------------------------
    # 4. Generate IDs and hash
    # --------------------------------------------------------

    analysis_id = (
        f"AN-{uuid.uuid4().hex[:10].upper()}"
    )

    file_hash = hashlib.sha256(audio_bytes).hexdigest()

    # --------------------------------------------------------
    # 5. Run baseline detector
    # --------------------------------------------------------

    try:
        baseline_result = analyze_audio(
            audio_bytes=audio_bytes,
            filename=filename,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Audio analysis failed: {exc}",
        )

    # --------------------------------------------------------
    # 6. Attempt CNN inference
    # --------------------------------------------------------

    cnn_result: dict[str, Any] | None = None

    cnn_status = inference_service.status()

    if cnn_status.get("available", False):

        try:
            cnn_result = inference_service.predict(
                audio_bytes=audio_bytes,
                filename=filename,
            )
        except Exception:
            # Safe fallback to baseline.
            cnn_result = None

    # --------------------------------------------------------
    # 7. Select active model result
    # --------------------------------------------------------

    if cnn_result is not None:

        model_source = "cnn"

        prediction = str(
            cnn_result.get(
                "prediction",
                "real",
            )
        ).lower()

        real_probability = float(
            cnn_result.get(
                "real_probability",
                0.0,
            )
        )

        synthetic_probability = float(
            cnn_result.get(
                "synthetic_probability",
                0.0,
            )
        )

        confidence = float(
            cnn_result.get(
                "confidence",
                0.0,
            )
        )

        model_version = str(
            cnn_result.get(
                "model_version",
                "voiceguard-cnn-v1",
            )
        )

    else:

        model_source = "baseline"

        prediction = str(
            baseline_result.get(
                "classification",
                "real",
            )
        ).lower()

        anomaly_score = float(
            baseline_result.get(
                "anomaly_score",
                0.0,
            )
        )

        anomaly_score = max(
            0.0,
            min(
                1.0,
                anomaly_score,
            ),
        )

        synthetic_probability = anomaly_score
        real_probability = 1.0 - anomaly_score

        if prediction == "synthetic":
            confidence = synthetic_probability
        else:
            confidence = real_probability

        model_version = BASELINE_MODEL_VERSION

    # --------------------------------------------------------
    # 8. Risk assessment
    # --------------------------------------------------------

    try:
        risk_result = evaluate_risk(
            prediction=prediction,
            confidence=confidence,
        )

    except TypeError:
        risk_result = evaluate_risk(
            prediction,
            confidence,
        )

    except Exception:
        risk_result = {
            "risk_level": "medium",
            "action": "verify",
            "reason": (
                "Risk engine could not complete normally."
            ),
        }

    if not isinstance(risk_result, dict):
        risk_result = {
            "risk_level": "medium",
            "action": "verify",
            "reason": "Invalid risk engine response.",
        }

    risk_level = str(
        risk_result.get(
            "risk_level",
            "medium",
        )
    ).lower()

    action = str(
        risk_result.get(
            "action",
            "verify",
        )
    )

    # --------------------------------------------------------
    # 9. Calculate normalized risk score
    # --------------------------------------------------------

    try:
        normalized_risk_score = float(
            risk_score(
                prediction=prediction,
                confidence=confidence,
            )
        )
    except TypeError:
        normalized_risk_score = float(
            risk_score(
                prediction,
                confidence,
            )
        )
    except Exception:
        normalized_risk_score = (
            synthetic_probability
            if prediction == "synthetic"
            else 1.0 - real_probability
        )

    normalized_risk_score = max(
        0.0,
        min(
            1.0,
            normalized_risk_score,
        ),
    )

    # --------------------------------------------------------
    # 10. Extract duration
    # --------------------------------------------------------

    duration_seconds = None

    try:
        duration_seconds = float(
            baseline_result.get(
                "features",
                {}
            ).get(
                "duration_seconds"
            )
        )
    except (TypeError, ValueError, AttributeError):
        duration_seconds = None

    # --------------------------------------------------------
    # 11. Create incident using existing logger
    # --------------------------------------------------------

    incident = None

    incident_analysis = {
        "id": analysis_id,
        "risk_level": risk_level,
        "action": action,
        "confidence": confidence,
        "anomaly_score": synthetic_probability,
        "prediction": prediction,
    }

    try:
        incident = incident_logger.create_incident(
            audio_bytes=audio_bytes,
            filename=filename,
            analysis_result=incident_analysis,
        )
    except Exception:
        incident = None

    # --------------------------------------------------------
    # 12. Build database analysis record
    # --------------------------------------------------------

    analysis_db = AnalysisResult(
        analysis_id=analysis_id,
        filename=filename,
        file_hash=file_hash,
        model_version=model_version,
        prediction=prediction,
        confidence=confidence,
        real_probability=real_probability,
        synthetic_probability=synthetic_probability,
        duration_seconds=duration_seconds,
        risk_level=risk_level,
        risk_score=normalized_risk_score,
        security_action=action,
        features=_json_safe(
            baseline_result.get(
                "features",
                {},
            )
        ),
        result_data=_json_safe({
            "model_source": model_source,
            "baseline": baseline_result,
            "cnn": cnn_result,
            "risk": risk_result,
        }),
    )

    # --------------------------------------------------------
    # 13. Build security event
    # --------------------------------------------------------

    event_id = (
        f"EV-{uuid.uuid4().hex[:10].upper()}"
    )

    security_event = SecurityEvent(
        event_id=event_id,
        analysis_id=analysis_id,
        event_type="voice_analysis",
        prediction=prediction,
        confidence=confidence,
        risk_level=risk_level,
        risk_score=normalized_risk_score,
        action=action,
        file_hash=file_hash,
        message=(
            f"VoiceGuard analysis completed using "
            f"{model_source} model."
        ),
        event_data=_json_safe({
            "filename": filename,
            "model_version": model_version,
            "model_source": model_source,
            "incident": incident,
        }),
    )

    # --------------------------------------------------------
    # 14. Persist everything
    # --------------------------------------------------------

    database_saved = False

    try:
        db.add(analysis_db)
        db.add(security_event)
        db.commit()

        database_saved = True

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Analysis completed but database persistence "
                f"failed: {exc}"
            ),
        )

    # --------------------------------------------------------
    # 15. Build response
    # --------------------------------------------------------

    analysis = {
        "id": analysis_id,
        "filename": filename,

        "prediction": prediction,

        "confidence": round(
            confidence,
            4,
        ),

        "real_probability": round(
            real_probability,
            4,
        ),

        "synthetic_probability": round(
            synthetic_probability,
            4,
        ),

        "model_version": model_version,

        "model_source": model_source,

        "risk_level": risk_level,

        "risk_score": round(
            normalized_risk_score,
            4,
        ),

        "action": action,

        "created_at": (
            analysis_db.created_at.isoformat()
            if analysis_db.created_at
            else None
        ),
    }

    return {
        "success": True,

        "analysis": analysis,

        "risk": risk_result,

        "security": {
            "model_source": model_source,
            "action": action,
            "risk_level": risk_level,
            "incident_created": incident is not None,
            "database_saved": database_saved,
            "event_id": event_id,
        },

        "baseline": {
            "classification": baseline_result.get(
                "classification"
            ),

            "anomaly_score": baseline_result.get(
                "anomaly_score"
            ),

            "features": baseline_result.get(
                "features",
                {},
            ),
        },

        "cnn": {
            "available": cnn_status.get(
                "available",
                False,
            ),

            "used": cnn_result is not None,

            "prediction": (
                cnn_result.get("prediction")
                if cnn_result
                else None
            ),

            "confidence": (
                cnn_result.get("confidence")
                if cnn_result
                else None
            ),

            "model_version": (
                cnn_result.get("model_version")
                if cnn_result
                else None
            ),
        },

        "pipeline": {
            "audio_validation": True,
            "audio_preprocessing": True,
            "feature_extraction": True,
            "baseline_detection": True,
            "cnn_inference": (
                cnn_result is not None
            ),
            "risk_assessment": True,
            "security_decision": True,
            "incident_logging": (
                incident is not None
            ),
            "database_storage": database_saved,
        },

        "incident": incident,

        "development_notice": (
            "VoiceGuard is currently a development-stage "
            "system. The CNN is only used when a trained "
            "checkpoint is available. Until the model is "
            "trained and properly evaluated on suitable "
            "voice deepfake datasets, results must not be "
            "treated as production-grade voice-clone detection."
        ),
    }


# ============================================================
# RECENT ANALYSES
# ============================================================

@router.get("/analyses")
def get_analyses(
    db: Session = Depends(get_db),
) -> dict[str, Any]:

    records = (
        db.query(AnalysisResult)
        .order_by(AnalysisResult.created_at.desc())
        .limit(100)
        .all()
    )

    analyses = []

    for record in records:
        analyses.append({
            "id": record.analysis_id,
            "filename": record.filename,
            "prediction": record.prediction,
            "confidence": record.confidence,
            "real_probability": record.real_probability,
            "synthetic_probability": record.synthetic_probability,
            "model_version": record.model_version,
            "risk_level": record.risk_level,
            "risk_score": record.risk_score,
            "action": record.security_action,
            "duration_seconds": record.duration_seconds,
            "created_at": (
                record.created_at.isoformat()
                if record.created_at
                else None
            ),
        })

    return {
        "success": True,
        "analyses": analyses,
        "count": len(analyses),
        "storage": "postgresql",
    }


# ============================================================
# INCIDENTS
# ============================================================

@router.get("/incidents")
def get_incidents(
    db: Session = Depends(get_db),
) -> dict[str, Any]:

    records = (
        db.query(SecurityEvent)
        .order_by(SecurityEvent.created_at.desc())
        .limit(100)
        .all()
    )

    incidents = []

    for record in records:
        incidents.append({
            "id": record.event_id,
            "analysis_id": record.analysis_id,
            "event_type": record.event_type,
            "prediction": record.prediction,
            "confidence": record.confidence,
            "risk_level": record.risk_level,
            "risk_score": record.risk_score,
            "action": record.action,
            "file_hash": record.file_hash,
            "message": record.message,
            "created_at": (
                record.created_at.isoformat()
                if record.created_at
                else None
            ),
        })

    return {
        "success": True,
        "incidents": incidents,
        "count": len(incidents),
        "storage": "postgresql",
    }