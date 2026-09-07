"""
VoiceGuard - CNN baseline architecture.

Phase 3.1
This model is an architecture only until trained and validated
on an appropriate genuine-vs-synthetic speech dataset.
"""

from __future__ import annotations

import torch
import torch.nn as nn


class VoiceGuardCNN(nn.Module):
    """
    Lightweight 2D CNN for two-channel audio representations.

    Input:
        [batch, 2, 64, 256]

    Output:
        [batch, 2]

    Classes:
        0 = real
        1 = synthetic
    """

    def __init__(self, num_classes: int = 2):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(
                in_channels=2,
                out_channels=32,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(
                in_channels=32,
                out_channels=64,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(
                in_channels=64,
                out_channels=128,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(
                in_channels=128,
                out_channels=256,
                kernel_size=3,
                padding=1,
            ),
            nn.BatchNorm2d(256),
            nn.ReLU(),

            nn.AdaptiveAvgPool2d((1, 1)),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),

            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.30),

            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.features(x)
        x = self.classifier(x)
        return x


def create_model() -> VoiceGuardCNN:
    """Create a fresh untrained VoiceGuard CNN."""
    return VoiceGuardCNN(num_classes=2)