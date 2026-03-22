from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.models.dlib_model import DLIB_AVAILABLE

router = APIRouter(prefix="/models", tags=["models"])


class ModelConfigUpdate(BaseModel):
    ai_model: str


@router.get("/available")
async def list_available_models():
    dlib_available = DLIB_AVAILABLE and settings.dlib_enabled
    models_list = [
        {
            "type": "lbph",
            "name": "OpenCV LBPH",
            "available": True,
            "description": "Local Binary Patterns Histograms — fast, lightweight, default model.",
        },
        {
            "type": "dlib",
            "name": "dlib Face Recognition",
            "available": dlib_available,
            "enabled": settings.dlib_enabled,
            "description": "128-dimensional face encodings via dlib. Requires face_recognition package.",
        },
    ]
    return {"models": models_list}


@router.get("/config")
async def get_model_config():
    from app.main import face_engine

    model_info = face_engine.model.info() if face_engine.model else {}
    return {
        "ai_model": settings.ai_model,
        "is_trained": face_engine.is_trained,
        "model_info": model_info,
        "chat_enabled": settings.chat_enabled,
    }


@router.put("/config")
async def update_model_config(config: ModelConfigUpdate):
    from app.main import face_engine, _init_model

    if config.ai_model not in ("lbph", "dlib"):
        raise HTTPException(status_code=400, detail=f"Unknown model: {config.ai_model}")

    if config.ai_model == "dlib":
        if not settings.dlib_enabled:
            raise HTTPException(
                status_code=400,
                detail="dlib is disabled. Set NEUROFACE_DLIB_ENABLED=true to enable it.",
            )
        if not DLIB_AVAILABLE:
            raise HTTPException(
                status_code=400,
                detail="dlib package is not installed in this image.",
            )

    settings.ai_model = config.ai_model
    _init_model(face_engine, config.ai_model)

    return {
        "status": "ok",
        "ai_model": config.ai_model,
        "model_info": face_engine.model.info() if face_engine.model else {},
    }
