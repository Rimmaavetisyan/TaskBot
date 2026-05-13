import asyncio
import json
import logging
from typing import Optional
import redis.asyncio as aioredis
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..config import settings
from ..services.pubsub import CHANNEL

log = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        # token -> list of websockets
        self._buckets: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, token: str):
        await ws.accept()
        self._buckets.setdefault(token, []).append(ws)

    def disconnect(self, ws: WebSocket, token: str):
        bucket = self._buckets.get(token, [])
        try:
            bucket.remove(ws)
        except ValueError:
            pass

    async def broadcast(self, token: str, message: str):
        dead = []
        for ws in self._buckets.get(token, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._buckets[token].remove(ws)


manager = ConnectionManager()


async def redis_listener():
    while True:
        try:
            r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = r.pubsub()
            await pubsub.subscribe(CHANNEL)
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                payload = json.loads(message["data"])
                token = payload.pop("_token", None) or ""
                await manager.broadcast(token, json.dumps(payload))
        except Exception as exc:
            log.warning("Redis listener error: %s — reconnecting in 5s", exc)
            await asyncio.sleep(5)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: Optional[str] = None):
    token = token or ""
    await manager.connect(ws, token)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws, token)
