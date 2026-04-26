import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import engine
from app.db import models
from app.db.seed import seed
from app.routers import cameras, alerts, stats, ws
from app.routers import auth                          # NEW
from app.ml.camera_manager import camera_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────────────────────────────
    logger.info("Creating database tables…")
    models.Base.metadata.create_all(bind=engine)

    logger.info("Seeding initial data…")
    seed()

    logger.info("Starting camera workers…")
    camera_manager.start_all()

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Stopping camera workers…")
    camera_manager.stop_all()


app = FastAPI(
    title="VisionGuard AI",
    description="Warehouse Bio-Hazard Detection System – FastAPI Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS – allow Vite dev server and Docker frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://frontend:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(cameras.router)
app.include_router(alerts.router)
app.include_router(stats.router)
app.include_router(ws.router)
app.include_router(auth.router)                       # NEW

# Serve snapshot images
import os
os.makedirs("snapshots", exist_ok=True)
app.mount("/snapshots", StaticFiles(directory="snapshots"), name="snapshots")


@app.get("/health")
def health():
    return {"status": "ok", "service": "visionguard-api"}
