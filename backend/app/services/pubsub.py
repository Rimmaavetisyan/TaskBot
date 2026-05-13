import json
import redis
import redis.asyncio as aioredis
from typing import Optional
from ..config import settings

CHANNEL = "task_events"


async def publish_async(event_type: str, task_data: dict, token: Optional[str] = None) -> None:
    r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    payload = {"type": event_type, "data": task_data, "_token": token}
    await r.publish(CHANNEL, json.dumps(payload))
    await r.aclose()


def publish_sync(event_type: str, task_data: dict, token: Optional[str] = None) -> None:
    """Sync version used from Celery worker (no running event loop)."""
    r = redis.from_url(settings.REDIS_URL, decode_responses=True)
    payload = {"type": event_type, "data": task_data, "_token": token}
    r.publish(CHANNEL, json.dumps(payload))
    r.close()
