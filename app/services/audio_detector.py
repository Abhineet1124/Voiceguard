import io
import time
import uuid
from pathlib import Path

import librosa
import numpy as np


MODEL_VERSION = "baseline-audio-v2"

TARGET_SAMPLE_RATE = 16000

MIN_DURATION_SECONDS = 0.5
MAX_DURATION_SECONDS = 300.0

SUPPORTED_EXTENSIONS = {
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".webm",
}


def _safe_mean(values) -> float:
    values = np.asarray(values)

    if values.size == 0:
        return 0.0

    return float(np.mean(values))


def _safe_std(values) -> float:
    values = np.asarray(values)

    if values.size == 0:
        return 0.0

    return float(np.std(values))


def _normalize_audio(audio: np.ndarray) -> np.ndarray:
    """
    Normalize audio amplitude safely.

    This improves consistency between recordings with different
    microphone/input volume levels.
    """

    audio = np.asarray(audio, dtype=np.float32)

    if audio.size == 0:
        return audio

    peak = float(np.max(np.abs(audio)))

    if peak > 0:
        audio = audio / peak

    return audio


def _trim_silence(
    audio: np.ndarray,
    sample_rate: int,
) -> np.ndarray:
    """
    Remove leading/trailing silence using librosa's energy-based
    trimming.

    If trimming fails or produces an empty signal, the original
    audio is retained.
    """

    if audio.size == 0:
        return audio

    try:
        trimmed, _ = librosa.effects.trim(
            audio,
            top_db=35,
        )

        if trimmed.size > 0:
            return trimmed

    except Exception:
        pass

    return audio


def _calculate_silence_ratio(
    audio: np.ndarray,
) -> float:
    """
    Estimate the proportion of low-energy frames.

    This is an acoustic quality indicator, NOT a deepfake indicator.
    """

    if audio.size == 0:
        return 1.0

    rms = librosa.feature.rms(y=audio)[0]

    if rms.size == 0:
        return 1.0

    threshold = max(
        float(np.max(rms)) * 0.05,
        1e-5,
    )

    silent_frames = np.sum(rms < threshold)

    return float(silent_frames / len(rms))


def extract_features(
    audio_bytes: bytes,
    filename: str,
) -> dict:
    """
    Decode, preprocess and extract measurable acoustic features.

    Pipeline:

        Raw audio
            ↓
        Decode
            ↓
        16 kHz mono
            ↓
        Silence trimming
            ↓
        Amplitude normalization
            ↓
        Acoustic feature extraction

    IMPORTANT:
    This is a development-stage acoustic feature pipeline.
    It is NOT a trained voice-clone detector.
    """

    suffix = Path(filename).suffix.lower()

    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported audio format: {suffix}"
        )

    if not audio_bytes:
        raise ValueError(
            "Audio contains no data."
        )

    try:
        audio, sample_rate = librosa.load(
            io.BytesIO(audio_bytes),
            sr=TARGET_SAMPLE_RATE,
            mono=True,
        )

    except Exception as exc:
        raise ValueError(
            "Unable to decode the uploaded audio. "
            "The file may be corrupted or unsupported."
        ) from exc

    if audio is None or len(audio) == 0:
        raise ValueError(
            "Audio contains no samples."
        )

    # Remove NaN / infinite values.
    audio = np.nan_to_num(
        audio,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    original_duration = (
        len(audio) / sample_rate
    )

    if original_duration < MIN_DURATION_SECONDS:
        raise ValueError(
            f"Audio is too short. "
            f"Minimum duration is "
            f"{MIN_DURATION_SECONDS} seconds."
        )

    if original_duration > MAX_DURATION_SECONDS:
        raise ValueError(
            f"Audio is too long. "
            f"Maximum duration is "
            f"{MAX_DURATION_SECONDS} seconds."
        )

    # Acoustic preprocessing.
    silence_ratio = _calculate_silence_ratio(audio)

    audio = _trim_silence(
        audio,
        sample_rate,
    )

    audio = _normalize_audio(audio)

    if audio.size == 0:
        raise ValueError(
            "No usable audio remains after preprocessing."
        )

    duration = len(audio) / sample_rate

    # ---------------------------------------------------------
    # Time-domain features
    # ---------------------------------------------------------

    rms = librosa.feature.rms(
        y=audio
    )[0]

    zcr = librosa.feature.zero_crossing_rate(
        audio
    )[0]

    # ---------------------------------------------------------
    # Spectral features
    # ---------------------------------------------------------

    centroid = librosa.feature.spectral_centroid(
        y=audio,
        sr=sample_rate,
    )[0]

    bandwidth = librosa.feature.spectral_bandwidth(
        y=audio,
        sr=sample_rate,
    )[0]

    rolloff = librosa.feature.spectral_rolloff(
        y=audio,
        sr=sample_rate,
    )[0]

    # Spectral contrast can fail for extremely short audio,
    # so it is calculated defensively.
    try:
        contrast = librosa.feature.spectral_contrast(
            y=audio,
            sr=sample_rate,
        )

        spectral_contrast_mean = float(
            np.mean(contrast)
        )

        spectral_contrast_std = float(
            np.std(contrast)
        )

    except Exception:
        spectral_contrast_mean = 0.0
        spectral_contrast_std = 0.0

    # ---------------------------------------------------------
    # MFCC features
    # ---------------------------------------------------------

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sample_rate,
        n_mfcc=13,
    )

    # ---------------------------------------------------------
    # Mel-spectrogram
    # ---------------------------------------------------------

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=sample_rate,
        n_mels=40,
    )

    mel_db = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    return {
        "sample_rate": int(sample_rate),

        "duration": round(
            float(duration),
            3,
        ),

        "original_duration": round(
            float(original_duration),
            3,
        ),

        "silence_ratio": round(
            float(silence_ratio),
            4,
        ),

        # RMS
        "rms_mean": _safe_mean(rms),
        "rms_std": _safe_std(rms),

        # Zero-crossing
        "zcr_mean": _safe_mean(zcr),
        "zcr_std": _safe_std(zcr),

        # Spectral centroid
        "spectral_centroid_mean": _safe_mean(
            centroid
        ),

        "spectral_centroid_std": _safe_std(
            centroid
        ),

        # Spectral bandwidth
        "spectral_bandwidth_mean": _safe_mean(
            bandwidth
        ),

        "spectral_bandwidth_std": _safe_std(
            bandwidth
        ),

        # Spectral rolloff
        "spectral_rolloff_mean": _safe_mean(
            rolloff
        ),

        "spectral_rolloff_std": _safe_std(
            rolloff
        ),

        # Spectral contrast
        "spectral_contrast_mean": (
            spectral_contrast_mean
        ),

        "spectral_contrast_std": (
            spectral_contrast_std
        ),

        # MFCC
        "mfcc_mean": float(
            np.mean(mfcc)
        ),

        "mfcc_std": float(
            np.std(mfcc)
        ),

        # Mel-spectrogram
        "mel_mean": float(
            np.mean(mel_db)
        ),

        "mel_std": float(
            np.std(mel_db)
        ),
    }


def calculate_baseline_score(
    features: dict,
) -> float:
    """
    Calculate a prototype acoustic anomaly score.

    IMPORTANT:

    This is NOT a trained anti-spoofing classifier.

    It provides a deterministic development baseline so the
    complete VoiceGuard pipeline can be demonstrated while the
    trained ML model is being developed.
    """

    score = 0.0

    duration = features["duration"]

    # ---------------------------------------------------------
    # Recording quality indicators
    # ---------------------------------------------------------

    if duration < 1.0:
        score += 0.10

    if features["silence_ratio"] > 0.75:
        score += 0.15

    # ---------------------------------------------------------
    # Acoustic variation
    # ---------------------------------------------------------

    if features["rms_std"] < 0.01:
        score += 0.10

    if features["zcr_std"] < 0.015:
        score += 0.08

    # ---------------------------------------------------------
    # Spectral characteristics
    # ---------------------------------------------------------

    centroid = (
        features["spectral_centroid_mean"]
    )

    if centroid < 500:
        score += 0.08

    elif centroid > 5000:
        score += 0.08

    bandwidth = (
        features["spectral_bandwidth_mean"]
    )

    if bandwidth < 500:
        score += 0.08

    # ---------------------------------------------------------
    # MFCC variation
    # ---------------------------------------------------------

    if features["mfcc_std"] < 8:
        score += 0.08

    # ---------------------------------------------------------
    # Mel-spectrogram variation
    # ---------------------------------------------------------

    if features["mel_std"] < 8:
        score += 0.08

    # ---------------------------------------------------------
    # Spectral contrast
    # ---------------------------------------------------------

    if (
        features["spectral_contrast_std"]
        < 1.0
    ):
        score += 0.05

    return min(
        max(score, 0.0),
        1.0,
    )


def classify_risk(
    anomaly_score: float,
) -> tuple[str, str, str]:
    """
    Convert the prototype anomaly score into:

        label
        risk level
        recommended action

    These thresholds belong to the development baseline and
    must be recalibrated after training/evaluation of a real
    anti-spoofing model.
    """

    if anomaly_score >= 0.70:
        return (
            "synthetic",
            "critical",
            "block",
        )

    if anomaly_score >= 0.45:
        return (
            "suspicious",
            "high",
            "alert",
        )

    if anomaly_score >= 0.25:
        return (
            "real",
            "medium",
            "verify",
        )

    return (
        "real",
        "low",
        "allow",
    )


def analyze_audio(
    audio_bytes: bytes,
    filename: str,
) -> dict:
    """
    Complete development-stage VoiceGuard analysis.
    """

    start = time.perf_counter()

    features = extract_features(
        audio_bytes,
        filename,
    )

    anomaly_score = calculate_baseline_score(
        features
    )

    label, risk_level, action = classify_risk(
        anomaly_score
    )

    # ---------------------------------------------------------
    # Prototype confidence
    # ---------------------------------------------------------

    confidence = (
        0.50
        + abs(
            anomaly_score - 0.25
        )
    )

    confidence = min(
        max(confidence, 0.50),
        0.99,
    )

    processing_time = (
        time.perf_counter()
        - start
    )

    return {
        "id": str(uuid.uuid4()),

        "filename": filename,

        "label": label,

        "confidence": round(
            confidence,
            4,
        ),

        "risk_level": risk_level,

        "action": action,

        "processing_time": round(
            processing_time,
            4,
        ),

        "model_version": MODEL_VERSION,

        "features": {
            "duration": features[
                "duration"
            ],

            "original_duration": features[
                "original_duration"
            ],

            "sample_rate": features[
                "sample_rate"
            ],

            "silence_ratio": features[
                "silence_ratio"
            ],

            "rms_mean": round(
                features["rms_mean"],
                6,
            ),

            "rms_std": round(
                features["rms_std"],
                6,
            ),

            "zcr_mean": round(
                features["zcr_mean"],
                6,
            ),

            "zcr_std": round(
                features["zcr_std"],
                6,
            ),

            "spectral_centroid_mean": round(
                features[
                    "spectral_centroid_mean"
                ],
                2,
            ),

            "spectral_centroid_std": round(
                features[
                    "spectral_centroid_std"
                ],
                2,
            ),

            "spectral_bandwidth_mean": round(
                features[
                    "spectral_bandwidth_mean"
                ],
                2,
            ),

            "spectral_bandwidth_std": round(
                features[
                    "spectral_bandwidth_std"
                ],
                2,
            ),

            "spectral_rolloff_mean": round(
                features[
                    "spectral_rolloff_mean"
                ],
                2,
            ),

            "spectral_rolloff_std": round(
                features[
                    "spectral_rolloff_std"
                ],
                2,
            ),

            "spectral_contrast_mean": round(
                features[
                    "spectral_contrast_mean"
                ],
                4,
            ),

            "spectral_contrast_std": round(
                features[
                    "spectral_contrast_std"
                ],
                4,
            ),

            "mfcc_mean": round(
                features["mfcc_mean"],
                4,
            ),

            "mfcc_std": round(
                features["mfcc_std"],
                4,
            ),

            "mel_mean": round(
                features["mel_mean"],
                4,
            ),

            "mel_std": round(
                features["mel_std"],
                4,
            ),
        },

        "anomaly_score": round(
            anomaly_score,
            4,
        ),

        "pipeline": {
            "decoded": True,
            "mono": True,
            "target_sample_rate": TARGET_SAMPLE_RATE,
            "silence_trimmed": True,
            "normalized": True,
            "features_extracted": True,
        },

        "disclaimer": (
            "Development-stage baseline using "
            "acoustic feature analysis. This score "
            "is not a validated voice-clone detector. "
            "A trained anti-spoofing model must be "
            "evaluated before production deployment."
        ),
    }