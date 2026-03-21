"""Core face detection and recognition engine adapted from reconocimiento-facial archetype."""

import base64
import logging
import os
import pickle
from typing import Optional

import cv2
import numpy as np
from PIL import Image

from app.core.config import settings, CASCADES_DIR
from app.models.base import FaceRecognitionModel

logger = logging.getLogger(__name__)


class FaceEngine:
    def __init__(self):
        cascade_path = os.path.join(CASCADES_DIR, settings.cascade_face)
        logger.info("Loading Haar cascade from: %s (exists=%s)", cascade_path, os.path.exists(cascade_path))
        if not os.path.exists(cascade_path):
            raise FileNotFoundError(
                f"Haar cascade not found at {cascade_path}. "
                f"CASCADES_DIR={CASCADES_DIR}"
            )
        self.face_cascade = cv2.CascadeClassifier(cascade_path)

        eye_cascade_path = os.path.join(CASCADES_DIR, settings.cascade_eye)
        if os.path.exists(eye_cascade_path):
            self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
        else:
            self.eye_cascade = None

        self._model: Optional[FaceRecognitionModel] = None
        self._labels: dict[int, str] = {}
        self._is_trained = False

    @property
    def model(self) -> Optional[FaceRecognitionModel]:
        return self._model

    @model.setter
    def model(self, m: FaceRecognitionModel):
        self._model = m
        self._try_load_model()

    def _try_load_model(self):
        """Attempt to load a previously trained model and labels from disk."""
        recognizer_path = os.path.join(settings.recognizers_dir, "training.yml")
        pickle_path = os.path.join(settings.pickles_dir, "model.pickle")

        if os.path.exists(recognizer_path) and os.path.exists(pickle_path):
            try:
                self._model.load(recognizer_path)
                with open(pickle_path, "rb") as f:
                    og_labels = pickle.load(f)
                self._labels = {v: k for k, v in og_labels.items()}
                self._is_trained = True
            except Exception:
                self._is_trained = False
        else:
            self._is_trained = False

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    @property
    def labels(self) -> dict[int, str]:
        return self._labels

    def detect_faces(self, image: np.ndarray) -> list[dict]:
        """Detect faces in an image, return list of bounding boxes."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
        )

        results = []
        for x, y, w, h in faces:
            face_info = {"x": int(x), "y": int(y), "w": int(w), "h": int(h)}

            if self._is_trained and self._model:
                roi_gray = gray[y : y + h, x : x + w]
                id_, conf = self._model.predict(roi_gray)
                if 4 <= conf <= 85:
                    face_info["label"] = self._labels.get(id_, "unknown")
                    face_info["confidence"] = round(float(conf), 2)
                else:
                    face_info["label"] = "unknown"
                    face_info["confidence"] = round(float(conf), 2)
            else:
                face_info["label"] = "unknown"
                face_info["confidence"] = 0.0

            results.append(face_info)

        return results

    def decode_base64_image(self, b64_string: str) -> np.ndarray:
        """Decode a base64 encoded image string to a numpy array."""
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def train(self) -> dict:
        """Train the recognizer using images in the images directory."""
        if not self._model:
            raise RuntimeError("No AI model configured")

        current_id = 0
        label_ids: dict[str, int] = {}
        y_labels: list[int] = []
        x_train: list[np.ndarray] = []

        for root, _dirs, files in os.walk(settings.images_dir):
            for file in files:
                if not file.lower().endswith((".png", ".jpg", ".jpeg")):
                    continue
                path = os.path.join(root, file)
                label = os.path.basename(root).replace(" ", "-").lower()

                if label not in label_ids:
                    label_ids[label] = current_id
                    current_id += 1

                id_ = label_ids[label]
                pil_image = Image.open(path).convert("L")
                final_image = pil_image.resize((550, 550), Image.LANCZOS)
                image_array = np.array(final_image, "uint8")

                faces = self.face_cascade.detectMultiScale(
                    image_array, scaleFactor=1.1, minNeighbors=5
                )
                for x, y, w, h in faces:
                    roi = image_array[y : y + h, x : x + w]
                    x_train.append(roi)
                    y_labels.append(id_)

        if not x_train:
            raise ValueError("No faces found in training images")

        with open(os.path.join(settings.pickles_dir, "model.pickle"), "wb") as f:
            pickle.dump(label_ids, f)

        self._model.train(x_train, np.array(y_labels))
        self._model.save(os.path.join(settings.recognizers_dir, "training.yml"))

        self._labels = {v: k for k, v in label_ids.items()}
        self._is_trained = True

        return {
            "labels": list(label_ids.keys()),
            "total_faces": len(x_train),
            "total_labels": len(label_ids),
        }

    def get_labels(self) -> list[str]:
        """List all known labels from the images directory."""
        labels = []
        if os.path.isdir(settings.images_dir):
            for entry in os.listdir(settings.images_dir):
                if os.path.isdir(os.path.join(settings.images_dir, entry)):
                    labels.append(entry)
        return labels

    def save_image(self, label: str, image_data: bytes, filename: str) -> str:
        """Save a training image under the given label directory."""
        label_dir = os.path.join(settings.images_dir, label.replace(" ", "-").lower())
        os.makedirs(label_dir, exist_ok=True)
        filepath = os.path.join(label_dir, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return filepath

    def get_images_for_label(self, label: str) -> list[str]:
        """List image filenames for a given label."""
        label_dir = os.path.join(settings.images_dir, label.replace(" ", "-").lower())
        if not os.path.isdir(label_dir):
            return []
        return [
            f for f in os.listdir(label_dir)
            if f.lower().endswith((".png", ".jpg", ".jpeg"))
        ]

    def delete_label_images(self, label: str) -> int:
        """Delete all images for a label. Returns count of deleted files."""
        import shutil
        label_dir = os.path.join(settings.images_dir, label.replace(" ", "-").lower())
        if not os.path.isdir(label_dir):
            return 0
        count = len(os.listdir(label_dir))
        shutil.rmtree(label_dir)
        return count
