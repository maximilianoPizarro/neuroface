"""YOLO PPE Serving — KServe v1 + v2 inference server.

Serves a YOLOv8 PPE detection model via:
  - /v1/predict (raw JPEG, backward compat with neuroface backend)
  - /v2/models/yolo-ppe/infer (KServe v2 protocol)
  - /v2/models/yolo-ppe/ready (model readiness)
  - /health (liveness)
"""

import io
import logging
import os
import time
import base64
from typing import Optional

import numpy as np
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ppe-serving")

MODEL_PATH = os.environ.get("MODEL_PATH", "/mnt/models/best.pt")
MODEL_NAME = os.environ.get("MODEL_NAME", "yolo-ppe")
CONFIDENCE = float(os.environ.get("CONFIDENCE", "0.5"))
CLUSTER_NAME = os.environ.get(
    "CLUSTER_NAME",
    os.environ.get("NEUROFACE_CLUSTER_NAME", "unknown"),
)

app = FastAPI(title="YOLO PPE Serving", version="1.5.1")

_model = None
_model_ready = False
_class_names: list[str] = []


def _load_model():
    global _model, _model_ready, _class_names
    if _model is not None:
        return
    from ultralytics import YOLO
    log.info("Loading model from %s ...", MODEL_PATH)
    start = time.time()
    _model = YOLO(MODEL_PATH)
    _class_names = list(_model.names.values()) if _model.names else []
    elapsed = time.time() - start
    _model_ready = True
    log.info("Model loaded in %.1fs — classes: %s", elapsed, _class_names)


@app.on_event("startup")
async def startup():
    if os.path.exists(MODEL_PATH):
        _load_model()
    else:
        log.warning("Model not found at %s — will retry on first request", MODEL_PATH)


def _ensure_model():
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(503, f"Model not found: {MODEL_PATH}")
        _load_model()


def _run_inference(img: np.ndarray, conf: float) -> list[dict]:
    """Run YOLO inference and return list of detection dicts."""
    _ensure_model()
    results = _model(img, conf=conf, verbose=False)
    detections = []
    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue
        for i in range(len(boxes)):
            x1, y1, x2, y2 = boxes.xyxy[i].tolist()
            cls_id = int(boxes.cls[i])
            score = float(boxes.conf[i])
            detections.append({
                "class_id": cls_id,
                "class_name": _class_names[cls_id] if cls_id < len(_class_names) else f"class_{cls_id}",
                "confidence": round(score, 4),
                "bbox": {"x1": round(x1, 1), "y1": round(y1, 1),
                         "x2": round(x2, 1), "y2": round(y2, 1)},
            })
    return detections


# ─────────────────────────────── Health ───────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "cluster": CLUSTER_NAME,
        "model_name": MODEL_NAME,
        "model_path": MODEL_PATH,
        "model_loaded": _model_ready,
        "classes": _class_names,
    }


# ─────────────────────────────── KServe V1 ───────────────────────────

@app.post("/v1/predict")
async def v1_predict(request: Request):
    """KServe v1 endpoint — accepts raw JPEG bytes."""
    conf = float(request.headers.get("X-Confidence", str(CONFIDENCE)))
    body = await request.body()
    if not body:
        raise HTTPException(400, "Empty body — expected JPEG image bytes")

    img = np.array(Image.open(io.BytesIO(body)).convert("RGB"))
    detections = _run_inference(img, conf)
    return {"detections": detections, "count": len(detections)}


# ─────────────────────────────── KServe V2 ───────────────────────────

@app.get(f"/v2/models/{MODEL_NAME}")
async def v2_model_metadata():
    """KServe v2 model metadata."""
    _ensure_model()
    return {
        "name": MODEL_NAME,
        "versions": ["1"],
        "platform": "ultralytics-yolov8",
        "inputs": [{"name": "image", "datatype": "BYTES", "shape": [-1]}],
        "outputs": [{"name": "detections", "datatype": "BYTES", "shape": [-1]}],
    }


@app.get(f"/v2/models/{MODEL_NAME}/ready")
async def v2_model_ready():
    """KServe v2 model readiness."""
    if not _model_ready:
        _ensure_model()
    if _model_ready:
        return Response(status_code=200)
    raise HTTPException(503, "Model not ready")


@app.post(f"/v2/models/{MODEL_NAME}/infer")
async def v2_infer(request: Request):
    """KServe v2 inference — accepts application/octet-stream (raw JPEG)
    or JSON payload with base64 image data.
    """
    content_type = request.headers.get("content-type", "")
    conf = float(request.headers.get("X-Confidence", str(CONFIDENCE)))

    if "octet-stream" in content_type:
        body = await request.body()
        if not body:
            raise HTTPException(400, "Empty body")
        img = np.array(Image.open(io.BytesIO(body)).convert("RGB"))
    elif "json" in content_type:
        payload = await request.json()
        inputs = payload.get("inputs", [])
        if not inputs:
            raise HTTPException(400, "No 'inputs' field in JSON payload")
        img_input = inputs[0]
        data = img_input.get("data", [])
        if not data:
            raise HTTPException(400, "No 'data' in first input tensor")
        img_b64 = data[0] if isinstance(data, list) else data
        if isinstance(img_b64, str):
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(img_b64)
        else:
            img_bytes = bytes(data)
        img = np.array(Image.open(io.BytesIO(img_bytes)).convert("RGB"))
    else:
        raise HTTPException(415, f"Unsupported Content-Type: {content_type}")

    detections = _run_inference(img, conf)

    return {
        "model_name": MODEL_NAME,
        "model_version": "1",
        "id": f"infer-{int(time.time()*1000)}",
        "outputs": [
            {
                "name": "detections",
                "datatype": "BYTES",
                "shape": [len(detections)],
                "data": detections,
            }
        ],
    }


@app.get("/v2/health/live")
async def v2_health_live():
    return Response(status_code=200)


@app.get("/v2/health/ready")
async def v2_health_ready():
    if _model_ready:
        return Response(status_code=200)
    raise HTTPException(503, "Model not ready")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
