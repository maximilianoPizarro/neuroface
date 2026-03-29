from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.models.dlib_model import DLIB_AVAILABLE

router = APIRouter(prefix="/models", tags=["models"])


class ModelConfigUpdate(BaseModel):
    ai_model: str


class DetectionMethodUpdate(BaseModel):
    detection_method: str


@router.get("/available")
async def list_available_models():
    from app.main import face_engine

    dlib_available = DLIB_AVAILABLE and settings.dlib_enabled
    ovms_available = face_engine.ovms_available

    models_list = [
        {
            "type": "lbph",
            "name": "OpenCV LBPH",
            "available": True,
            "description": "Local Binary Patterns Histograms - fast, lightweight, default model.",
        },
        {
            "type": "dlib",
            "name": "dlib Face Recognition",
            "available": dlib_available,
            "enabled": settings.dlib_enabled,
            "description": "128-dimensional face encodings via dlib. Requires face_recognition package.",
        },
    ]

    detection_methods = [
        {
            "type": "opencv",
            "name": "OpenCV Haar Cascades",
            "available": True,
            "description": "Local face detection using Haar cascade classifiers. Fast, runs on CPU.",
        },
        {
            "type": "openvino",
            "name": "OpenVINO Model Server",
            "available": ovms_available,
            "enabled": settings.ovms_enabled,
            "description": "Remote face detection via OpenVINO Model Server (face-detection-retail-0005). Runs on OpenShift AI.",
            "model_name": settings.ovms_model_name if settings.ovms_enabled else None,
            "endpoint": settings.ovms_rest_url if settings.ovms_enabled else None,
        },
    ]

    return {
        "models": models_list,
        "detection_methods": detection_methods,
    }


@router.get("/config")
async def get_model_config():
    from app.main import face_engine

    model_info = face_engine.model.info() if face_engine.model else {}
    ovms_info = face_engine.ovms_detector.info() if face_engine.ovms_detector else None

    return {
        "ai_model": settings.ai_model,
        "detection_method": settings.detection_method,
        "is_trained": face_engine.is_trained,
        "model_info": model_info,
        "ovms_info": ovms_info,
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
        "detection_method": settings.detection_method,
        "is_trained": face_engine.is_trained,
        "model_info": face_engine.model.info() if face_engine.model else {},
    }


@router.put("/detection")
async def update_detection_method(config: DetectionMethodUpdate):
    from app.main import face_engine

    if config.detection_method not in ("opencv", "openvino"):
        raise HTTPException(status_code=400, detail=f"Unknown detection method: {config.detection_method}")

    if config.detection_method == "openvino":
        if not settings.ovms_enabled:
            raise HTTPException(
                status_code=400,
                detail="OpenVINO is not enabled. Set NEUROFACE_OVMS_ENABLED=true.",
            )
        if not face_engine.ovms_available:
            raise HTTPException(
                status_code=503,
                detail="OpenVINO Model Server is not reachable. Check OVMS deployment.",
            )

    face_engine.detection_method = config.detection_method

    return {
        "status": "ok",
        "detection_method": config.detection_method,
        "ovms_info": face_engine.ovms_detector.info() if face_engine.ovms_detector else None,
    }
