from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@router.get("/ready")
async def readiness():
    from app.main import face_engine

    return {
        "status": "ok",
        "model_loaded": face_engine.is_trained,
        "ai_model": settings.ai_model,
    }
