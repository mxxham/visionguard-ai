from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.db.models import Alert, Detection, Camera, SeverityEnum
from app.models.schemas import AlertOut, AlertAcknowledge, AlertDispatch, DetectionOut

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _build_detection_out(detection: Detection) -> DetectionOut:
    return DetectionOut(
        id=detection.id,
        camera_id=detection.camera_id,
        camera_name=detection.camera.name,
        camera_zone=detection.camera.zone,
        species=detection.species,
        label=detection.label,
        confidence=detection.confidence,
        severity=detection.severity,
        bbox=detection.bbox,
        frame_path=detection.frame_path,
        timestamp=detection.timestamp,
        is_duplicate=detection.is_duplicate,
    )


def _build_alert_out(alert: Alert) -> AlertOut:
    return AlertOut(
        id=alert.id,
        detection_id=alert.detection_id,
        acknowledged=alert.acknowledged,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at,
        dispatched=alert.dispatched,
        notes=alert.notes,
        created_at=alert.created_at,
        detection=_build_detection_out(alert.detection),
    )


@router.get("/", response_model=List[AlertOut])
def list_alerts(
    severity: Optional[SeverityEnum] = None,
    acknowledged: Optional[bool] = None,
    camera_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = (
        db.query(Alert)
        .options(joinedload(Alert.detection).joinedload(Detection.camera))
        .join(Detection)
        .join(Camera)
        .filter(Detection.is_duplicate == False)
    )
    if severity:
        q = q.filter(Detection.severity == severity)
    if acknowledged is not None:
        q = q.filter(Alert.acknowledged == acknowledged)
    if camera_id:
        q = q.filter(Detection.camera_id == camera_id)

    alerts = q.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()
    return [_build_alert_out(a) for a in alerts]


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.detection).joinedload(Detection.camera))
        .filter(Alert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _build_alert_out(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    payload: AlertAcknowledge,
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.detection).joinedload(Detection.camera))
        .filter(Alert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.acknowledged = True
    alert.acknowledged_by = payload.acknowledged_by
    alert.acknowledged_at = datetime.utcnow()
    if payload.notes:
        alert.notes = payload.notes
    db.commit()
    db.refresh(alert)
    return _build_alert_out(alert)


@router.post("/{alert_id}/dispatch", response_model=AlertOut)
def dispatch_alert(
    alert_id: int,
    payload: AlertDispatch,
    db: Session = Depends(get_db),
):
    alert = (
        db.query(Alert)
        .options(joinedload(Alert.detection).joinedload(Detection.camera))
        .filter(Alert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.dispatched = True
    if payload.notes:
        alert.notes = payload.notes
    db.commit()
    db.refresh(alert)
    return _build_alert_out(alert)
