
# visionguard-ai
=======
# VisionGuard AI — Warehouse Bio-Hazard Detection System

Full-stack real-time detection dashboard powered by **YOLOv8-nano**, **FastAPI**, **PostgreSQL 15**, **React 18 + Vite**, and **WebSockets**.

---

## Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Zustand, Recharts   |
| Backend    | FastAPI, SQLAlchemy, Uvicorn        |
| Database   | PostgreSQL 15                       |
| ML Model   | YOLOv8-nano (Ultralytics)           |
| Real-time  | WebSockets (native FastAPI)         |
| Video      | OpenCV (RTSP / webcam)              |
| Deploy     | Docker Compose                      |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter project
cd visionguard

# 2. Put your trained weights here (or skip — falls back to yolov8n.pt)
cp /path/to/best.pt backend/app/ml/weights/best.pt

# 3. Start everything
docker compose up --build

# Frontend → http://localhost:5173
# Backend  → http://localhost:8000
# API docs → http://localhost:8000/docs
```

---

## Local Development (no Docker)

### Backend

```bash
cd backend

# 1. Create and activate virtualenv
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start PostgreSQL (must be running on localhost:5432)
#    createdb visionguard  (or use psql)

# 4. Run migrations + seed cameras
python -m app.db.seed

# 5. Start API server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

---

## Environment Variables (backend/.env)

```
DATABASE_URL=postgresql://visionguard:secret@localhost:5432/visionguard
SECRET_KEY=change-me-in-production
MODEL_PATH=app/ml/weights/best.pt
CONFIDENCE_THRESHOLD=0.45
DEDUP_WINDOW_SECONDS=30
MAX_CAMERAS=16
WS_HEARTBEAT_INTERVAL=10
```

---

## API Endpoints

| Method | Path                            | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | `/api/cameras/`                 | List all cameras             |
| POST   | `/api/cameras/`                 | Add a camera                 |
| PATCH  | `/api/cameras/{id}`             | Update camera config         |
| DELETE | `/api/cameras/{id}`             | Remove camera                |
| GET    | `/api/alerts/`                  | List alerts (filterable)     |
| GET    | `/api/alerts/{id}`              | Single alert detail          |
| POST   | `/api/alerts/{id}/acknowledge`  | Acknowledge alert            |
| POST   | `/api/alerts/{id}/dispatch`     | Mark as dispatched           |
| GET    | `/api/stats/summary`            | Dashboard stat cards         |
| GET    | `/api/stats/hourly`             | Bar chart data (today)       |
| WS     | `/ws/detections`                | Live detection stream        |
| GET    | `/health`                       | Health check                 |

---

## WebSocket Event Types

All events are JSON objects with an `event` field:

```jsonc
// New detection (triggers alert card + camera box)
{ "event": "detection", "alert_id": 12, "camera_name": "CAM-01", "species": "King Cobra", "severity": "critical", "confidence": 0.91, ... }

// Camera comes online / goes offline
{ "event": "camera_status", "camera_id": 1, "camera_name": "CAM-01", "status": "online" }

// Stats refresh push
{ "event": "stats_update", "stats": { "critical_count": 1, ... } }

// Keepalive
{ "event": "heartbeat" }
```

---

## Adding a Real Camera

```bash
curl -X POST http://localhost:8000/api/cameras/ \
  -H "Content-Type: application/json" \
  -d '{"name":"CAM-01","zone":"Zone A – Aisle 3","rtsp_url":"rtsp://192.168.1.10:554/stream"}'
```

For a local webcam use `"device_index": 0` instead of `rtsp_url`.

---

## Project Structure

```
visionguard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── db/
│   │   │   ├── database.py      # SQLAlchemy engine + session
│   │   │   ├── models.py        # ORM: Camera, Detection, Alert
│   │   │   └── seed.py          # Initial camera seeder
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── cameras.py
│   │   │   ├── alerts.py
│   │   │   ├── stats.py
│   │   │   └── ws.py            # WebSocket endpoint
│   │   ├── ml/
│   │   │   ├── detector.py      # YOLOv8-nano inference wrapper
│   │   │   ├── camera_manager.py# Per-camera async workers
│   │   │   └── weights/         # Place best.pt here
│   │   └── websocket/
│   │       └── manager.py       # WS broadcast manager
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/client.js        # Axios wrapper
│   │   ├── components/
│   │   │   ├── TopBar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── StatCards.jsx
│   │   │   ├── CameraGrid.jsx
│   │   │   ├── AlertFeed.jsx
│   │   │   ├── BarChart.jsx
│   │   │   ├── ZoneMap.jsx
│   │   │   ├── FooterMetrics.jsx
│   │   │   └── DetectionModal.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   └── useAlerts.js
│   │   ├── store/index.js       # Zustand global state
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   └── package.json
│
└── docker-compose.yml
```

---

## Next Step: Train YOLOv8-nano

Once the app is running with mock data, run the ML training pipeline:

```bash
cd training
python download_datasets.py   # downloads pest + snake + cat datasets
python train.py               # trains YOLOv8-nano, saves best.pt
cp runs/detect/visionguard_v1/weights/best.pt ../backend/app/ml/weights/
```

Then restart the backend — it will automatically load the new weights.
>>>>>>> 7366da1 (Initial commit: Setup vision project with YOLO and backend)
