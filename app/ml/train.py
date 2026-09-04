"""
VoiceGuard - CNN training pipeline.

Phase 3.3

Classes:
    0 = real
    1 = synthetic

This script trains and evaluates the VoiceGuard CNN.
It does NOT connect the trained model to the production API yet.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import numpy as np
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from torch import nn
from torch.utils.data import DataLoader, Subset

from app.ml.dataset import VoiceDataset
from app.ml.model import VoiceGuardCNN


SEED = 42
DEFAULT_EPOCHS = 10
DEFAULT_BATCH_SIZE = 8
DEFAULT_LEARNING_RATE = 0.001

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


def set_seed(seed: int = SEED) -> None:
    """Make training as reproducible as reasonably possible."""

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def split_dataset(
    dataset: VoiceDataset,
    validation_ratio: float = 0.20,
):
    """Create deterministic train/validation subsets."""

    total = len(dataset)

    if total < 2:
        raise ValueError(
            "At least two audio files are required."
        )

    indices = list(range(total))

    random.Random(SEED).shuffle(indices)

    validation_size = max(
        1,
        int(total * validation_ratio),
    )

    # Keep at least one sample for training.
    validation_size = min(
        validation_size,
        total - 1,
    )

    validation_indices = indices[:validation_size]
    train_indices = indices[validation_size:]

    return (
        Subset(dataset, train_indices),
        Subset(dataset, validation_indices),
    )


def evaluate(
    model: nn.Module,
    loader: DataLoader,
):
    """Evaluate model and calculate standard classification metrics."""

    model.eval()

    predictions = []
    targets = []

    with torch.no_grad():
        for features, labels in loader:
            features = features.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(features)
            predicted = torch.argmax(
                outputs,
                dim=1,
            )

            predictions.extend(
                predicted.cpu().numpy().tolist()
            )

            targets.extend(
                labels.cpu().numpy().tolist()
            )

    accuracy = accuracy_score(
        targets,
        predictions,
    )

    precision = precision_score(
        targets,
        predictions,
        average="binary",
        zero_division=0,
    )

    recall = recall_score(
        targets,
        predictions,
        average="binary",
        zero_division=0,
    )

    f1 = f1_score(
        targets,
        predictions,
        average="binary",
        zero_division=0,
    )

    matrix = confusion_matrix(
        targets,
        predictions,
        labels=[0, 1],
    )

    report = classification_report(
        targets,
        predictions,
        labels=[0, 1],
        target_names=[
            "real",
            "synthetic",
        ],
        zero_division=0,
    )

    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "confusion_matrix": matrix.tolist(),
        "classification_report": report,
    }


def train(
    dataset_path: str,
    epochs: int = DEFAULT_EPOCHS,
    batch_size: int = DEFAULT_BATCH_SIZE,
    learning_rate: float = DEFAULT_LEARNING_RATE,
):
    set_seed()

    print("=" * 60)
    print("VOICEGUARD CNN TRAINING")
    print("=" * 60)

    print(f"Device: {DEVICE}")
    print(f"Dataset: {dataset_path}")

    dataset = VoiceDataset(dataset_path)

    print(f"Total samples: {len(dataset)}")

    train_dataset, validation_dataset = split_dataset(
        dataset
    )

    print(
        f"Training samples: {len(train_dataset)}"
    )

    print(
        f"Validation samples: {len(validation_dataset)}"
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
    )

    validation_loader = DataLoader(
        validation_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
    )

    model = VoiceGuardCNN(
        num_classes=2
    ).to(DEVICE)

    criterion = nn.CrossEntropyLoss()

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=learning_rate,
    )

    output_dir = Path("models")
    output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    best_f1 = -1.0

    history = []

    for epoch in range(1, epochs + 1):

        model.train()

        running_loss = 0.0
        sample_count = 0

        for features, labels in train_loader:

            features = features.to(DEVICE)
            labels = labels.to(DEVICE)

            optimizer.zero_grad()

            outputs = model(features)

            loss = criterion(
                outputs,
                labels,
            )

            loss.backward()

            optimizer.step()

            batch_size_actual = labels.size(0)

            running_loss += (
                loss.item()
                * batch_size_actual
            )

            sample_count += batch_size_actual

        train_loss = (
            running_loss / sample_count
            if sample_count
            else 0.0
        )

        metrics = evaluate(
            model,
            validation_loader,
        )

        epoch_result = {
            "epoch": epoch,
            "train_loss": float(train_loss),
            **{
                key: value
                for key, value in metrics.items()
                if key != "classification_report"
            },
        }

        history.append(epoch_result)

        print(
            f"\nEpoch {epoch}/{epochs}"
        )

        print(
            f"Loss: {train_loss:.4f}"
        )

        print(
            f"Accuracy: {metrics['accuracy']:.4f}"
        )

        print(
            f"Precision: {metrics['precision']:.4f}"
        )

        print(
            f"Recall: {metrics['recall']:.4f}"
        )

        print(
            f"F1: {metrics['f1_score']:.4f}"
        )

        if metrics["f1_score"] > best_f1:

            best_f1 = metrics["f1_score"]

            checkpoint_path = (
                output_dir
                / "voiceguard_cnn_best.pt"
            )

            torch.save(
                {
                    "model_state_dict": model.state_dict(),
                    "model_version": "voiceguard-cnn-v1",
                    "classes": {
                        "0": "real",
                        "1": "synthetic",
                    },
                    "sample_rate": 16000,
                    "mel_bins": 64,
                    "frames": 256,
                    "best_f1": best_f1,
                },
                checkpoint_path,
            )

            print(
                f"Best model saved: {checkpoint_path}"
            )

    final_metrics = evaluate(
        model,
        validation_loader,
    )

    metrics_path = (
        output_dir
        / "training_metrics.json"
    )

    with metrics_path.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            {
                "model_version": "voiceguard-cnn-v1",
                "device": str(DEVICE),
                "epochs": epochs,
                "batch_size": batch_size,
                "learning_rate": learning_rate,
                "history": history,
                "final_metrics": final_metrics,
            },
            file,
            indent=2,
        )

    print("\n" + "=" * 60)
    print("FINAL VALIDATION RESULTS")
    print("=" * 60)

    print(
        final_metrics[
            "classification_report"
        ]
    )

    print(
        "Confusion matrix:"
    )

    print(
        np.array(
            final_metrics[
                "confusion_matrix"
            ]
        )
    )

    print(
        f"\nMetrics saved to: {metrics_path}"
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Train the VoiceGuard CNN "
            "on real and synthetic speech."
        )
    )

    parser.add_argument(
        "--dataset",
        default="datasets/voice",
        help="Path to dataset directory.",
    )

    parser.add_argument(
        "--epochs",
        type=int,
        default=DEFAULT_EPOCHS,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
    )

    parser.add_argument(
        "--learning-rate",
        type=float,
        default=DEFAULT_LEARNING_RATE,
    )

    args = parser.parse_args()

    train(
        dataset_path=args.dataset,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
    )


if __name__ == "__main__":
    main()