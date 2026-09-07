"""
VoiceGuard - CNN-ready audio feature extraction.

Phase 2.2:
- Converts decoded audio into fixed-size ML representations.
- Produces mel-spectrogram and MFCC matrices.
- Does NOT perform classification.
"""

from __future__ import annotations

import io
from pathlib import Path

import librosa
import numpy as np


TARGET_SAMPLE_RATE = 16_000
N_MELS = 64
N_MFCC = 20
N_FFT = 1024
HOP_LENGTH = 256
TARGET_FRAMES = 256


def _clean_array(values: np.ndarray) -> np.ndarray:
    """Replace invalid numerical values safely."""
    values = np.asarray(values, dtype=np.float32)

    values = np.nan_to_num(
        values,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    return values


def _fix_frame_length(
    features: np.ndarray,
    target_frames: int = TARGET_FRAMES,
) -> np.ndarray:
    """
    Convert variable-length time dimensions into a fixed number of frames.

    Short recordings are zero-padded.
    Long recordings are cropped.
    """

    current_frames = features.shape[1]

    if current_frames == target_frames:
        return features

    if current_frames > target_frames:
        return features[:, :target_frames]

    padding = target_frames - current_frames

    return np.pad(
        features,
        ((0, 0), (0, padding)),
        mode="constant",
        constant_values=0.0,
    )


def load_audio(audio_bytes: bytes) -> np.ndarray:
    """Decode uploaded audio into mono 16 kHz audio."""

    if not audio_bytes:
        raise ValueError("Audio data is empty.")

    try:
        audio, sample_rate = librosa.load(
            io.BytesIO(audio_bytes),
            sr=TARGET_SAMPLE_RATE,
            mono=True,
        )
    except Exception as exc:
        raise ValueError("Unable to decode the uploaded audio.") from exc

    audio = _clean_array(audio)

    if audio.size == 0:
        raise ValueError("Decoded audio contains no samples.")

    # Peak normalization.
    peak = float(np.max(np.abs(audio)))

    if peak > 0:
        audio = audio / peak

    return audio.astype(np.float32)


def extract_mel_spectrogram(audio: np.ndarray) -> np.ndarray:
    """Create a normalized log-mel spectrogram."""

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=TARGET_SAMPLE_RATE,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        fmin=20,
        fmax=TARGET_SAMPLE_RATE // 2,
        power=2.0,
    )

    mel_db = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    mel_db = _clean_array(mel_db)

    # Normalize approximately into [0, 1].
    minimum = float(np.min(mel_db))
    maximum = float(np.max(mel_db))

    if maximum > minimum:
        mel_db = (mel_db - minimum) / (maximum - minimum)
    else:
        mel_db = np.zeros_like(mel_db)

    return _fix_frame_length(mel_db)


def extract_mfcc(audio: np.ndarray) -> np.ndarray:
    """Create normalized MFCC features."""

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=TARGET_SAMPLE_RATE,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    mfcc = _clean_array(mfcc)

    # Per-feature standardization.
    mean = np.mean(mfcc, axis=1, keepdims=True)
    std = np.std(mfcc, axis=1, keepdims=True)

    mfcc = (mfcc - mean) / (std + 1e-8)

    return _fix_frame_length(mfcc)


def extract_model_features(audio_bytes: bytes) -> dict:
    """
    Generate the complete CNN-ready representation.

    Returns:
        metadata
        mel_spectrogram
        mfcc
        combined_features
    """

    audio = load_audio(audio_bytes)

    mel = extract_mel_spectrogram(audio)
    mfcc = extract_mfcc(audio)

    # Combine the two representations into channels.
    #
    # Shape:
    #   channel 0 = mel spectrogram
    #   channel 1 = MFCC
    #
    # MFCC is resized by repeating rows so both representations
    # have compatible dimensions.

    mfcc_channel = np.zeros_like(mel)

    rows = min(mfcc.shape[0], mel.shape[0])

    mfcc_channel[:rows, :] = mfcc[:rows, :]

    combined = np.stack(
        [
            mel,
            mfcc_channel,
        ],
        axis=0,
    )

    combined = _clean_array(combined)

    duration = len(audio) / TARGET_SAMPLE_RATE

    return {
        "sample_rate": TARGET_SAMPLE_RATE,
        "duration_seconds": round(float(duration), 3),
        "mel_bins": N_MELS,
        "mfcc_coefficients": N_MFCC,
        "frames": TARGET_FRAMES,
        "feature_shape": list(combined.shape),
        "representation": "2-channel mel-spectrogram + MFCC",
        "mel_spectrogram": mel.tolist(),
        "mfcc": mfcc.tolist(),
        "combined_features": combined.tolist(),
    }