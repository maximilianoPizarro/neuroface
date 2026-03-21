"""Optional dlib-based face recognition model using the face_recognition library.

This model is NOT mandatory. It is only loaded when AI_MODEL=dlib is configured
and the face_recognition package is installed.
"""

import os
from typing import Any

import numpy as np

from app.models.base import FaceRecognitionModel

try:
    import face_recognition as fr

    DLIB_AVAILABLE = True
except ImportError:
    DLIB_AVAILABLE = False


class DlibModel(FaceRecognitionModel):
    """Face recognition using dlib's 128-dimensional face encodings."""

    def __init__(self, tolerance: float = 0.6):
        if not DLIB_AVAILABLE:
            raise ImportError(
                "face_recognition package is not installed. "
                "Install it with: pip install face_recognition"
            )
        self._tolerance = tolerance
        self._encodings: list[np.ndarray] = []
        self._labels: list[int] = []

    def train(self, images: list[np.ndarray], labels: np.ndarray) -> None:
        self._encodings = []
        self._labels = []

        for img, label in zip(images, labels):
            if len(img.shape) == 2:
                img_rgb = np.stack([img] * 3, axis=-1)
            else:
                img_rgb = img

            encs = fr.face_encodings(img_rgb)
            if encs:
                self._encodings.append(encs[0])
                self._labels.append(int(label))

    def predict(self, face_roi: np.ndarray) -> tuple[int, float]:
        if not self._encodings:
            return -1, 0.0

        if len(face_roi.shape) == 2:
            roi_rgb = np.stack([face_roi] * 3, axis=-1)
        else:
            roi_rgb = face_roi

        encs = fr.face_encodings(roi_rgb)
        if not encs:
            return -1, 0.0

        distances = fr.face_distance(self._encodings, encs[0])
        min_idx = int(np.argmin(distances))
        min_dist = float(distances[min_idx])

        if min_dist <= self._tolerance:
            confidence = (1 - min_dist) * 100
            return self._labels[min_idx], confidence

        return -1, min_dist * 100

    def save(self, path: str) -> None:
        data = {
            "encodings": [e.tolist() for e in self._encodings],
            "labels": self._labels,
            "tolerance": self._tolerance,
        }
        np.save(path.replace(".yml", ".npy"), data, allow_pickle=True)

    def load(self, path: str) -> None:
        npy_path = path.replace(".yml", ".npy")
        if not os.path.exists(npy_path):
            return
        data = np.load(npy_path, allow_pickle=True).item()
        self._encodings = [np.array(e) for e in data["encodings"]]
        self._labels = data["labels"]
        self._tolerance = data.get("tolerance", self._tolerance)

    def name(self) -> str:
        return "dlib Face Recognition"

    def info(self) -> dict[str, Any]:
        return {
            "name": self.name(),
            "type": "dlib",
            "backend": "face_recognition",
            "available": DLIB_AVAILABLE,
            "params": {
                "tolerance": self._tolerance,
                "trained_faces": len(self._encodings),
            },
        }
