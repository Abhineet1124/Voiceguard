"""
VoiceGuard - Dataset loader.

Phase 3.2
Loads genuine and synthetic speech and converts each recording
into a fixed-size tensor suitable for the CNN.
"""

from __future__ import annotations

from pathlib import Path

import torch
from torch.utils.data import Dataset

from app.services.feature_extractor import extract_model_features


SUPPORTED_AUDIO = {
    ".wav",
    ".mp3",
    ".m4a",
    ".ogg",
    ".webm",
}


class VoiceDataset(Dataset):
    """
    Dataset structure:

        datasets/voice/
        ├── real/
        └── synthetic/

    Labels:
        0 = real
        1 = synthetic
    """

    def __init__(self, root_dir: str | Path):
        self.root_dir = Path(root_dir)

        if not self.root_dir.exists():
            raise FileNotFoundError(
                f"Dataset directory not found: {self.root_dir}"
            )

        self.samples: list[tuple[Path, int]] = []

        self._collect_files(
            self.root_dir / "real",
            label=0,
        )

        self._collect_files(
            self.root_dir / "synthetic",
            label=1,
        )

        if not self.samples:
            raise ValueError(
                "No audio files were found. "
                "Expected real/ and synthetic/ directories."
            )

    def _collect_files(
        self,
        directory: Path,
        label: int,
    ) -> None:
        if not directory.exists():
            return

        for file_path in sorted(directory.rglob("*")):
            if (
                file_path.is_file()
                and file_path.suffix.lower() in SUPPORTED_AUDIO
            ):
                self.samples.append(
                    (file_path, label)
                )

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(
        self,
        index: int,
    ) -> tuple[torch.Tensor, torch.Tensor]:

        file_path, label = self.samples[index]

        try:
            audio_bytes = file_path.read_bytes()

            result = extract_model_features(
                audio_bytes
            )

            features = torch.tensor(
                result["combined_features"],
                dtype=torch.float32,
            )

            target = torch.tensor(
                label,
                dtype=torch.long,
            )

            return features, target

        except Exception as exc:
            raise RuntimeError(
                f"Failed to process audio file: {file_path}"
            ) from exc