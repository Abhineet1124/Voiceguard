from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any


def create_incident(
    audio_bytes: bytes,
    filename: str,
    analysis_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Create a security incident record.

    Development-stage in-memory incident logging.
    No database persistence is performed here yet.
    """

    if not audio_bytes:
        raise ValueError("Audio data is empty.")

    audio_hash = hashlib.sha256(audio_bytes).hexdigest()

    risk_level = str(
        analysis_result.get("risk_level", "low")
    ).lower()

    action = analysis_result.get(
        "action",
        "allow",
    )

    if risk_level in {"high", "critical"}:
        incident_type = "VOICE_CLONING_RISK"
    elif risk_level == "medium":
        incident_type = "VOICE_VERIFICATION_REQUIRED"
    else:
        incident_type = "ANALYSIS_RECORDED"

    return {
        "incident_id": f"INC-{uuid.uuid4().hex[:10].upper()}",
        "analysis_id": analysis_result.get(
            "id",
            f"AN-{uuid.uuid4().hex[:10].upper()}",
        ),
        "incident_type": incident_type,
        "filename": filename,
        "risk_level": risk_level,
        "action": action,
        "confidence": float(
            analysis_result.get("confidence", 0.0)
        ),
        "anomaly_score": float(
            analysis_result.get("anomaly_score", 0.0)
        ),
        "audio_sha256": audio_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": (
            "open"
            if risk_level in {"high", "critical"}
            else "logged"
        ),
    }


def log_incident(
    audio_bytes: bytes,
    filename: str,
    analysis_result: dict[str, Any],
) -> dict[str, Any]:
    """
    Compatibility wrapper used by the analysis API.
    """

    return create_incident(
        audio_bytes=audio_bytes,
        filename=filename,
        analysis_result=analysis_result,
    )