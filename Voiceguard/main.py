from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.api import health, analysis


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error("Database initialization failed: %s", e)

    yield

    logger.info("VoiceGuard API shutting down")


app = FastAPI(
    title="VoiceGuard API",
    description="AI-Powered Real-Time Voice Clone Detection",
    version="1.0.0",
    lifespan=lifespan,
)


# Frontend origins allowed to communicate with the API.
# Keep localhost/127.0.0.1 for development.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


app.include_router(
    health.router,
    prefix="/api",
    tags=["health"],
)

app.include_router(
    analysis.router,
    prefix="/api",
    tags=["analysis"],
)


@app.get("/")
async def root():
    return {
        "message": "VoiceGuard API v1.0.0",
        "status": "operational",
    }