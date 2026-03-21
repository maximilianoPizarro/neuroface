from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.face_engine import FaceEngine
from app.models.lbph_model import LBPHModel

face_engine = FaceEngine()


def _init_model(engine: FaceEngine, model_type: str):
    if model_type == "dlib":
        from app.models.dlib_model import DlibModel, DLIB_AVAILABLE

        if not DLIB_AVAILABLE:
            print("WARNING: dlib not available, falling back to LBPH")
            engine.model = LBPHModel()
        else:
            engine.model = DlibModel()
    else:
        engine.model = LBPHModel()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_model(face_engine, settings.ai_model)
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

from app.api import health, recognition, training, models  # noqa: E402

app.include_router(health.router)
app.include_router(recognition.router)
app.include_router(training.router)
app.include_router(models.router)
