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
from app.models.openvino_detector import OpenVINODetector

logger = logging.getLogger(__name__)


def _load_cascade(filename: str) -> Optional[cv2.CascadeClassifier]:
    path = os.path.join(CASCADES_DIR, filename)
    if os.path.exists(path):
        return cv2.CascadeClassifier(path)
    logger.warning("Cascade not found, skipping: %s", path)
    return None


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

        self.eye_cascade = _load_cascade(settings.cascade_eye)
        self.smile_cascade = _load_cascade(settings.cascade_smile)
        self.profile_cascade = _load_cascade(settings.cascade_profile)
        self.eye_glasses_cascade = _load_cascade(settings.cascade_eye_glasses)

        self._model: Optional[FaceRecognitionModel] = None
        self._labels: dict[int, str] = {}
        self._is_trained = False

        self._ovms_detector: Optional[OpenVINODetector] = None
        if settings.ovms_enabled and settings.ovms_rest_url:
            self._ovms_detector = OpenVINODetector(
                rest_url=settings.ovms_rest_url,
                model_name=settings.ovms_model_name,
                confidence_threshold=settings.ovms_confidence_threshold,
            )
            logger.info("OpenVINO detector configured: %s model=%s",
                        settings.ovms_rest_url, settings.ovms_model_name)

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

    @property
    def detection_method(self) -> str:
        return settings.detection_method

    @detection_method.setter
    def detection_method(self, method: str):
        settings.detection_method = method

    @property
    def ovms_detector(self) -> Optional[OpenVINODetector]:
        return self._ovms_detector

    @property
    def ovms_available(self) -> bool:
        return self._ovms_detector is not None and self._ovms_detector.available

    def _detect_opencv(self, gray: np.ndarray) -> list[tuple[int, int, int, int]]:
        faces = self.face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30),
        )
        return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]

    def _detect_openvino(self, image: np.ndarray) -> list[tuple[int, int, int, int]]:
        if not self._ovms_detector:
            raise RuntimeError("OpenVINO detector not configured")
        detections = self._ovms_detector.detect(image)
        return [(d["x"], d["y"], d["w"], d["h"]) for d in detections]

    def _recognize_face(self, gray: np.ndarray, x: int, y: int, w: int, h: int) -> dict:
        face_info: dict = {"x": x, "y": y, "w": w, "h": h}
        if self._is_trained and self._model:
            roi_gray = gray[y: y + h, x: x + w]
            id_, conf = self._model.predict(roi_gray)
            if 4 <= conf <= 85:
                face_info["label"] = self._labels.get(id_, "unknown")
            else:
                face_info["label"] = "unknown"
            face_info["confidence"] = round(float(conf), 2)
        else:
            face_info["label"] = "unknown"
            face_info["confidence"] = 0.0
        return face_info

    def detect_faces(self, image: np.ndarray) -> list[dict]:
        """Detect faces using the configured method (opencv or openvino), then recognize."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        method = settings.detection_method
        if method == "openvino" and self._ovms_detector:
            face_boxes = self._detect_openvino(image)
        else:
            face_boxes = self._detect_opencv(gray)

        results = []
        for x, y, w, h in face_boxes:
            face_info = self._recognize_face(gray, x, y, w, h)
            face_info["detection_method"] = method if method == "openvino" and self._ovms_detector else "opencv"
            results.append(face_info)

        return results

    def analyze_faces(self, image: np.ndarray) -> list[dict]:
        """Full facial analysis using all available cascades."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        method = settings.detection_method
        if method == "openvino" and self._ovms_detector:
            face_boxes = self._detect_openvino(image)
        else:
            face_boxes = self._detect_opencv(gray)

        results = []
        for x, y, w, h in face_boxes:
            roi_gray = gray[y : y + h, x : x + w]
            face_info: dict = {
                "x": x, "y": y, "w": w, "h": h,
                "features": {},
                "detection_method": method if method == "openvino" and self._ovms_detector else "opencv",
            }

            if self._is_trained and self._model:
                id_, conf = self._model.predict(roi_gray)
                if 4 <= conf <= 85:
                    face_info["label"] = self._labels.get(id_, "unknown")
                else:
                    face_info["label"] = "unknown"
                face_info["confidence"] = round(float(conf), 2)
            else:
                face_info["label"] = "unknown"
                face_info["confidence"] = 0.0

            if self.eye_cascade is not None:
                eyes = self.eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5)
                face_info["features"]["eyes_detected"] = len(eyes)

            if self.eye_glasses_cascade is not None:
                glasses = self.eye_glasses_cascade.detectMultiScale(
                    roi_gray, scaleFactor=1.1, minNeighbors=5,
                )
                face_info["features"]["glasses_detected"] = len(glasses) > 0

            if self.smile_cascade is not None:
                smiles = self.smile_cascade.detectMultiScale(
                    roi_gray, scaleFactor=1.8, minNeighbors=20, minSize=(25, 25),
                )
                face_info["features"]["smile_detected"] = len(smiles) > 0

            if self.profile_cascade is not None:
                profiles = self.profile_cascade.detectMultiScale(
                    roi_gray, scaleFactor=1.1, minNeighbors=3,
                )
                face_info["features"]["profile_face"] = len(profiles) > 0

            face_info["features"]["face_width"] = int(w)
            face_info["features"]["face_height"] = int(h)
            face_info["features"]["aspect_ratio"] = round(float(w) / float(h), 2)

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

        use_openvino = (
            settings.detection_method == "openvino"
            and self._ovms_detector is not None
        )

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

                if use_openvino:
                    color_img = cv2.imread(path)
                    if color_img is None:
                        continue
                    face_boxes = self._detect_openvino(color_img)
                    gray_img = cv2.cvtColor(color_img, cv2.COLOR_BGR2GRAY)
                    for x, y, w, h in face_boxes:
                        roi = gray_img[y: y + h, x: x + w]
                        x_train.append(roi)
                        y_labels.append(id_)
                else:
                    pil_image = Image.open(path).convert("L")
                    final_image = pil_image.resize((550, 550), Image.LANCZOS)
                    image_array = np.array(final_image, "uint8")
                    faces = self.face_cascade.detectMultiScale(
                        image_array, scaleFactor=1.1, minNeighbors=5
                    )
                    for x, y, w, h in faces:
                        roi = image_array[y: y + h, x: x + w]
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
            "detection_method": "openvino" if use_openvino else "opencv",
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
