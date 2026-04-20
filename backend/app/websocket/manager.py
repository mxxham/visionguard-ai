import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages all active WebSocket connections and broadcasts events."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        async with self._lock:
            self.active_connections[client_id] = websocket
        logger.info(f"WS client connected: {client_id}  total={len(self.active_connections)}")

    async def disconnect(self, client_id: str):
        async with self._lock:
            self.active_connections.pop(client_id, None)
        logger.info(f"WS client disconnected: {client_id}  total={len(self.active_connections)}")

    async def send_to(self, client_id: str, data: dict):
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception as e:
                logger.warning(f"WS send failed to {client_id}: {e}")
                await self.disconnect(client_id)

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        payload = json.dumps(data, default=str)
        dead: Set[str] = set()
        async with self._lock:
            clients = dict(self.active_connections)

        for client_id, ws in clients.items():
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning(f"WS broadcast failed to {client_id}: {e}")
                dead.add(client_id)

        for cid in dead:
            await self.disconnect(cid)

    async def broadcast_detection(self, event: dict):
        await self.broadcast({"event": "detection", **event})

    async def broadcast_camera_status(self, camera_id: int, camera_name: str, status: str):
        await self.broadcast({
            "event": "camera_status",
            "camera_id": camera_id,
            "camera_name": camera_name,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def broadcast_stats(self, stats: dict):
        await self.broadcast({
            "event": "stats_update",
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat(),
        })

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Singleton
ws_manager = ConnectionManager()
