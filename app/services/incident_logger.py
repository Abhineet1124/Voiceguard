import hashlib
import uuid
from datetime import datetime, timezone


def create_incident(
    audio_bytes: bytes,
    filename: str,
    analysis_result: dict,
) -> dict:
    """
    Create a security incident record for suspicious/high-risk analysis.

    Development-stage in-memory incident logging.
    """

    audio_hash = hashlib.sha256(audio_bytes).hexdigest()

    risk_level = analysis_result["risk_level"]
    action = analysis_result["action"]

    if risk_level in {"high", "critical"}:
        incident_type = "VOICE_CLONING_RISK"
    elif risk_level == "medium":
        incident_type = "VOICE_VERIFICATION_REQUIRED"
    else:
        incident_type = "ANALYSIS_RECORDED"

    return {
        "incident_id": f"INC-{uuid.uuid4().hex[:10].upper()}",
        "analysis_id": analysis_result["id"],
        "incident_type": incident_type,
        "filename": filename,
        "risk_level": risk_level,
        "action": action,
        "confidence": analysis_result["confidence"],
        "anomaly_score": analysis_result["anomaly_score"],
        "audio_sha256": audio_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "open" if risk_level in {"high", "critical"} else "logged",
    }