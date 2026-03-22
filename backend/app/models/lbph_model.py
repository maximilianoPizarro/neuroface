"""OpenCV LBPH Face Recognizer - default model from the reconocimiento-facial archetype."""

from typing import Any

import cv2
import numpy as np

from app.models.base import FaceRecognitionModel


class LBPHModel(FaceRecognitionModel):
    """Local Binary Patterns Histograms face recognizer (OpenCV)."""

    def __init__(self, radius: int = 1, neighbors: int = 8, grid_x: int = 8, grid_y: int = 8):
        self._recognizer = cv2.face.LBPHFaceRecognizer_create(
            radius=radius, neighbors=neighbors, grid_x=grid_x, grid_y=grid_y
        )
        self._radius = radius
        self._neighbors = neighbors
        self._grid_x = grid_x
        self._grid_y = grid_y

    def train(self, images: list[np.ndarray], labels: np.ndarray) -> None:
        self._recognizer.train(images, labels)

    def predict(self, face_roi: np.ndarray) -> tuple[int, float]:
        label, confidence = self._recognizer.predict(face_roi)
        return int(label), float(confidence)

    def save(self, path: str) -> None:
        self._recognizer.save(path)

    def load(self, path: str) -> None:
        self._recognizer.read(path)

    def name(self) -> str:
        return "OpenCV LBPH"

    def info(self) -> dict[str, Any]:
        return {
            "name": self.name(),
            "type": "lbph",
            "backend": "opencv",
            "params": {
                "radius": self._radius,
                "neighbors": self._neighbors,
                "grid_x": self._grid_x,
                "grid_y": self._grid_y,
            },
        }
