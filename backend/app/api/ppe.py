"""PPE (Personal Protective Equipment) safety detection via external YOLO serving endpoint.

Forwards webcam frames (base64) to a remote YOLO PPE serving API and classifies
compliance based on expected PPE classes. Optionally calls Granite LLM for
natural language safety analysis and publishes events to Kafka.
"""

import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/ppe", tags=["ppe"])
log = logging.getLogger("ppe")

_client: Optional[httpx.AsyncClient] = None
_producer = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def _get_producer():
    global _producer
    if _producer is not None:
        return _producer
    if not settings.ppe_kafka_enabled or not settings.ppe_kafka_bootstrap:
        return None
    try:
        from confluent_kafka import Producer

        conf = {
            "bootstrap.servers": settings.ppe_kafka_bootstrap,
            "security.protocol": "SASL_SSL",
            "sasl.mechanism": "SCRAM-SHA-512",
            "sasl.username": settings.ppe_kafka_user,
            "sasl.password": settings.ppe_kafka_password,
        }
        ca = settings.ppe_kafka_ca_cert
        if ca and os.path.isfile(ca):
            conf["ssl.ca.location"] = ca
        _producer = Producer(conf)
        log.info("Kafka producer initialised -> %s", settings.ppe_kafka_topic)
        return _producer
    except Exception as exc:
        log.warning("Kafka producer init failed: %s", exc)
        return None


class PpeDetectRequest(BaseModel):
    image: str
    confidence: Optional[float] = None


class PpeBbox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class PpeDetection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: PpeBbox


class PpeDetectResponse(BaseModel):
    objects: list[PpeDetection]
    count: int
    summary: dict[str, int]
    ppe_status: str
    person_count: int
    present_ppe: list[str]
    missing_ppe: list[str]
    expected_ppe: list[str]
    llm_analysis: Optional[str] = None


@router.get("/status")
async def ppe_status():
    if not settings.ppe_enabled or not settings.ppe_endpoint:
        return {
            "enabled": False,
            "endpoint": None,
            "expected_ppe": [],
        }

    client = _get_client()
    try:
        resp = await client.get(f"{settings.ppe_endpoint}/health")
        health = resp.json()
        reachable = resp.status_code == 200
    except Exception:
        health = {}
        reachable = False

    return {
        "enabled": True,
        "endpoint": settings.ppe_endpoint,
        "reachable": reachable,
        "expected_ppe": [c.strip() for c in settings.ppe_classes.split(",")],
        "yolo_health": health,
        "kafka_enabled": settings.ppe_kafka_enabled,
        "kafka_topic": settings.ppe_kafka_topic if settings.ppe_kafka_enabled else None,
    }


@router.post("/detect", response_model=PpeDetectResponse)
async def ppe_detect(req: PpeDetectRequest):
    if not settings.ppe_enabled or not settings.ppe_endpoint:
        raise HTTPException(status_code=503, detail="PPE detection not enabled")

    from app.main import face_engine

    try:
        img = face_engine.decode_base64_image(req.image)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")

    import cv2
    _, buf = cv2.imencode(".jpg", img)
    img_bytes = buf.tobytes()

    client = _get_client()
    conf = req.confidence or settings.ppe_confidence
    try:
        resp = await client.post(
            f"{settings.ppe_endpoint}/v1/predict",
            content=img_bytes,
            headers={
                "Content-Type": "application/octet-stream",
                "X-Confidence": str(conf),
            },
        )
        resp.raise_for_status()
        result = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"YOLO serving error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Cannot reach YOLO PPE serving: {e}")

    detections = result.get("detections", [])
    expected = [c.strip() for c in settings.ppe_classes.split(",")]
    detected_classes = {d["class_name"].lower() for d in detections}
    person_count = sum(1 for d in detections if d["class_name"] == "person")
    present_ppe = [c for c in expected if c.lower() in detected_classes]
    missing_ppe = [c for c in expected if c.lower() not in detected_classes]

    if person_count == 0:
        ppe_status = "no_persons"
    elif not missing_ppe:
        ppe_status = "compliant"
    else:
        ppe_status = "violation"

    summary: dict[str, int] = {}
    for d in detections:
        name = d["class_name"]
        summary[name] = summary.get(name, 0) + 1

    objects = []
    for d in detections:
        bbox = d.get("bbox", {})
        objects.append(PpeDetection(
            class_id=d["class_id"],
            class_name=d["class_name"],
            confidence=d["confidence"],
            bbox=PpeBbox(
                x1=bbox.get("x1", 0),
                y1=bbox.get("y1", 0),
                x2=bbox.get("x2", 0),
                y2=bbox.get("y2", 0),
            ),
        ))

    llm_analysis = None
    if ppe_status == "violation" and settings.chat_enabled and settings.chat_model_endpoint:
        llm_analysis = await _call_llm_for_ppe(detections, person_count, expected)

    _publish_to_kafka(
        ppe_status=ppe_status,
        person_count=person_count,
        expected=expected,
        present_ppe=present_ppe,
        missing_ppe=missing_ppe,
        detections=detections,
        llm_analysis=llm_analysis,
    )

    return PpeDetectResponse(
        objects=objects,
        count=len(objects),
        summary=summary,
        ppe_status=ppe_status,
        person_count=person_count,
        present_ppe=present_ppe,
        missing_ppe=missing_ppe,
        expected_ppe=expected,
        llm_analysis=llm_analysis,
    )


def _publish_to_kafka(
    *,
    ppe_status: str,
    person_count: int,
    expected: list[str],
    present_ppe: list[str],
    missing_ppe: list[str],
    detections: list[dict],
    llm_analysis: Optional[str],
) -> None:
    producer = _get_producer()
    if producer is None:
        return
    event = {
        "event_type": "ppe_compliance_check",
        "source": "neuroface-ppe-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ppe_status": ppe_status,
        "person_count": person_count,
        "expected_ppe": expected,
        "present_ppe": present_ppe,
        "missing_ppe": missing_ppe,
        "detections": detections,
    }
    if llm_analysis:
        event["llm_analysis"] = llm_analysis
    try:
        producer.produce(
            settings.ppe_kafka_topic,
            value=json.dumps(event).encode("utf-8"),
            key=ppe_status.encode("utf-8"),
        )
        producer.poll(0)
    except Exception as exc:
        log.warning("Kafka produce failed: %s", exc)


async def _call_llm_for_ppe(
    detections: list[dict], person_count: int, expected: list[str]
) -> Optional[str]:
    detected_objects = [d["class_name"] for d in detections]
    prompt = (
        f"You are a workplace safety AI assistant. Analyze these YOLO detections from a factory floor camera:\n"
        f"- Persons detected: {person_count}\n"
        f"- Objects detected: {', '.join(detected_objects)}\n"
        f"- Expected PPE: {', '.join(expected)}\n\n"
        f"Determine if each operator is in compliance with safety protocol. "
        f"List any missing PPE and explain the risk in 2-3 sentences."
    )
    client = _get_client()
    try:
        resp = await client.post(
            f"{settings.chat_model_endpoint}/v1/chat/completions",
            json={
                "model": settings.chat_model_name,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 256,
                "temperature": 0.3,
            },
            headers={"Authorization": f"Bearer {settings.chat_api_key}"} if settings.chat_api_key else {},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
