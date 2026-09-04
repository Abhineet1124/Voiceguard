from __future__ import annotations

from typing import Any


RISK_LEVELS = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def evaluate_risk(
    prediction: str,
    confidence: float,
) -> dict[str, Any]:
    """
    Convert a model prediction and confidence score
    into a VoiceGuard security risk decision.

    Development-stage security policy.

    Prediction:
        real
        synthetic

    Confidence:
        Expected range: 0.0 - 1.0
    """

    prediction = str(prediction).lower().strip()

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(1.0, confidence),
    )

    # --------------------------------------------------------
    # REAL VOICE
    # --------------------------------------------------------

    if prediction == "real":

        if confidence >= 0.85:
            return {
                "risk_level": "low",
                "action": "allow",
                "decision": "ALLOW",
                "reason": (
                    "The analysis strongly indicates genuine "
                    "speech."
                ),
                "confidence": round(confidence, 4),
            }

        if confidence >= 0.60:
            return {
                "risk_level": "medium",
                "action": "verify",
                "decision": "VERIFY",
                "reason": (
                    "The analysis indicates genuine speech, "
                    "but confidence is not sufficiently high "
                    "for automatic approval."
                ),
                "confidence": round(confidence, 4),
            }

        return {
            "risk_level": "medium",
            "action": "verify",
            "decision": "VERIFY",
            "reason": (
                "The system could not establish sufficient "
                "confidence that the speech is genuine."
            ),
            "confidence": round(confidence, 4),
        }

    # --------------------------------------------------------
    # SYNTHETIC / VOICE CLONE
    # --------------------------------------------------------

    if prediction == "synthetic":

        if confidence >= 0.90:
            return {
                "risk_level": "critical",
                "action": "block",
                "decision": "BLOCK",
                "reason": (
                    "The analysis strongly indicates "
                    "synthetic or cloned speech."
                ),
                "confidence": round(confidence, 4),
            }

        if confidence >= 0.70:
            return {
                "risk_level": "high",
                "action": "alert",
                "decision": "ALERT",
                "reason": (
                    "The analysis indicates a high likelihood "
                    "of synthetic or cloned speech."
                ),
                "confidence": round(confidence, 4),
            }

        if confidence >= 0.50:
            return {
                "risk_level": "medium",
                "action": "verify",
                "decision": "VERIFY",
                "reason": (
                    "The analysis shows indicators of "
                    "synthetic speech, but additional "
                    "verification is recommended."
                ),
                "confidence": round(confidence, 4),
            }

        return {
            "risk_level": "low",
            "action": "allow",
            "decision": "ALLOW",
            "reason": (
                "Synthetic-speech confidence is currently "
                "too low to trigger a security response."
            ),
            "confidence": round(confidence, 4),
        }

    # --------------------------------------------------------
    # UNKNOWN PREDICTION
    # --------------------------------------------------------

    return {
        "risk_level": "medium",
        "action": "verify",
        "decision": "VERIFY",
        "reason": (
            "The model returned an unknown classification. "
            "Manual verification is required."
        ),
        "confidence": round(confidence, 4),
    }


def risk_score(
    prediction: str,
    confidence: float,
) -> float:
    """
    Return a normalized 0.0 - 1.0 security risk score.

    This is a policy score, not a scientifically validated
    probability of an attack.
    """

    prediction = str(prediction).lower().strip()

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    confidence = max(
        0.0,
        min(1.0, confidence),
    )

    if prediction == "synthetic":
        return round(confidence, 4)

    if prediction == "real":
        return round(1.0 - confidence, 4)

    return 0.5


def get_risk_level(
    prediction: str,
    confidence: float,
) -> str:
    """
    Convenience function that returns only the risk level.
    """

    result = evaluate_risk(
        prediction=prediction,
        confidence=confidence,
    )

    return str(
        result["risk_level"]
    )


def get_security_action(
    prediction: str,
    confidence: float,
) -> str:
    """
    Convenience function that returns only the action.
    """

    result = evaluate_risk(
        prediction=prediction,
        confidence=confidence,
    )

    return str(
        result["action"]
    )