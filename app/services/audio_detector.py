import time
import uuid
from pathlib import Path

import librosa
import numpy as np


MODEL_VERSION = "baseline-audio-v1"


def _safe_mean(values) -> float:
    return float(np.mean(values)) if len(values) else 0.0


def _safe_std(values) -> float:
    return float(np.std(values)) if len(values) else 0.0


def extract_features(audio_bytes: bytes, filename: str) -> dict:
    """
    Decode audio and extract measurable acoustic features.

    This is the feature-extraction layer of the VoiceGuard prototype.
    It does NOT claim to be a production-grade deepfake detector.
    """

    suffix = Path(filename).suffix.lower()

    # librosa needs a file-like object for in-memory audio.
    import io

    audio, sample_rate = librosa.load(
        io.BytesIO(audio_bytes),
        sr=16000,
        mono=True
    )

    if len(audio) == 0:
        raise ValueError("Audio contains no samples.")

    duration = len(audio) / sample_rate

    rms = librosa.feature.rms(y=audio)[0]
    zcr = librosa.feature.zero_crossing_rate(audio)[0]
    centroid = librosa.feature.spectral_centroid(
        y=audio,
        sr=sample_rate
    )[0]
    bandwidth = librosa.feature.spectral_bandwidth(
        y=audio,
        sr=sample_rate
    )[0]
    rolloff = librosa.feature.spectral_rolloff(
        y=audio,
        sr=sample_rate
    )[0]

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sample_rate,
        n_mfcc=13
    )

    return {
        "sample_rate": sample_rate,
        "duration": round(float(duration), 3),

        "rms_mean": _safe_mean(rms),
        "rms_std": _safe_std(rms),

        "zcr_mean": _safe_mean(zcr),
        "zcr_std": _safe_std(zcr),

        "spectral_centroid_mean": _safe_mean(centroid),
        "spectral_centroid_std": _safe_std(centroid),

        "spectral_bandwidth_mean": _safe_mean(bandwidth),
        "spectral_bandwidth_std": _safe_std(bandwidth),

        "spectral_rolloff_mean": _safe_mean(rolloff),
        "spectral_rolloff_std": _safe_std(rolloff),

        "mfcc_mean": float(np.mean(mfcc)),
        "mfcc_std": float(np.std(mfcc)),
    }


def calculate_baseline_score(features: dict) -> float:
    """
    Calculate a prototype anomaly score from measurable acoustic features.

    IMPORTANT:
    This is a development baseline, not a trained production classifier.
    The score is intended to demonstrate the complete detection pipeline
    until a trained anti-spoofing model is integrated.
    """

    score = 0.0

    # Extremely short recordings are less reliable for analysis.
    duration = features["duration"]

    if duration < 1.0:
        score += 0.15

    # Very low acoustic variation can indicate an overly uniform signal.
    if features["rms_std"] < 0.01:
        score += 0.15

    if features["zcr_std"] < 0.015:
        score += 0.10

    # Spectral characteristics outside a broad speech range.
    centroid = features["spectral_centroid_mean"]

    if centroid < 500:
        score += 0.10
    elif centroid > 5000:
        score += 0.10

    bandwidth = features["spectral_bandwidth_mean"]

    if bandwidth < 500:
        score += 0.10

    # MFCC variation contributes a small amount to the anomaly score.
    if features["mfcc_std"] < 8:
        score += 0.10

    return min(max(score, 0.0), 1.0)


def classify_risk(anomaly_score: float) -> tuple[str, str, str]:
    """
    Convert prototype anomaly score into classification, risk and action.

    Returns:
        label, risk_level, action
    """

    if anomaly_score >= 0.70:
        return "synthetic", "critical", "block"

    if anomaly_score >= 0.45:
        return "suspicious", "high", "alert"

    if anomaly_score >= 0.25:
        return "real", "medium", "verify"

    return "real", "low", "allow"


def analyze_audio(audio_bytes: bytes, filename: str) -> dict:
    start = time.perf_counter()

    features = extract_features(audio_bytes, filename)

    anomaly_score = calculate_baseline_score(features)

    label, risk_level, action = classify_risk(anomaly_score)

    # Confidence represents the prototype model's separation from the
    # neutral midpoint. It is deliberately bounded and clearly tied to
    # the baseline score.
    confidence = 0.50 + abs(anomaly_score - 0.25)

    confidence = min(max(confidence, 0.50), 0.99)

    processing_time = time.perf_counter() - start

    return {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "label": label,
        "confidence": round(confidence, 4),
        "risk_level": risk_level,
        "action": action,
        "processing_time": round(processing_time, 4),
        "model_version": MODEL_VERSION,

        "features": {
            "duration": features["duration"],
            "sample_rate": features["sample_rate"],
            "rms_mean": round(features["rms_mean"], 6),
            "rms_std": round(features["rms_std"], 6),
            "zcr_mean": round(features["zcr_mean"], 6),
            "spectral_centroid_mean": round(
                features["spectral_centroid_mean"], 2
            ),
            "spectral_bandwidth_mean": round(
                features["spectral_bandwidth_mean"], 2
            ),
            "mfcc_mean": round(features["mfcc_mean"], 4),
            "mfcc_std": round(features["mfcc_std"], 4),
        },

        "anomaly_score": round(anomaly_score, 4),

        "disclaimer": (
            "Prototype baseline using acoustic feature analysis. "
            "A trained anti-spoofing model is required for production deployment."
        )
    }