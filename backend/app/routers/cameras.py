from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Camera
from app.models.schemas import CameraCreate, CameraOut, CameraUpdate
from app.ml.camera_manager import camera_manager

router = APIRouter(prefix="/api/cameras", tags=["cameras"])


@router.get("/", response_model=List[CameraOut])
def list_cameras(db: Session = Depends(get_db)):
    return db.query(Camera).order_by(Camera.name).all()


@router.get("/{camera_id}", response_model=CameraOut)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return cam


@router.post("/", response_model=CameraOut, status_code=status.HTTP_201_CREATED)
def create_camera(payload: CameraCreate, db: Session = Depends(get_db)):
    cam = Camera(**payload.model_dump())
    db.add(cam)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "cameras_name_key" in str(exc) or "unique constraint" in str(exc).lower():
            raise HTTPException(status_code=400, detail="Camera name already exists")
        raise
    db.refresh(cam)
    # Start live worker
    camera_manager.add_camera(cam)
    return cam


@router.patch("/{camera_id}", response_model=CameraOut)
def update_camera(camera_id: int, payload: CameraUpdate, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cam, field, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "cameras_name_key" in str(exc) or "unique constraint" in str(exc).lower():
            raise HTTPException(status_code=400, detail="Camera name already exists")
        raise
    db.refresh(cam)
    return cam


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    camera_manager.remove_camera(camera_id)
    db.delete(cam)
    db.commit()
