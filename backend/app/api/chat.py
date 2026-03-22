import json
import logging
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    image: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    analysis: Optional[dict] = None


@router.get("/status")
async def chat_status():
    return {
        "enabled": settings.chat_enabled,
        "model_endpoint": settings.chat_model_endpoint or None,
        "model_name": settings.chat_model_name or None,
    }


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not settings.chat_enabled:
        raise HTTPException(status_code=404, detail="Chat feature is disabled")

    if not settings.chat_model_endpoint:
        raise HTTPException(status_code=503, detail="No LLM endpoint configured")

    analysis = None
    context_text = ""

    if req.image:
        from app.main import face_engine

        try:
            img = face_engine.decode_base64_image(req.image)
            faces = face_engine.analyze_faces(img)
            analysis = {"faces": faces, "count": len(faces)}
            context_text = _build_face_context(faces)
        except Exception as e:
            logger.warning("Failed to analyze image for chat: %s", e)
            context_text = "(Image analysis failed)"

    user_content = req.message
    if context_text:
        user_content = (
            f"Facial analysis data:\n{context_text}\n\n"
            f"User question: {req.message}"
        )

    messages = [
        {"role": "system", "content": settings.chat_system_prompt},
        {"role": "user", "content": user_content},
    ]

    endpoint = settings.chat_model_endpoint.rstrip("/")
    url = f"{endpoint}/v1/chat/completions"

    headers = {"Content-Type": "application/json"}
    if settings.chat_api_key:
        headers["Authorization"] = f"Bearer {settings.chat_api_key}"

    payload = {
        "messages": messages,
        "max_tokens": settings.chat_max_tokens,
        "temperature": 0.7,
    }
    if settings.chat_model_name:
        payload["model"] = settings.chat_model_name

    try:
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        logger.error("LLM endpoint returned %s: %s", e.response.status_code, e.response.text)
        raise HTTPException(
            status_code=502,
            detail=f"LLM endpoint error: {e.response.status_code}",
        )
    except httpx.RequestError as e:
        logger.error("Failed to reach LLM endpoint: %s", e)
        raise HTTPException(status_code=502, detail=f"Cannot reach LLM endpoint: {e}")

    try:
        answer = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        logger.error("Unexpected LLM response format: %s", json.dumps(data)[:500])
        raise HTTPException(status_code=502, detail="Unexpected response from LLM")

    return ChatResponse(response=answer, analysis=analysis)


def _build_face_context(faces: list[dict]) -> str:
    if not faces:
        return "No faces detected in the image."

    lines = [f"Detected {len(faces)} face(s):\n"]
    for i, face in enumerate(faces, 1):
        features = face.get("features", {})
        parts = [f"Face {i}: position=({face['x']},{face['y']}), size={face['w']}x{face['h']}"]

        if face.get("label") and face["label"] != "unknown":
            parts.append(f"  Identified as: {face['label']} (confidence: {face.get('confidence', 0)})")

        if "eyes_detected" in features:
            parts.append(f"  Eyes detected: {features['eyes_detected']}")
        if "glasses_detected" in features:
            parts.append(f"  Wearing glasses: {'yes' if features['glasses_detected'] else 'no'}")
        if "smile_detected" in features:
            parts.append(f"  Smiling: {'yes' if features['smile_detected'] else 'no'}")
        if "profile_face" in features:
            parts.append(f"  Profile/side view: {'yes' if features['profile_face'] else 'no'}")
        if "aspect_ratio" in features:
            parts.append(f"  Face aspect ratio: {features['aspect_ratio']}")

        lines.append("\n".join(parts))

    return "\n".join(lines)
