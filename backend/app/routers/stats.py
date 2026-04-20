from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Alert, Detection, Camera, CameraStatusEnum, SeverityEnum
from app.models.schemas import StatsSummary, HourlyStats, HourlyBucket

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
def get_summary(db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    base_q = (
        db.query(Alert)
        .join(Detection)
        .filter(Detection.is_duplicate == False)
        .filter(Alert.created_at >= today_start)
    )

    critical = base_q.filter(Detection.severity == SeverityEnum.critical).count()
    moderate = base_q.filter(Detection.severity == SeverityEnum.moderate).count()
    low = base_q.filter(Detection.severity == SeverityEnum.low).count()
    total_today = base_q.count()

    cameras_online = db.query(Camera).filter(
        Camera.status == CameraStatusEnum.online,
        Camera.is_active == True,
    ).count()
    cameras_total = db.query(Camera).filter(Camera.is_active == True).count()

    # Duplicates suppressed today
    dedup = (
        db.query(Detection)
        .filter(Detection.is_duplicate == True)
        .filter(Detection.timestamp >= today_start)
        .count()
    )

    return StatsSummary(
        critical_count=critical,
        moderate_count=moderate,
        low_count=low,
        total_today=total_today,
        cameras_online=cameras_online,
        cameras_total=cameras_total,
        model_map=87.2,      # updated after retraining
        dedup_suppressed=dedup,
    )


@router.get("/hourly", response_model=HourlyStats)
def get_hourly(db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    rows = (
        db.query(
            func.date_part("hour", Detection.timestamp).label("hr"),
            Detection.species,
            func.count().label("cnt"),
        )
        .join(Alert)
        .filter(Detection.is_duplicate == False)
        .filter(Detection.timestamp >= today_start)
        .group_by("hr", Detection.species)
        .all()
    )

    # Aggregate into hour buckets
    buckets: dict = {}
    for row in rows:
        hr = int(row.hr)
        if hr not in buckets:
            buckets[hr] = {"snake": 0, "cat": 0, "pest": 0, "other": 0}
        species_lower = row.species.lower()
        if "snake" in species_lower or "cobra" in species_lower or "python" in species_lower:
            buckets[hr]["snake"] += row.cnt
        elif "cat" in species_lower:
            buckets[hr]["cat"] += row.cnt
        elif any(p in species_lower for p in ["rat", "cockroach", "mosquito", "pest", "mouse"]):
            buckets[hr]["pest"] += row.cnt
        else:
            buckets[hr]["other"] += row.cnt

    hour_labels = [
        "12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a",
        "12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p",
    ]
    result = []
    for i, label in enumerate(hour_labels):
        b = buckets.get(i, {"snake": 0, "cat": 0, "pest": 0, "other": 0})
        result.append(HourlyBucket(hour=label, **b))

    return HourlyStats(buckets=result)
