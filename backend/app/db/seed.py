"""
Seed initial cameras into the database.
Only seeds if the cameras table is completely empty.
"""
from app.db.database import SessionLocal, engine
from app.db import models

models.Base.metadata.create_all(bind=engine)

CAMERAS = [
    {"name": "Video Loop",  "zone": "Zone A – Aisle 3", "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
    {"name": "Video Loop 2","zone": "Zone B – Aisle 1",  "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
    {"name": "Video Loop 3","zone": "Zone C – Cold",     "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
]


def seed():
    db = SessionLocal()
    try:
        count = db.query(models.Camera).count()
        if count > 0:
            print(f"Skipping seed — {count} cameras already exist in database")
            return
        for cam_data in CAMERAS:
            cam = models.Camera(**cam_data)
            db.add(cam)
        db.commit()
        print(f"Seeded {len(CAMERAS)} default cameras")
    finally:
        db.close()


if __name__ == "__main__":
    seed()