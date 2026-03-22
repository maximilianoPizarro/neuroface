from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["analysis"])


class AnalyzeRequest(BaseModel):
    image: str


@router.post("/analyze")
async def analyze_faces(req: AnalyzeRequest):
    from app.main import face_engine

    try:
        img = face_engine.decode_base64_image(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    faces = face_engine.analyze_faces(img)
    return {
        "faces": faces,
        "count": len(faces),
        "cascades_loaded": {
            "face": face_engine.face_cascade is not None,
            "eye": face_engine.eye_cascade is not None,
            "smile": face_engine.smile_cascade is not None,
            "profile": face_engine.profile_cascade is not None,
            "eye_glasses": face_engine.eye_glasses_cascade is not None,
        },
    }
