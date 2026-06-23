import httpx
from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness():
    return {"status": "ok", "app": settings.app_name, "version": settings.app_version}


@router.get("/ready")
async def readiness():
    from app.main import face_engine, object_detector

    result = {
        "status": "ok",
        "model_loaded": face_engine.is_trained,
        "ai_model": settings.ai_model,
        "detection_method": settings.detection_method,
        "chat_enabled": settings.chat_enabled,
        "ovms_enabled": settings.ovms_enabled,
        "object_detection": object_detector.available if object_detector else False,
        "ppe_enabled": settings.ppe_enabled,
    }

    if settings.ovms_enabled and settings.ovms_rest_url:
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                resp = await client.get(
                    f"{settings.ovms_rest_url}/v2/models/{settings.ovms_model_name}"
                )
                result["ovms_status"] = "connected" if resp.status_code == 200 else "error"
        except Exception:
            result["ovms_status"] = "unreachable"

    if settings.ppe_enabled and settings.ppe_endpoint:
        ppe_info = {"endpoint": settings.ppe_endpoint, "status": "unknown"}
        try:
            async with httpx.AsyncClient(timeout=5.0, verify=False) as client:
                resp = await client.get(f"{settings.ppe_endpoint}/health")
                if resp.status_code == 200:
                    health = resp.json()
                    ppe_info["status"] = "connected"
                    ppe_info["model_name"] = health.get("model_name", health.get("model", ""))
                    ppe_info["model_loaded"] = health.get("model_loaded", True)
                    ppe_info["classes"] = health.get("classes", [])
                    v2 = await client.get(f"{settings.ppe_endpoint}/v2/models/yolo-ppe/ready")
                    ppe_info["kserve_v2"] = v2.status_code == 200
                else:
                    ppe_info["status"] = "error"
        except Exception:
            ppe_info["status"] = "unreachable"
        result["ppe_serving"] = ppe_info

    return result
