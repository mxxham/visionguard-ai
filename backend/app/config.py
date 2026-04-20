from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://visionguard:secret@localhost:5432/visionguard"
    secret_key: str = "change-me-in-production"
    model_path: str = "app/ml/weights/best.pt"
    confidence_threshold: float = 0.45
    dedup_window_seconds: int = 30
    max_cameras: int = 16
    ws_heartbeat_interval: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
