from __future__ import annotations

import io
from typing import Any

import librosa
import numpy as np


TARGET_SAMPLE_RATE = 16000
N_MELS = 64
N_MFCC = 20
N_FFT = 1024
HOP_LENGTH = 256
TARGET_FRAMES = 256


def _clean_array(array: np.ndarray) -> np.ndarray:
    """Replace invalid values and return float32 data."""

    array = np.asarray(array, dtype=np.float32)

    array = np.nan_to_num(
        array,
        nan=0.0,
        posinf=0.0,
        neginf=0.0,
    )

    return array


def _fix_frame_length(
    features: np.ndarray,
    target_frames: int = TARGET_FRAMES,
) -> np.ndarray:
    """
    Make the time dimension exactly target_frames.

    Short audio is zero-padded.
    Long audio is cropped.
    """

    features = _clean_array(features)

    current_frames = features.shape[-1]

    if current_frames < target_frames:
        padding = target_frames - current_frames

        features = np.pad(
            features,
            ((0, 0), (0, padding)),
            mode="constant",
        )

    elif current_frames > target_frames:
        features = features[:, :target_frames]

    return features.astype(np.float32)


def load_audio(audio_bytes: bytes) -> np.ndarray:
    """Decode audio bytes as mono 16 kHz audio."""

    if not audio_bytes:
        raise ValueError("Audio data is empty.")

    try:
        audio, _ = librosa.load(
            io.BytesIO(audio_bytes),
            sr=TARGET_SAMPLE_RATE,
            mono=True,
        )
    except Exception as exc:
        raise ValueError(
            f"Unable to decode audio: {exc}"
        ) from exc

    audio = _clean_array(audio)

    if audio.size == 0:
        raise ValueError("Decoded audio contains no samples.")

    peak = float(np.max(np.abs(audio)))

    if peak > 0:
        audio = audio / peak

    return audio.astype(np.float32)


def extract_mel_spectrogram(
    audio: np.ndarray,
) -> np.ndarray:
    """Extract normalized log-mel spectrogram."""

    mel = librosa.feature.melspectrogram(
        y=audio,
        sr=TARGET_SAMPLE_RATE,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        n_mels=N_MELS,
        power=2.0,
    )

    mel_db = librosa.power_to_db(
        mel,
        ref=np.max,
    )

    mel_db = _clean_array(mel_db)

    minimum = float(np.min(mel_db))
    maximum = float(np.max(mel_db))

    if maximum > minimum:
        mel_db = (mel_db - minimum) / (maximum - minimum)
    else:
        mel_db = np.zeros_like(mel_db)

    mel_db = _fix_frame_length(mel_db)

    return mel_db.astype(np.float32)


def extract_mfcc(
    audio: np.ndarray,
) -> np.ndarray:
    """Extract standardized MFCC features."""

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=TARGET_SAMPLE_RATE,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    mfcc = _clean_array(mfcc)

    mean = np.mean(mfcc, axis=1, keepdims=True)
    std = np.std(mfcc, axis=1, keepdims=True)

    mfcc = (mfcc - mean) / (std + 1e-8)

    mfcc = _fix_frame_length(mfcc)

    return mfcc.astype(np.float32)


def extract_model_features(
    audio_bytes: bytes,
    filename: str = "audio.wav",
) -> dict[str, Any]:
    """
    Build the feature representation expected by VoiceGuardCNN.

    Output shape:
        [2, 64, 256]

    Channel 0:
        log-mel spectrogram

    Channel 1:
        MFCC representation placed in the first 20 rows.
    """

    audio = load_audio(audio_bytes)

    mel = extract_mel_spectrogram(audio)
    mfcc = extract_mfcc(audio)

    combined = np.zeros(
        (2, N_MELS, TARGET_FRAMES),
        dtype=np.float32,
    )

    combined[0] = mel

    combined[1, :N_MFCC, :] = mfcc

    duration_seconds = float(
        len(audio) / TARGET_SAMPLE_RATE
    )

    return {
        "filename": filename,
        "sample_rate": TARGET_SAMPLE_RATE,
        "duration_seconds": round(duration_seconds, 4),
        "mel_bins": N_MELS,
        "mfcc_coefficients": N_MFCC,
        "frames": TARGET_FRAMES,
        "mel_features": mel,
        "mfcc_features": mfcc,
        "combined_features": combined,
    }