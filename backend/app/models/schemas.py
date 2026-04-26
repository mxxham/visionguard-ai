from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.db.models import SeverityEnum, CameraStatusEnum, UserRole


# ── Camera ────────────────────────────────────────────────────────────────────

class CameraBase(BaseModel):
    name: str
    zone: str
    rtsp_url: Optional[str] = None
    device_index: Optional[int] = None


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    zone: Optional[str] = None
    rtsp_url: Optional[str] = None
    device_index: Optional[int] = None
    is_active: Optional[bool] = None
    status: Optional[CameraStatusEnum] = None


class CameraOut(CameraBase):
    id: int
    status: CameraStatusEnum
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Detection ─────────────────────────────────────────────────────────────────

class DetectionOut(BaseModel):
    id: int
    camera_id: int
    camera_name: str
    camera_zone: str
    species: str
    label: str
    confidence: float
    severity: SeverityEnum
    bbox: list
    frame_path: Optional[str]
    timestamp: datetime
    is_duplicate: bool

    class Config:
        from_attributes = True


# ── Alert ─────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    detection_id: int
    acknowledged: bool
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    dispatched: bool
    notes: Optional[str]
    created_at: datetime
    detection: DetectionOut

    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    acknowledged_by: str
    notes: Optional[str] = None


class AlertDispatch(BaseModel):
    notes: Optional[str] = None


# ── Stats ─────────────────────────────────────────────────────────────────────

class StatsSummary(BaseModel):
    critical_count: int
    moderate_count: int
    low_count: int
    total_today: int
    cameras_online: int
    cameras_total: int
    model_map: float
    dedup_suppressed: int


class HourlyBucket(BaseModel):
    hour: str
    snake: int
    cat: int
    pest: int
    other: int


class HourlyStats(BaseModel):
    buckets: List[HourlyBucket]


# ── WebSocket payload ─────────────────────────────────────────────────────────

class WSDetectionEvent(BaseModel):
    event: str = "detection"
    alert_id: int
    detection_id: int
    camera_id: int
    camera_name: str
    camera_zone: str
    species: str
    label: str
    confidence: float
    severity: str
    bbox: list
    frame_path: Optional[str]
    timestamp: str


class WSCameraStatusEvent(BaseModel):
    event: str = "camera_status"
    camera_id: int
    camera_name: str
    status: str
    timestamp: str


class WSStatsEvent(BaseModel):
    event: str = "stats_update"
    stats: StatsSummary
    timestamp: str


# ── Auth / User ───────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    role: UserRole = UserRole.user
