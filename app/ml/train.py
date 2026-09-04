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
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Subset

from app.ml.dataset import VoiceDataset
from app.ml.model import create_model


SEED = 42
MODEL_DIR = Path("models")
BEST_MODEL_PATH = MODEL_DIR / "voiceguard_cnn_best.pt"
METRICS_PATH = MODEL_DIR / "training_metrics.json"


def set_seed(seed: int = SEED) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)

    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def stratified_split(
    labels: list[int],
    validation_size: float = 0.2,
) -> tuple[list[int], list[int]]:

    indices = np.arange(len(labels))

    train_indices, validation_indices = train_test_split(
        indices,
        test_size=validation_size,
        random_state=SEED,
        stratify=labels,
    )

    return train_indices.tolist(), validation_indices.tolist()


def evaluate(
    model: torch.nn.Module,
    loader: DataLoader,
    device: torch.device,
) -> dict:

    model.eval()

    all_predictions: list[int] = []
    all_labels: list[int] = []

    with torch.no_grad():
        for features, labels in loader:
            features = features.to(device)
            labels = labels.to(device)

            outputs = model(features)
            predictions = torch.argmax(outputs, dim=1)

            all_predictions.extend(predictions.cpu().numpy().tolist())
            all_labels.extend(labels.cpu().numpy().tolist())

    accuracy = accuracy_score(all_labels, all_predictions)
    precision = precision_score(
        all_labels,
        all_predictions,
        average="binary",
        zero_division=0,
    )
    recall = recall_score(
        all_labels,
        all_predictions,
        average="binary",
        zero_division=0,
    )
    f1 = f1_score(
        all_labels,
        all_predictions,
        average="binary",
        zero_division=0,
    )

    matrix = confusion_matrix(
        all_labels,
        all_predictions,
        labels=[0, 1],
    )

    report = classification_report(
        all_labels,
        all_predictions,
        labels=[0, 1],
        target_names=["real", "synthetic"],
        zero_division=0,
    )

    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "confusion_matrix": matrix.tolist(),
        "classification_report": report,
    }


def train(
    dataset_path: str,
    epochs: int,
    batch_size: int,
    learning_rate: float,
) -> None:

    set_seed()

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print("=" * 60)
    print("VOICEGUARD CNN TRAINING")
    print("=" * 60)

    print(f"Dataset : {dataset_path}")
    print(f"Device  : {device}")
    print(f"Epochs  : {epochs}")
    print(f"Batch   : {batch_size}")
    print(f"LR      : {learning_rate}")
    print()

    dataset = VoiceDataset(dataset_path)

    if len(dataset) < 4:
        raise RuntimeError(
            "Dataset is too small. Add real and synthetic audio "
            "before starting training."
        )

    labels = dataset.labels

    real_count = labels.count(0)
    synthetic_count = labels.count(1)

    print(f"Real samples      : {real_count}")
    print(f"Synthetic samples : {synthetic_count}")

    if real_count < 2 or synthetic_count < 2:
        raise RuntimeError(
            "Both classes need at least 2 samples for a stratified split."
        )

    train_indices, validation_indices = stratified_split(labels)

    print(f"Training samples   : {len(train_indices)}")
    print(f"Validation samples : {len(validation_indices)}")
    print()

    train_dataset = Subset(dataset, train_indices)
    validation_dataset = Subset(dataset, validation_indices)

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

    model = create_model().to(device)

    criterion = torch.nn.CrossEntropyLoss()

    optimizer = torch.optim.Adam(
        model.parameters(),
        lr=learning_rate,
    )

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    best_f1 = -1.0
    best_metrics = None

    for epoch in range(1, epochs + 1):

        model.train()

        running_loss = 0.0
        sample_count = 0

        for features, labels_batch in train_loader:

            features = features.to(device)
            labels_batch = labels_batch.to(device)

            optimizer.zero_grad()

            outputs = model(features)

            loss = criterion(outputs, labels_batch)

            loss.backward()

            optimizer.step()

            batch_size_actual = labels_batch.size(0)

            running_loss += loss.item() * batch_size_actual
            sample_count += batch_size_actual

        training_loss = (
            running_loss / sample_count
            if sample_count
            else 0.0
        )

        metrics = evaluate(
            model,
            validation_loader,
            device,
        )

        print(
            f"Epoch {epoch:02d}/{epochs} | "
            f"Loss: {training_loss:.4f} | "
            f"Accuracy: {metrics['accuracy']:.4f} | "
            f"Precision: {metrics['precision']:.4f} | "
            f"Recall: {metrics['recall']:.4f} | "
            f"F1: {metrics['f1']:.4f}"
        )

        if metrics["f1"] > best_f1:

            best_f1 = metrics["f1"]
            best_metrics = metrics

            checkpoint = {
                "state_dict": model.state_dict(),
                "model_version": "voiceguard-cnn-v1",
                "class_map": {
                    "0": "real",
                    "1": "synthetic",
                },
                "sample_rate": 16000,
                "mel_bins": 64,
                "frames": 256,
                "best_f1": best_f1,
            }

            torch.save(
                checkpoint,
                BEST_MODEL_PATH,
            )

            print("  ✓ Best model saved")

    if best_metrics is None:
        raise RuntimeError("Training completed without validation metrics.")

    metrics_output = {
        "model_version": "voiceguard-cnn-v1",
        "dataset": str(dataset_path),
        "device": str(device),
        "epochs": epochs,
        "batch_size": batch_size,
        "learning_rate": learning_rate,
        "seed": SEED,
        "samples": {
            "total": len(dataset),
            "real": real_count,
            "synthetic": synthetic_count,
            "training": len(train_indices),
            "validation": len(validation_indices),
        },
        "metrics": best_metrics,
    }

    METRICS_PATH.write_text(
        json.dumps(metrics_output, indent=2),
        encoding="utf-8",
    )

    print()
    print("=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)
    print(f"Best F1       : {best_metrics['f1']:.4f}")
    print(f"Accuracy      : {best_metrics['accuracy']:.4f}")
    print(f"Precision     : {best_metrics['precision']:.4f}")
    print(f"Recall        : {best_metrics['recall']:.4f}")
    print()
    print(f"Model saved   : {BEST_MODEL_PATH}")
    print(f"Metrics saved : {METRICS_PATH}")


def main() -> None:

    parser = argparse.ArgumentParser(
        description="Train VoiceGuard CNN."
    )

    parser.add_argument(
        "--dataset",
        default="datasets/voice",
    )

    parser.add_argument(
        "--epochs",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
    )

    parser.add_argument(
        "--learning-rate",
        type=float,
        default=0.001,
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