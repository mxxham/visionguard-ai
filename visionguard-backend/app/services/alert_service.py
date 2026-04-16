from datetime import datetime, timedelta
from sqlmodel import select, Session
from app.models.pest import PestSighting

def should_trigger_alert(session: Session, species: str, window_seconds: int = 30):
    """
    Checks if an alert for the same species was triggered within the window.
    Prevents spamming the warehouse supervisor during the looping video.
    """
    threshold_time = datetime.utcnow() - timedelta(seconds=window_seconds)
    
    statement = select(PestSighting).where(
        PestSighting.species == species,
        PestSighting.timestamp >= threshold_time
    )
    
    existing_sighting = session.exec(statement).first()
    
    # If no sighting found in the last 30s, we return True (Trigger Alert!)
    return existing_sighting is None