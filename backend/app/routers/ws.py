import asyncio
import json
import logging
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import ws_manager
from app.config import settings

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/detections")
async def detections_ws(websocket: WebSocket):
    client_id = str(uuid.uuid4())[:8]
    await ws_manager.connect(websocket, client_id)

    # Send welcome + current connection count
    await ws_manager.send_to(client_id, {
        "event": "connected",
        "client_id": client_id,
        "connections": ws_manager.connection_count,
    })

    try:
        # Heartbeat loop – keeps the connection alive and handles client pings
        while True:
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=settings.ws_heartbeat_interval,
                )
                data = json.loads(raw)
                if data.get("type") == "ping":
                    await ws_manager.send_to(client_id, {"event": "pong"})
            except asyncio.TimeoutError:
                # Send server-side heartbeat
                await ws_manager.send_to(client_id, {"event": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(client_id)
