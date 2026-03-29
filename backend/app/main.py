import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.face_engine import FaceEngine
from app.models.lbph_model import LBPHModel
from app.models.object_detector import ObjectDetector

logger = logging.getLogger(__name__)

face_engine = FaceEngine()
object_detector: Optional[ObjectDetector] = None


def _init_model(engine: FaceEngine, model_type: str):
    if model_type == "dlib" and settings.dlib_enabled:
        from app.models.dlib_model import DlibModel, DLIB_AVAILABLE

        if not DLIB_AVAILABLE:
            logger.warning("dlib package not installed, falling back to LBPH")
            engine.model = LBPHModel()
        else:
            engine.model = DlibModel()
    else:
        if model_type == "dlib" and not settings.dlib_enabled:
            logger.warning("dlib requested but NEUROFACE_DLIB_ENABLED=false, using LBPH")
        engine.model = LBPHModel()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global object_detector
    _init_model(face_engine, settings.ai_model)

    if settings.object_detection_enabled:
        object_detector = ObjectDetector(
            confidence=settings.object_detection_confidence,
        )
        logger.info("Object detector initialized (available=%s)", object_detector.available)

    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    root_path="/api",
    docs_url="/docs",
    redoc_url="/redoc",
)

origins = [o.strip() for o in settings.cors_allowed_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import health, recognition, training, models, analysis, chat, objects  # noqa: E402

app.include_router(health.router)
app.include_router(recognition.router)
app.include_router(training.router)
app.include_router(models.router)
app.include_router(analysis.router)
app.include_router(chat.router)
app.include_router(objects.router)
