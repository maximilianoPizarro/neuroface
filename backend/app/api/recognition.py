from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(tags=["recognition"])


class RecognizeRequest(BaseModel):
    image: str


class FaceResult(BaseModel):
    x: int
    y: int
    w: int
    h: int
    label: str
    confidence: float
    detection_method: Optional[str] = None


class RecognizeResponse(BaseModel):
    faces: list[FaceResult]
    count: int
    detection_method: str


@router.post("/recognize", response_model=RecognizeResponse)
async def recognize_faces(req: RecognizeRequest):
    from app.main import face_engine

    try:
        img = face_engine.decode_base64_image(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    faces = face_engine.detect_faces(img)
    return RecognizeResponse(
        faces=[FaceResult(**f) for f in faces],
        count=len(faces),
        detection_method=settings.detection_method,
    )
