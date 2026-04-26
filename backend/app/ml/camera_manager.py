"""
Camera manager: spawns one async task per active camera.
Each task reads frames (RTSP or webcam), runs YOLOv8 inference,
deduplicates, saves detections + alerts to PostgreSQL,
and broadcasts events over WebSocket.

Demo mode: when no video source is configured, a synthetic warehouse
frame is generated using OpenCV drawing primitives so every camera
shows a live-looking feed even on hardware-restricted environments.
"""
import asyncio
import logging
import time
import uuid
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import cv2
import numpy as np

from app.config import settings
from app.db.database import SessionLocal
from app.db.models import Detection, Alert, Camera, CameraStatusEnum
from app.ml.detector import get_detector
from app.ml.demo_frame import generate_demo_frame
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

SNAPSHOT_DIR = Path("snapshots")
SNAPSHOT_DIR.mkdir(exist_ok=True)

# How often (seconds) to run a simulated detection in demo mode
_DEMO_DETECTION_INTERVAL = 45   # one detection every ~45s per camera
_DEMO_SPECIES_POOL = [
    ("Gecko",      "gecko",      "low"),
    ("Rat",        "rat",        "moderate"),
    ("Stray Cat",  "cat",        "moderate"),
    ("Snake",      "snake",      "critical"),
    ("Bird",       "bird",       "low"),
    ("Cockroach",  "cockroach",  "moderate"),
]


class CameraWorker:
    def __init__(self, camera_id: int, camera_name: str, zone: str,
                 rtsp_url: Optional[str], device_index: Optional[int]):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.zone = zone
        self.source = rtsp_url if rtsp_url else (device_index if device_index is not None else None)
        self.is_file_source = rtsp_url is not None
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self._last_detected: Dict[str, float] = {}
        # Demo state
        self._demo_rng = random.Random(camera_id * 7919)
        self._demo_next_detection = time.time() + self._demo_rng.uniform(5, _DEMO_DETECTION_INTERVAL)
        self._demo_active_bbox: Optional[list] = None
        self._demo_active_label: str = ""
        self._demo_detection_end: float = 0

    def _is_duplicate(self, species: str) -> bool:
        now = time.time()
        last = self._last_detected.get(species, 0)
        if now - last < settings.dedup_window_seconds:
            return True
        self._last_detected[species] = now
        return False

    # ── Demo (synthetic) run loop ─────────────────────────────────────────────

    async def _run_demo(self):
        """Generate synthetic warehouse frames and occasional fake detections."""
        logger.info(f"Camera {self.camera_name}: no source configured, running in DEMO mode")
        await self._set_status(CameraStatusEnum.online)
        await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "online")

        detector = get_detector(settings.model_path, settings.confidence_threshold)
        frame_interval = 1.0 / 5   # 5 fps — lightweight
        loop = asyncio.get_event_loop()

        seed = self.camera_id   # each camera gets a unique shelf layout

        while self.running:
            t0 = time.monotonic()
            now = time.time()

            # Manage active bounding-box display window (show for 8s)
            if self._demo_active_bbox and now > self._demo_detection_end:
                self._demo_active_bbox = None
                self._demo_active_label = ""

            # Trigger a new synthetic detection?
            if now >= self._demo_next_detection:
                species_name, raw_cls, severity = self._demo_rng.choice(_DEMO_SPECIES_POOL)
                confidence = round(self._demo_rng.uniform(0.52, 0.97), 2)
                bx = self._demo_rng.randint(80, 380)
                by = self._demo_rng.randint(70, 200)
                bw = self._demo_rng.randint(40, 90)
                bh = self._demo_rng.randint(40, 100)
                bbox = [bx, by, bw, bh]
                label = f"{raw_cls.upper()} {confidence:.2f}"

                # Show bbox on frame for 8 seconds
                self._demo_active_bbox = bbox
                self._demo_active_label = label
                self._demo_detection_end = now + 8

                # Build a frame to snapshot
                frame = generate_demo_frame(
                    cam_name=self.camera_name,
                    zone=self.zone,
                    detection_bbox=bbox,
                    detection_label=label,
                    seed=seed,
                )

                det = {
                    "species":     species_name,
                    "label":       label,
                    "label_group": raw_cls.upper(),
                    "raw_class":   raw_cls,
                    "confidence":  confidence,
                    "severity":    severity,
                    "bbox":        bbox,
                }
                is_dup = self._is_duplicate(species_name)
                snapshot_path = await loop.run_in_executor(
                    None, self._save_snapshot, frame, bbox
                )
                alert_id, detection_id = await loop.run_in_executor(
                    None, self._persist, det, snapshot_path, is_dup
                )
                if not is_dup:
                    await ws_manager.broadcast_detection({
                        "alert_id":    alert_id,
                        "detection_id": detection_id,
                        "camera_id":   self.camera_id,
                        "camera_name": self.camera_name,
                        "camera_zone": self.zone,
                        "species":     species_name,
                        "label":       label,
                        "confidence":  confidence,
                        "severity":    severity,
                        "bbox":        bbox,
                        "frame_path":  snapshot_path,
                        "timestamp":   datetime.utcnow().isoformat(),
                    })

                # Schedule next detection
                self._demo_next_detection = now + self._demo_rng.uniform(
                    _DEMO_DETECTION_INTERVAL * 0.6,
                    _DEMO_DETECTION_INTERVAL * 1.4,
                )
            else:
                # Just render an idle frame (no detection overhead)
                frame = generate_demo_frame(
                    cam_name=self.camera_name,
                    zone=self.zone,
                    detection_bbox=self._demo_active_bbox,
                    detection_label=self._demo_active_label,
                    seed=seed,
                )

            # Save latest frame as the camera's "current" snapshot
            await loop.run_in_executor(None, self._save_live_frame, frame)

            elapsed = time.monotonic() - t0
            await asyncio.sleep(max(0, frame_interval - elapsed))

        await self._set_status(CameraStatusEnum.offline)
        await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "offline")
        logger.info(f"Camera {self.camera_name} (demo) stopped")

    def _save_live_frame(self, frame: np.ndarray):
        """Overwrite a stable per-camera live snapshot so the UI can poll it."""
        try:
            path = SNAPSHOT_DIR / f"live_cam_{self.camera_id}.jpg"
            cv2.imwrite(str(path), frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        except Exception as e:
            logger.error(f"Live frame save error: {e}")

    # ── Real camera run loop ──────────────────────────────────────────────────

    async def _run_real(self):
        detector = get_detector(settings.model_path, settings.confidence_threshold)
        frame_interval = 1.0 / 5
        loop = asyncio.get_event_loop()

        while self.running:
            cap = cv2.VideoCapture(self.source)

            if not cap.isOpened():
                logger.error(f"Cannot open camera {self.camera_name} source={self.source}")
                await self._set_status(CameraStatusEnum.error)
                await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "error")

                if not self.is_file_source:
                    logger.warning(f"{self.camera_name}: device source unavailable, stopping retries.")
                    return

                await asyncio.sleep(10)
                continue

            logger.info(f"Camera {self.camera_name} started")
            await self._set_status(CameraStatusEnum.online)
            await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "online")

            try:
                while self.running:
                    t0 = time.monotonic()
                    ret, frame = await loop.run_in_executor(None, cap.read)

                    if not ret:
                        if self.is_file_source:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            ret, frame = await loop.run_in_executor(None, cap.read)
                        if not ret:
                            logger.warning(f"{self.camera_name}: frame read failed, reconnecting…")
                            break

                    detections = await loop.run_in_executor(None, detector.predict, frame)

                    # Save live thumbnail every 2s so the UI can poll it
                    now_t = time.time()
                    if not hasattr(self, '_last_live_save') or now_t - self._last_live_save >= 2.0:
                        await loop.run_in_executor(None, self._save_live_frame, frame)
                        self._last_live_save = now_t

                    for det in detections:
                        is_dup = self._is_duplicate(det["species"])
                        snapshot_path = await loop.run_in_executor(
                            None, self._save_snapshot, frame, det["bbox"]
                        )
                        alert_id, detection_id = await loop.run_in_executor(
                            None, self._persist, det, snapshot_path, is_dup
                        )
                        if not is_dup:
                            await ws_manager.broadcast_detection({
                                "alert_id":    alert_id,
                                "detection_id": detection_id,
                                "camera_id":   self.camera_id,
                                "camera_name": self.camera_name,
                                "camera_zone": self.zone,
                                "species":     det["species"],
                                "label":       det["label"],
                                "confidence":  det["confidence"],
                                "severity":    det["severity"],
                                "bbox":        det["bbox"],
                                "frame_path":  snapshot_path,
                                "timestamp":   datetime.utcnow().isoformat(),
                            })

                    elapsed = time.monotonic() - t0
                    await asyncio.sleep(max(0, frame_interval - elapsed))

            except asyncio.CancelledError:
                cap.release()
                raise
            finally:
                cap.release()

        await self._set_status(CameraStatusEnum.offline)
        await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "offline")
        logger.info(f"Camera {self.camera_name} stopped")

    # ── Dispatcher ───────────────────────────────────────────────────────────

    async def _run(self):
        if self.source is None:
            await self._run_demo()
        else:
            await self._run_real()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _save_snapshot(self, frame: np.ndarray, bbox: list) -> str:
        try:
            annotated = frame.copy()
            x, y, w, h = bbox
            cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 229, 160), 2)
            filename = f"{uuid.uuid4().hex}.jpg"
            path = SNAPSHOT_DIR / filename
            cv2.imwrite(str(path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            return str(path)
        except Exception as e:
            logger.error(f"Snapshot save error: {e}")
            return ""

    def _persist(self, det: dict, snapshot_path: str, is_dup: bool):
        db = SessionLocal()
        try:
            detection = Detection(
                camera_id=self.camera_id,
                species=det["species"],
                label=det["label"],
                confidence=det["confidence"],
                severity=det["severity"],
                bbox=det["bbox"],
                frame_path=snapshot_path,
                is_duplicate=is_dup,
            )
            db.add(detection)
            db.flush()
            alert = Alert(detection_id=detection.id)
            db.add(alert)
            db.commit()
            db.refresh(alert)
            return alert.id, detection.id
        except Exception as e:
            db.rollback()
            logger.error(f"DB persist error: {e}")
            return -1, -1
        finally:
            db.close()

    async def _set_status(self, status: CameraStatusEnum):
        db = SessionLocal()
        try:
            cam = db.query(Camera).filter(Camera.id == self.camera_id).first()
            if cam:
                cam.status = status
                db.commit()
        except Exception as e:
            logger.error(f"Status update error: {e}")
        finally:
            db.close()

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        self.running = True
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None
        if loop is None:
            raise RuntimeError("No event loop available")
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None
        if current_loop is loop:
            self._task = loop.create_task(self._run())
        else:
            self._task = asyncio.run_coroutine_threadsafe(self._run(), loop)

    def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()


class CameraManager:
    def __init__(self):
        self._workers: Dict[int, CameraWorker] = {}
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def start_all(self):
        self._loop = asyncio.get_running_loop()
        db = SessionLocal()
        try:
            cameras = db.query(Camera).filter(Camera.is_active == True).all()
            for cam in cameras:
                self._start_worker(cam)
        finally:
            db.close()

    def _start_worker(self, cam: Camera):
        if cam.id in self._workers:
            return
        worker = CameraWorker(
            camera_id=cam.id,
            camera_name=cam.name,
            zone=cam.zone,
            rtsp_url=cam.rtsp_url,
            device_index=cam.device_index,
        )
        worker.start(loop=self._loop)
        self._workers[cam.id] = worker
        logger.info(f"Started worker for {cam.name}")

    def stop_all(self):
        for worker in self._workers.values():
            worker.stop()
        self._workers.clear()

    def add_camera(self, cam: Camera):
        self._start_worker(cam)

    def remove_camera(self, camera_id: int):
        worker = self._workers.pop(camera_id, None)
        if worker:
            worker.stop()


camera_manager = CameraManager()