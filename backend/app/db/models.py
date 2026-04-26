from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base


class SeverityEnum(str, enum.Enum):
    critical = "critical"
    moderate = "moderate"
    low = "low"


class CameraStatusEnum(str, enum.Enum):
    online = "online"
    offline = "offline"
    error = "error"


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class Camera(Base):
    __tablename__ = "cameras"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String(50), unique=True, nullable=False)
    zone         = Column(String(100), nullable=False)
    rtsp_url     = Column(String(500), nullable=True)
    device_index = Column(Integer, nullable=True)
    status       = Column(SAEnum(CameraStatusEnum), default=CameraStatusEnum.online)
    is_active    = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    detections = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id          = Column(Integer, primary_key=True, index=True)
    camera_id   = Column(Integer, ForeignKey("cameras.id"), nullable=False)
    species     = Column(String(100), nullable=False)
    label       = Column(String(50), nullable=False)
    confidence  = Column(Float, nullable=False)
    severity    = Column(SAEnum(SeverityEnum), nullable=False)
    bbox        = Column(JSON, nullable=False)
    frame_path  = Column(String(500), nullable=True)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)
    is_duplicate = Column(Boolean, default=False)

    camera = relationship("Camera", back_populates="detections")
    alert  = relationship("Alert", back_populates="detection", uselist=False)


class Alert(Base):
    __tablename__ = "alerts"

    id               = Column(Integer, primary_key=True, index=True)
    detection_id     = Column(Integer, ForeignKey("detections.id"), nullable=False, unique=True)
    acknowledged     = Column(Boolean, default=False)
    acknowledged_by  = Column(String(100), nullable=True)
    acknowledged_at  = Column(DateTime, nullable=True)
    dispatched       = Column(Boolean, default=False)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, index=True)

    detection = relationship("Detection", back_populates="alert")


class SystemLog(Base):
    __tablename__ = "system_logs"

    id         = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    message    = Column(Text, nullable=False)
    metadata_  = Column('metadata', JSON, nullable=True)
    timestamp  = Column(DateTime, default=datetime.utcnow, index=True)


# ── NEW: User table ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, nullable=False, index=True)
    email           = Column(String(100), unique=True, nullable=False, index=True)
    full_name       = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)
