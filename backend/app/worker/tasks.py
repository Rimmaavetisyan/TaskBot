import asyncio
import base64
import logging
from .celery_app import celery_app
from ..services.transcription import transcribe_audio
from ..services.task_service import create_task_sync
from ..config import settings

log = logging.getLogger(__name__)


@celery_app.task(name="transcribe_voice", bind=True, max_retries=3, default_retry_delay=5)
def transcribe_voice(
    self,
    audio_b64: str,
    telegram_user_id: str,
    telegram_username: str,
    chat_id: int,
):
    try:
        audio_bytes = base64.b64decode(audio_b64)
        text = transcribe_audio(audio_bytes, filename="voice.ogg")

        task = create_task_sync(
            title=text,
            source="voice",
            telegram_user_id=telegram_user_id,
            telegram_username=telegram_username,
        )

        asyncio.run(_notify_user(chat_id, text))
        log.info("Voice task %d created: %s", task.id, text[:50])
        return {"task_id": task.id, "title": text}

    except Exception as exc:
        log.error("transcribe_voice failed: %s", exc)
        asyncio.run(_notify_user(chat_id, f"Sorry, transcription failed: {exc}"))
        raise self.retry(exc=exc)


async def _notify_user(chat_id: int, text: str) -> None:
    from telegram import Bot

    async with Bot(token=settings.TELEGRAM_TOKEN) as bot:
        await bot.send_message(
            chat_id=chat_id,
            text=f"✅ Voice task created:\n_{text}_",
            parse_mode="Markdown",
        )
