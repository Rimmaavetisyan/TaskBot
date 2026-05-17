from celery import Celery
from ..config import settings

_ssl = {"ssl_cert_reqs": "CERT_NONE"} if settings.REDIS_URL.startswith("rediss://") else {}

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
    broker_use_ssl=_ssl or None,
    redis_backend_use_ssl=_ssl or None,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
