from __future__ import annotations

from pathlib import Path
from typing import Any

import torch

from app.ml.model import VoiceGuardCNN
from app.ml.feature_extractor import extract_model_features


MODEL_PATH = Path("models/voiceguard_cnn_best.pt")
MODEL_VERSION = "voiceguard-cnn-v1"

CLASS_MAP = {
    0: "real",
    1: "synthetic",
}


class VoiceGuardInference:
    """
    VoiceGuard CNN inference service.

    The service is designed to work with a trained VoiceGuardCNN checkpoint.
    If no checkpoint exists, it stays in development mode and does not
    pretend that ML inference is available.
    """

    def __init__(self, model_path: Path | str = MODEL_PATH) -> None:
        self.model_path = Path(model_path)
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.model: VoiceGuardCNN | None = None
        self.loaded = False
        self.error: str | None = None
        self.checkpoint_metadata: dict[str, Any] = {}

        self._load_model()

    def _load_model(self) -> None:
        """Load the trained CNN checkpoint if it exists."""

        if not self.model_path.exists():
            self.error = (
                f"Model checkpoint not found: {self.model_path}. "
                "ML inference remains disabled until a trained model is available."
            )
            return

        try:
            checkpoint = torch.load(
                self.model_path,
                map_location=self.device,
                weights_only=False,
            )

            self.model = VoiceGuardCNN(num_classes=2)

            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
                self.checkpoint_metadata = {
                    key: value
                    for key, value in checkpoint.items()
                    if key != "state_dict"
                }
            else:
                state_dict = checkpoint

            self.model.load_state_dict(state_dict)
            self.model.to(self.device)
            self.model.eval()

            self.loaded = True
            self.error = None

        except Exception as exc:
            self.model = None
            self.loaded = False
            self.error = f"Unable to load model checkpoint: {exc}"

    def status(self) -> dict[str, Any]:
        """Return the current inference service status."""

        return {
            "available": self.loaded,
            "model_version": MODEL_VERSION,
            "model_path": str(self.model_path),
            "device": str(self.device),
            "class_map": CLASS_MAP,
            "checkpoint_metadata": self.checkpoint_metadata,
            "error": self.error,
        }

    def predict(
        self,
        audio_bytes: bytes,
        filename: str,
    ) -> dict[str, Any]:
        """
        Run CNN inference on an audio file.

        Returns class probabilities and the predicted class.
        """

        if not self.loaded or self.model is None:
            raise RuntimeError(
                "Trained VoiceGuard CNN is not available. "
                "Train the model and place the checkpoint at "
                f"{self.model_path}."
            )

        if not audio_bytes:
            raise ValueError("Audio data is empty.")

        extracted = extract_model_features(
            audio_bytes=audio_bytes,
            filename=filename,
        )

        features = extracted["combined_features"]

        tensor = torch.from_numpy(features).float().unsqueeze(0)
        tensor = tensor.to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)[0]

        real_probability = float(probabilities[0].item())
        synthetic_probability = float(probabilities[1].item())

        predicted_index = int(torch.argmax(probabilities).item())
        predicted_label = CLASS_MAP[predicted_index]

        confidence = max(
            real_probability,
            synthetic_probability,
        )

        return {
            "model_version": MODEL_VERSION,
            "prediction": predicted_label,
            "prediction_index": predicted_index,
            "confidence": round(confidence, 6),
            "probabilities": {
                "real": round(real_probability, 6),
                "synthetic": round(synthetic_probability, 6),
            },
            "device": str(self.device),
            "feature_shape": list(features.shape),
            "feature_metadata": {
                "sample_rate": extracted["sample_rate"],
                "duration_seconds": extracted["duration_seconds"],
                "mel_bins": extracted["mel_bins"],
                "mfcc_coefficients": extracted["mfcc_coefficients"],
                "frames": extracted["frames"],
            },
        }


# Singleton inference service.
inference_service = VoiceGuardInference()