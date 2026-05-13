import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine, Base
from .routes import tasks, ws

log = logging.getLogger(__name__)


def _migrate():
    """Add user_token column if the DB was created before this feature."""
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN user_token VARCHAR(100)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_tasks_user_token ON tasks (user_token)"))
            # Backfill existing Telegram tasks so they stay visible to their owners
            conn.execute(text(
                "UPDATE tasks SET user_token = telegram_user_id "
                "WHERE telegram_user_id IS NOT NULL AND user_token IS NULL"
            ))
            log.info("DB migration: user_token column added")
        except Exception:
            pass  # Column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate()
    listener_task = asyncio.create_task(ws.redis_listener())
    yield
    listener_task.cancel()


app = FastAPI(title="Task Manager API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
