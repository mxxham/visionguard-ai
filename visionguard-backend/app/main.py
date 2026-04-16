import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session as SQLSession
from sqlmodel import select
from typing import List

from app.core.db import init_db, get_session
from app.models.pest import PestSighting, DetectionLog

app = FastAPI(title="VisionGuard AI - Backend API")

# Ensure the directory for alert snapshots exists
os.makedirs("app/static/alerts", exist_ok=True)

# Mount the static folder so the Dashboard can display the alert images
app.mount("/static", StaticFiles(directory="app/static"), name="static")

@app.on_event("startup")
def on_startup():
    """Initializes the database tables on laptop startup."""
    init_db()

@app.get("/")
def read_root():
    return {"message": "VisionGuard API is running"}

# --- ENDPOINTS FOR THE DASHBOARD ---

@app.get("/alerts", response_model=List[PestSighting])
def get_all_alerts(session: SQLSession = Depends(get_session)):
    """Fetch all pest sightings for the main dashboard feed."""
    statement = select(PestSighting).order_by(PestSighting.timestamp.desc())
    return session.exec(statement).all()

@app.get("/stats/summary")
def get_stats(session: SQLSession = Depends(get_session)):
    """Provides data for the dashboard charts."""
    # Count occurrences by species
    sightings = session.exec(select(PestSighting)).all()
    stats = {
        "snake": sum(1 for s in sightings if s.species == "snake"),
        "cat": sum(1 for s in sightings if s.species == "cat"),
        "gecko": sum(1 for s in sightings if s.species == "gecko"),
        "total_alerts": len(sightings)
    }
    return stats

@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, session: SQLSession = Depends(get_session)):
    """Allows supervisors to 'check off' an alert on the app."""
    alert = session.get(PestSighting, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    session.add(alert)
    session.commit()
    return {"status": "success", "message": f"Alert {alert_id} resolved"}