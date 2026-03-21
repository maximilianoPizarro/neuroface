from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.dlib_model import DLIB_AVAILABLE

router = APIRouter(prefix="/models", tags=["models"])


class ModelConfigUpdate(BaseModel):
    ai_model: str


@router.get("/available")
async def list_available_models():
    models = [
        {
            "type": "lbph",
            "name": "OpenCV LBPH",
            "available": True,
            "description": "Local Binary Patterns Histograms — fast, lightweight, default model.",
        },
        {
            "type": "dlib",
            "name": "dlib Face Recognition",
            "available": DLIB_AVAILABLE,
            "description": "128-dimensional face encodings via dlib. Requires face_recognition package.",
        },
    ]
    return {"models": models}


@router.get("/config")
async def get_model_config():
    from app.main import face_engine
    from app.core.config import settings

    model_info = face_engine.model.info() if face_engine.model else {}
    return {
        "ai_model": settings.ai_model,
        "is_trained": face_engine.is_trained,
        "model_info": model_info,
    }


@router.put("/config")
async def update_model_config(config: ModelConfigUpdate):
    from app.main import face_engine, _init_model
    from app.core.config import settings

    if config.ai_model not in ("lbph", "dlib"):
        raise HTTPException(status_code=400, detail=f"Unknown model: {config.ai_model}")

    if config.ai_model == "dlib" and not DLIB_AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="dlib model is not available. Install face_recognition package.",
        )

    settings.ai_model = config.ai_model
    _init_model(face_engine, config.ai_model)

    return {
        "status": "ok",
        "ai_model": config.ai_model,
        "model_info": face_engine.model.info() if face_engine.model else {},
    }
