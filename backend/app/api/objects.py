from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/objects", tags=["objects"])


class DetectRequest(BaseModel):
    image: str
    confidence: Optional[float] = None


class DetectedObject(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    x: int
    y: int
    w: int
    h: int


class DetectResponse(BaseModel):
    objects: list[DetectedObject]
    count: int
    summary: dict[str, int]


@router.post("/detect", response_model=DetectResponse)
async def detect_objects(req: DetectRequest):
    from app.main import face_engine, object_detector

    if object_detector is None or not object_detector.available:
        raise HTTPException(status_code=503, detail="Object detector not available")

    try:
        img = face_engine.decode_base64_image(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    detections = object_detector.detect(img, confidence=req.confidence)

    summary: dict[str, int] = {}
    for d in detections:
        name = d["class_name"]
        summary[name] = summary.get(name, 0) + 1

    return DetectResponse(
        objects=[DetectedObject(**d) for d in detections],
        count=len(detections),
        summary=summary,
    )


@router.get("/classes")
async def list_classes():
    from app.main import object_detector
    from app.models.object_detector import COCO_CLASSES

    return {
        "classes": COCO_CLASSES,
        "count": len(COCO_CLASSES),
        "detector": object_detector.info() if object_detector else None,
    }


@router.get("/status")
async def detector_status():
    from app.main import object_detector

    if object_detector is None:
        return {"available": False, "reason": "Object detector not initialized"}

    return object_detector.info()
