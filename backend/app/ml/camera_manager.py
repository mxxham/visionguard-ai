"""
Camera manager: spawns one async task per active camera.
Each task reads frames (RTSP or webcam), runs YOLOv8 inference,
deduplicates, saves detections + alerts to PostgreSQL,
and broadcasts events over WebSocket.
"""
import asyncio
import logging
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import cv2
import numpy as np

from app.config import settings
from app.db.database import SessionLocal
from app.db.models import Detection, Alert, Camera, CameraStatusEnum
from app.ml.detector import get_detector
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

SNAPSHOT_DIR = Path("snapshots")
SNAPSHOT_DIR.mkdir(exist_ok=True)


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

    def _is_duplicate(self, species: str) -> bool:
        now = time.time()
        last = self._last_detected.get(species, 0)
        if now - last < settings.dedup_window_seconds:
            return True
        self._last_detected[species] = now
        return False

    async def _run(self):
        # No source configured at all
        if self.source is None:
            logger.warning(f"Camera {self.camera_name} has no source configured, skipping.")
            await self._set_status(CameraStatusEnum.error)
            return

        detector = get_detector(settings.model_path, settings.confidence_threshold)
        frame_interval = 1.0 / 5
        loop = asyncio.get_event_loop()

        while self.running:
            cap = cv2.VideoCapture(self.source)

            if not cap.isOpened():
                logger.error(f"Cannot open camera {self.camera_name} source={self.source}")
                await self._set_status(CameraStatusEnum.error)
                await ws_manager.broadcast_camera_status(self.camera_id, self.camera_name, "error")

                # Device/webcam sources: no hardware present, stop retrying permanently
                if not self.is_file_source:
                    logger.warning(f"{self.camera_name}: device source unavailable, stopping retries.")
                    return

                # File/RTSP: retry every 10s
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
                                "alert_id": alert_id,
                                "detection_id": detection_id,
                                "camera_id": self.camera_id,
                                "camera_name": self.camera_name,
                                "camera_zone": self.zone,
                                "species": det["species"],
                                "label": det["label"],
                                "confidence": det["confidence"],
                                "severity": det["severity"],
                                "bbox": det["bbox"],
                                "frame_path": snapshot_path,
                                "timestamp": datetime.utcnow().isoformat(),
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