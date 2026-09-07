from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from app.ml.inference import inference_service
from app.services.audio_detector import (
    MODEL_VERSION as BASELINE_MODEL_VERSION,
    analyze_audio,
)
from app.services.security_engine import (
    evaluate_risk,
    risk_score,
)


logger = logging.getLogger(__name__)


# ============================================================
# REAL-TIME DETECTOR
# ============================================================

class RealtimeDetector:
    """
    Development-stage real-time VoiceGuard detector.

    The current implementation processes an individual audio
    chunk and returns a security assessment.

    IMPORTANT:
    This is an architectural foundation for streaming analysis.
    It is not a production-grade streaming deepfake detector.
    """

    def __init__(self) -> None:
        self.session_id = (
            f"RT-{uuid.uuid4().hex[:10].upper()}"
        )

        self.chunk_count = 0

    # ========================================================
    # PROCESS CHUNK
    # ========================================================

    def process_chunk(
        self,
        audio_bytes: bytes,
        filename: str = "realtime_chunk.webm",
    ) -> dict[str, Any]:

        start_time = time.perf_counter()

        self.chunk_count += 1

        # ----------------------------------------------------
        # Validate chunk
        # ----------------------------------------------------

        if not audio_bytes:
            return {
                "success": False,
                "error": "Audio chunk is empty.",
            }

        # ----------------------------------------------------
        # Baseline analysis
        # ----------------------------------------------------

        try:

            baseline_result = analyze_audio(
                audio_bytes=audio_bytes,
                filename=filename,
            )

        except ValueError as exc:

            return {
                "success": False,
                "error": str(exc),
            }

        except Exception:

            logger.exception(
                "Realtime baseline analysis failed"
            )

            return {
                "success": False,
                "error": (
                    "Realtime audio analysis failed."
                ),
            }

        # ----------------------------------------------------
        # CNN inference
        # ----------------------------------------------------

        cnn_result = None

        try:

            cnn_status = (
                inference_service.status()
            )

            if cnn_status.get(
                "available",
                False,
            ):

                cnn_result = (
                    inference_service.predict(
                        audio_bytes=audio_bytes,
                        filename=filename,
                    )
                )

        except Exception:

            logger.exception(
                "Realtime CNN inference failed"
            )

            cnn_result = None

        # ----------------------------------------------------
        # Select model
        # ----------------------------------------------------

        if cnn_result is not None:

            model_source = "cnn"

            prediction = str(
                cnn_result.get(
                    "prediction",
                    "real",
                )
            ).lower()

            confidence = float(
                cnn_result.get(
                    "confidence",
                    0.0,
                )
            )

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

            synthetic_probability = (
                anomaly_score
            )

            real_probability = (
                1.0 - anomaly_score
            )

            if prediction == "synthetic":
                confidence = (
                    synthetic_probability
                )
            else:
                confidence = (
                    real_probability
                )

            model_version = (
                BASELINE_MODEL_VERSION
            )

        # ----------------------------------------------------
        # Normalize values
        # ----------------------------------------------------

        confidence = max(
            0.0,
            min(
                1.0,
                confidence,
            ),
        )

        real_probability = max(
            0.0,
            min(
                1.0,
                real_probability,
            ),
        )

        synthetic_probability = max(
            0.0,
            min(
                1.0,
                synthetic_probability,
            ),
        )

        # ----------------------------------------------------
        # Risk assessment
        # ----------------------------------------------------

        try:

            risk = evaluate_risk(
                prediction=prediction,
                confidence=confidence,
            )

        except TypeError:

            risk = evaluate_risk(
                prediction,
                confidence,
            )

        except Exception:

            logger.exception(
                "Realtime risk evaluation failed"
            )

            risk = {
                "risk_level": "medium",
                "action": "verify",
                "reason": (
                    "Risk evaluation unavailable."
                ),
            }

        if not isinstance(risk, dict):

            risk = {
                "risk_level": "medium",
                "action": "verify",
                "reason": (
                    "Invalid risk response."
                ),
            }

        # ----------------------------------------------------
        # Risk score
        # ----------------------------------------------------

        try:

            score = float(
                risk_score(
                    prediction=prediction,
                    confidence=confidence,
                )
            )

        except TypeError:

            score = float(
                risk_score(
                    prediction,
                    confidence,
                )
            )

        except Exception:

            score = synthetic_probability

        score = max(
            0.0,
            min(
                1.0,
                score,
            ),
        )

        # ----------------------------------------------------
        # Processing time
        # ----------------------------------------------------

        processing_time_ms = (
            time.perf_counter() - start_time
        ) * 1000

        # ----------------------------------------------------
        # Result
        # ----------------------------------------------------

        return {
            "success": True,

            "session_id": self.session_id,

            "chunk_number": self.chunk_count,

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

            "risk_level": str(
                risk.get(
                    "risk_level",
                    "medium",
                )
            ).lower(),

            "risk_score": round(
                score,
                4,
            ),

            "action": str(
                risk.get(
                    "action",
                    "verify",
                )
            ).lower(),

            "model_source": model_source,

            "model_version": model_version,

            "processing_time_ms": round(
                processing_time_ms,
                2,
            ),

            "cnn_available": (
                inference_service.status()
                .get(
                    "available",
                    False,
                )
            ),

            "development_stage": True,

            "notice": (
                "Realtime chunk processing is currently "
                "a development-stage streaming foundation. "
                "The detector is not production-grade until "
                "the ML model is trained and evaluated on "
                "appropriate voice deepfake datasets."
            ),
        }


# ============================================================
# SINGLE SERVICE INSTANCE
# ============================================================

realtime_detector = RealtimeDetector()