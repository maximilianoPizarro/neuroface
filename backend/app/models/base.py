"""Abstract base class for pluggable face recognition models."""

from abc import ABC, abstractmethod
from typing import Any

import numpy as np


class FaceRecognitionModel(ABC):
    """Strategy interface for face recognition models.

    Implementations must provide train, predict, save, and load methods.
    The default model is OpenCV LBPH. Optional models (e.g., dlib) can be
    activated via the AI_MODEL environment variable without being mandatory.
    """

    @abstractmethod
    def train(self, images: list[np.ndarray], labels: np.ndarray) -> None:
        """Train the model with face ROI images and their labels."""
        ...

    @abstractmethod
    def predict(self, face_roi: np.ndarray) -> tuple[int, float]:
        """Predict the label and confidence for a face ROI.

        Returns:
            tuple of (label_id, confidence).
        """
        ...

    @abstractmethod
    def save(self, path: str) -> None:
        """Persist trained model to disk."""
        ...

    @abstractmethod
    def load(self, path: str) -> None:
        """Load a previously trained model from disk."""
        ...

    @abstractmethod
    def name(self) -> str:
        """Return the human-readable name of this model."""
        ...

    @abstractmethod
    def info(self) -> dict[str, Any]:
        """Return metadata about this model (version, params, etc.)."""
        ...
