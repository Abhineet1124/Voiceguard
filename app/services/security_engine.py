from datetime import datetime, timezone


def evaluate_security_action(
    label: str,
    risk_level: str,
    confidence: float,
    anomaly_score: float,
) -> dict:
    """
    Convert VoiceGuard detection output into a security decision.

    Development-stage decision engine.
    """

    risk = risk_level.lower()

    if risk == "critical":
        action = "block"
        severity = "CRITICAL"
        message = "High-confidence suspicious audio detected. Access should be blocked."

    elif risk == "high":
        action = "alert"
        severity = "HIGH"
        message = "Suspicious voice characteristics detected. Security alert recommended."

    elif risk == "medium":
        action = "verify"
        severity = "MEDIUM"
        message = "Voice cannot be safely trusted. Additional identity verification recommended."

    else:
        action = "allow"
        severity = "LOW"
        message = "No significant anomaly detected by the development-stage baseline."

    return {
        "action": action,
        "severity": severity,
        "message": message,
        "decision_time": datetime.now(timezone.utc).isoformat(),
        "decision_engine": "rule-based-v1",
        "confidence": confidence,
        "anomaly_score": anomaly_score,
        "label": label,
        "risk_level": risk,
    }