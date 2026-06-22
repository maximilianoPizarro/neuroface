"""PPE detection data persistence for retraining.

Uploads detection frames and YOLO-format annotation labels to S3/MinIO
for use in OpenShift AI retraining workbenches.

Storage layout:
  s3://<bucket>/<prefix>/images/<timestamp>_<uuid>.jpg
  s3://<bucket>/<prefix>/labels/<timestamp>_<uuid>.txt
"""

import io
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

import cv2
import numpy as np

from app.core.config import settings

log = logging.getLogger("ppe-data-store")

_client = None
_initialized = False


def _get_s3_client():
    global _client, _initialized
    if _initialized:
        return _client
    _initialized = True
    if not settings.ppe_data_upload_enabled:
        return None
    if not settings.ppe_data_s3_endpoint:
        log.warning("PPE data upload enabled but no S3 endpoint configured")
        return None
    try:
        import boto3
        from botocore.config import Config as BotoConfig

        session = boto3.session.Session()
        _client = session.client(
            "s3",
            endpoint_url=settings.ppe_data_s3_endpoint,
            aws_access_key_id=settings.ppe_data_s3_access_key,
            aws_secret_access_key=settings.ppe_data_s3_secret_key,
            region_name=settings.ppe_data_s3_region or None,
            use_ssl=settings.ppe_data_s3_secure,
            config=BotoConfig(signature_version="s3v4"),
        )
        log.info(
            "S3 client initialized -> %s/%s/%s",
            settings.ppe_data_s3_endpoint,
            settings.ppe_data_s3_bucket,
            settings.ppe_data_s3_prefix,
        )
        return _client
    except ImportError:
        log.warning("boto3 not installed — PPE data upload disabled")
        return None
    except Exception as exc:
        log.warning("S3 client init failed: %s", exc)
        return None


def upload_detection(
    image: np.ndarray,
    detections: list[dict],
    ppe_status: str,
) -> Optional[str]:
    """Upload an image + YOLO annotations to S3 if enabled and sampling passes.

    Returns the S3 key prefix if uploaded, else None.
    """
    if not settings.ppe_data_upload_enabled:
        return None

    if settings.ppe_data_sampling_rate < 1.0:
        if random.random() > settings.ppe_data_sampling_rate:
            return None

    client = _get_s3_client()
    if client is None:
        return None

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    uid = uuid.uuid4().hex[:8]
    base_name = f"{ts}_{ppe_status}_{uid}"
    bucket = settings.ppe_data_s3_bucket
    prefix = settings.ppe_data_s3_prefix.rstrip("/")

    try:
        _, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        img_key = f"{prefix}/images/{base_name}.jpg"
        client.put_object(
            Bucket=bucket,
            Key=img_key,
            Body=buf.tobytes(),
            ContentType="image/jpeg",
        )

        h, w = image.shape[:2]
        label_lines = []
        for det in detections:
            bbox = det.get("bbox", {})
            x1, y1 = bbox.get("x1", 0), bbox.get("y1", 0)
            x2, y2 = bbox.get("x2", 0), bbox.get("y2", 0)
            cx = ((x1 + x2) / 2) / w
            cy = ((y1 + y2) / 2) / h
            bw = (x2 - x1) / w
            bh = (y2 - y1) / h
            cls_id = det.get("class_id", 0)
            label_lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")

        label_key = f"{prefix}/labels/{base_name}.txt"
        client.put_object(
            Bucket=bucket,
            Key=label_key,
            Body="\n".join(label_lines).encode("utf-8"),
            ContentType="text/plain",
        )

        log.info("Uploaded PPE data: %s (detections=%d)", base_name, len(detections))
        return f"s3://{bucket}/{prefix}/{base_name}"
    except Exception as exc:
        log.warning("PPE data upload failed: %s", exc)
        return None


def get_status() -> dict:
    """Return current data persistence configuration status."""
    return {
        "enabled": settings.ppe_data_upload_enabled,
        "endpoint": settings.ppe_data_s3_endpoint or None,
        "bucket": settings.ppe_data_s3_bucket,
        "prefix": settings.ppe_data_s3_prefix,
        "sampling_rate": settings.ppe_data_sampling_rate,
        "connected": _get_s3_client() is not None if settings.ppe_data_upload_enabled else False,
    }
