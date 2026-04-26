"""
Seed initial cameras and default users into the database.
Only seeds if tables are completely empty.
"""
from app.db.database import SessionLocal, engine
from app.db import models

models.Base.metadata.create_all(bind=engine)

CAMERAS = [
    {"name": "Video Loop",   "zone": "Zone A – Aisle 3", "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
    {"name": "Video Loop 2", "zone": "Zone B – Aisle 1", "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
    {"name": "Video Loop 3", "zone": "Zone C – Cold",    "rtsp_url": "/app/videos/loop.mp4", "device_index": None},
]


def seed():
    db = SessionLocal()
    try:
        # ── Cameras ───────────────────────────────────────────────────────────
        cam_count = db.query(models.Camera).count()
        if cam_count == 0:
            for cam_data in CAMERAS:
                db.add(models.Camera(**cam_data))
            db.commit()
            print(f"Seeded {len(CAMERAS)} default cameras")
        else:
            print(f"Skipping camera seed — {cam_count} cameras already exist")

        # ── Users ─────────────────────────────────────────────────────────────
        user_count = db.query(models.User).count()
        if user_count == 0:
            # Import here to avoid circular import at module level
            from app.auth import hash_password

            admin = models.User(
                username="admin",
                email="admin@visionguard.local",
                full_name="System Administrator",
                hashed_password=hash_password("admin123"),
                role=models.UserRole.admin,
                is_active=True,
            )
            operator = models.User(
                username="operator",
                email="operator@visionguard.local",
                full_name="Warehouse Operator",
                hashed_password=hash_password("operator123"),
                role=models.UserRole.user,
                is_active=True,
            )
            db.add(admin)
            db.add(operator)
            db.commit()
            print("Seeded default users: admin / admin123  |  operator / operator123")
            print("⚠  Change these passwords after first login!")
        else:
            print(f"Skipping user seed — {user_count} users already exist")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
