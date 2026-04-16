from datetime import datetime
from typing import Optional
from sqlmodel import Field, SQLModel, create_engine

class PestSighting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    species: str  # snake, cat, or gecko
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_path: str  # Path to the snapshot stored in MinIO/Local
    camera_id: str = "CAM-01"  # Default for your looping video test
    is_resolved: bool = False  # For the dashboard to track if someone checked it

class DetectionLog(SQLModel, table=True):
    """Logs every single frame detection for audit, even if no alert is sent."""
    id: Optional[int] = Field(default=None, primary_key=True)
    species: str
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)