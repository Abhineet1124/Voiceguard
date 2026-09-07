from __future__ import annotations

from pathlib import Path

from app.ml.dataset import SUPPORTED_AUDIO


DATASET_ROOT = Path("datasets/voice")


def scan_directory(directory: Path) -> list[Path]:
    if not directory.exists():
        return []

    return sorted(
        file
        for file in directory.rglob("*")
        if file.is_file()
        and file.suffix.lower() in SUPPORTED_AUDIO
    )


def main() -> None:
    real_dir = DATASET_ROOT / "real"
    synthetic_dir = DATASET_ROOT / "synthetic"

    real_files = scan_directory(real_dir)
    synthetic_files = scan_directory(synthetic_dir)

    print("=" * 60)
    print("VOICEGUARD DATASET VALIDATION")
    print("=" * 60)

    print(f"Dataset root : {DATASET_ROOT}")
    print(f"Real samples : {len(real_files)}")
    print(f"Synthetic   : {len(synthetic_files)}")
    print(f"Total        : {len(real_files) + len(synthetic_files)}")

    print("\nSupported formats:")
    for extension in sorted(SUPPORTED_AUDIO):
        print(f"  {extension}")

    print("\nClass distribution:")

    total = len(real_files) + len(synthetic_files)

    if total:
        real_percent = len(real_files) / total * 100
        synthetic_percent = len(synthetic_files) / total * 100

        print(
            f"  Real      : {real_percent:.2f}%"
        )

        print(
            f"  Synthetic : {synthetic_percent:.2f}%"
        )

    print("\nSample files:")

    for file in real_files[:5]:
        print(f"  [REAL]      {file}")

    for file in synthetic_files[:5]:
        print(f"  [SYNTHETIC] {file}")

    print("\nValidation:")

    if not real_files:
        print("  WARNING: No real speech files found.")

    if not synthetic_files:
        print("  WARNING: No synthetic speech files found.")

    if real_files and synthetic_files:
        print("  PASS: Both classes are present.")
    else:
        print("  FAIL: Dataset is not ready for training.")

    print("=" * 60)


if __name__ == "__main__":
    main()