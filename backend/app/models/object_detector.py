"""Object detection using YOLOv4-tiny with OpenCV DNN.

Pre-trained on COCO dataset (80 object classes). Model files are
downloaded lazily on first use and cached in the models directory.
"""

import logging
import os
import urllib.request
from typing import Optional

import cv2
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

COCO_CLASSES = [
    "person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa",
    "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]

_YOLO_CFG_URL = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"
_YOLO_WEIGHTS_URL = "https://github.com/AlexeyAB/darknet/releases/download/yolov4/yolov4-tiny.weights"

_INPUT_SIZE = 416
_CONF_THRESHOLD = 0.4
_NMS_THRESHOLD = 0.4


class ObjectDetector:
    """Detects objects using YOLOv4-tiny (80 COCO classes) via OpenCV DNN."""

    def __init__(self, models_dir: Optional[str] = None, confidence: float = _CONF_THRESHOLD):
        self._models_dir = models_dir or os.path.join(settings.models_dir, "yolo")
        self._confidence = confidence
        self._net: Optional[cv2.dnn.Net] = None
        self._output_layers: list[str] = []
        self._available: Optional[bool] = None

    @property
    def available(self) -> bool:
        if self._available is None:
            self._try_load()
        return self._available or False

    @property
    def classes(self) -> list[str]:
        return list(COCO_CLASSES)

    def _model_paths(self) -> tuple[str, str]:
        cfg = os.path.join(self._models_dir, "yolov4-tiny.cfg")
        weights = os.path.join(self._models_dir, "yolov4-tiny.weights")
        return cfg, weights

    def _download_models(self) -> bool:
        os.makedirs(self._models_dir, exist_ok=True)
        cfg_path, weights_path = self._model_paths()

        try:
            if not os.path.exists(cfg_path):
                logger.info("Downloading YOLOv4-tiny config...")
                urllib.request.urlretrieve(_YOLO_CFG_URL, cfg_path)

            if not os.path.exists(weights_path):
                logger.info("Downloading YOLOv4-tiny weights (~24MB)...")
                urllib.request.urlretrieve(_YOLO_WEIGHTS_URL, weights_path)

            return True
        except Exception as e:
            logger.error("Failed to download YOLO model files: %s", e)
            return False

    def _try_load(self):
        cfg_path, weights_path = self._model_paths()

        if not os.path.exists(cfg_path) or not os.path.exists(weights_path):
            if not self._download_models():
                self._available = False
                return

        try:
            self._net = cv2.dnn.readNetFromDarknet(cfg_path, weights_path)
            self._net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
            self._net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

            layer_names = self._net.getLayerNames()
            out_indices = self._net.getUnconnectedOutLayers()
            self._output_layers = [layer_names[i - 1] for i in out_indices.flatten()]

            self._available = True
            logger.info("YOLOv4-tiny loaded (%d COCO classes)", len(COCO_CLASSES))
        except Exception as e:
            logger.error("Failed to load YOLO model: %s", e)
            self._available = False

    def detect(self, image: np.ndarray, confidence: Optional[float] = None) -> list[dict]:
        if not self.available or self._net is None:
            raise RuntimeError("Object detector not available")

        conf_thresh = confidence or self._confidence
        h, w = image.shape[:2]

        blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (_INPUT_SIZE, _INPUT_SIZE),
                                     swapRB=True, crop=False)
        self._net.setInput(blob)
        outputs = self._net.forward(self._output_layers)

        boxes: list[list[int]] = []
        confidences: list[float] = []
        class_ids: list[int] = []

        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = int(np.argmax(scores))
                conf = float(scores[class_id])
                if conf < conf_thresh:
                    continue

                center_x = int(detection[0] * w)
                center_y = int(detection[1] * h)
                bw = int(detection[2] * w)
                bh = int(detection[3] * h)
                x = max(0, center_x - bw // 2)
                y = max(0, center_y - bh // 2)

                boxes.append([x, y, bw, bh])
                confidences.append(conf)
                class_ids.append(class_id)

        indices = cv2.dnn.NMSBoxes(boxes, confidences, conf_thresh, _NMS_THRESHOLD)

        results: list[dict] = []
        if len(indices) > 0:
            for i in indices.flatten():
                bx, by, bw, bh = boxes[i]
                cid = class_ids[i]
                results.append({
                    "class_id": cid,
                    "class_name": COCO_CLASSES[cid] if cid < len(COCO_CLASSES) else f"class_{cid}",
                    "confidence": round(confidences[i], 4),
                    "x": bx, "y": by, "w": bw, "h": bh,
                })

        return results

    def info(self) -> dict:
        return {
            "name": "YOLOv4-tiny",
            "type": "opencv_dnn",
            "classes_count": len(COCO_CLASSES),
            "available": self.available,
            "confidence_threshold": self._confidence,
        }
