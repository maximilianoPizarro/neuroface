"""OpenVINO Model Server face detector via KServe V2 REST API.

Uses face-detection-retail-0005 (or compatible model) deployed on
OpenShift AI / ModelMesh. Accessible within the cluster without token
via the modelmesh-serving REST proxy on port 8008.
"""

import logging
from typing import Optional

import cv2
import httpx
import numpy as np

logger = logging.getLogger(__name__)

_INPUT_H = 300
_INPUT_W = 300


class OpenVINODetector:
    """Calls an OpenVINO Model Server to detect faces in images."""

    def __init__(self, rest_url: str, model_name: str, confidence_threshold: float = 0.5):
        self._rest_url = rest_url.rstrip("/")
        self._model_name = model_name
        self._confidence_threshold = confidence_threshold
        self._available: Optional[bool] = None
        self._input_name: Optional[str] = None
        self._output_name: Optional[str] = None

    @property
    def available(self) -> bool:
        if self._available is None:
            self._fetch_metadata()
        return self._available or False

    def _fetch_metadata(self):
        try:
            with httpx.Client(timeout=5.0, verify=False) as client:
                resp = client.get(f"{self._rest_url}/v2/models/{self._model_name}")
                if resp.status_code == 200:
                    meta = resp.json()
                    inputs = meta.get("inputs", [])
                    outputs = meta.get("outputs", [])
                    if inputs:
                        self._input_name = inputs[0]["name"]
                    if outputs:
                        self._output_name = outputs[0]["name"]
                    logger.info("OVMS model metadata: input=%s output=%s",
                                self._input_name, self._output_name)
                    self._available = True
                else:
                    self._available = False
        except Exception as e:
            logger.warning("OVMS not reachable at %s: %s", self._rest_url, e)
            self._available = False

    def _preprocess(self, image: np.ndarray) -> np.ndarray:
        resized = cv2.resize(image, (_INPUT_W, _INPUT_H))
        blob = resized.astype(np.float32)
        blob = blob.transpose(2, 0, 1)
        blob = np.expand_dims(blob, axis=0)
        return blob

    def _parse_detections(self, output_data: list, orig_h: int, orig_w: int) -> list[dict]:
        faces = []
        arr = np.array(output_data).reshape(-1, 7)
        for det in arr:
            confidence = float(det[2])
            if confidence < self._confidence_threshold:
                continue

            x_min = max(0, int(det[3] * orig_w))
            y_min = max(0, int(det[4] * orig_h))
            x_max = min(orig_w, int(det[5] * orig_w))
            y_max = min(orig_h, int(det[6] * orig_h))

            w = x_max - x_min
            h = y_max - y_min
            if w < 10 or h < 10:
                continue

            faces.append({
                "x": x_min, "y": y_min, "w": w, "h": h,
                "detection_confidence": round(confidence, 4),
            })
        return faces

    def detect(self, image: np.ndarray) -> list[dict]:
        """Detect faces using OVMS REST API (KServe V2 protocol)."""
        orig_h, orig_w = image.shape[:2]
        blob = self._preprocess(image)

        if self._input_name is None:
            self._fetch_metadata()

        payload = {
            "inputs": [{
                "name": self._input_name or "data",
                "shape": list(blob.shape),
                "datatype": "FP32",
                "data": blob.flatten().tolist(),
            }]
        }

        try:
            with httpx.Client(timeout=30.0, verify=False) as client:
                resp = client.post(
                    f"{self._rest_url}/v2/models/{self._model_name}/infer",
                    json=payload,
                )
                resp.raise_for_status()
                result = resp.json()
        except httpx.HTTPStatusError as e:
            logger.error("OVMS inference error %s: %s", e.response.status_code, e.response.text[:300])
            raise RuntimeError(f"OVMS inference failed: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error("Cannot reach OVMS: %s", e)
            raise RuntimeError(f"Cannot reach OVMS: {e}")

        output = result.get("outputs", [{}])[0]
        output_data = output.get("data", [])
        return self._parse_detections(output_data, orig_h, orig_w)

    def info(self) -> dict:
        return {
            "name": "OpenVINO Model Server",
            "type": "openvino",
            "model_name": self._model_name,
            "rest_url": self._rest_url,
            "available": self.available,
            "confidence_threshold": self._confidence_threshold,
        }
