from ..database import SessionLocal
from ..models import Task, TaskStatus
from ..schemas import TaskResponse
from .pubsub import publish_sync


def create_task_sync(
    title: str,
    source: str,
    user_token: str | None = None,
    telegram_user_id: str | None = None,
    telegram_username: str | None = None,
) -> Task:
    """Create a task and broadcast the event. Used from Celery worker."""
    db = SessionLocal()
    try:
        task = Task(
            title=title,
            status=TaskStatus.pending,
            source=source,
            user_token=user_token or telegram_user_id,
            telegram_user_id=telegram_user_id,
            telegram_username=telegram_username,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        task_data = TaskResponse.model_validate(task).model_dump(mode="json")
        publish_sync("task_created", task_data, token=task.user_token)
        return task
    finally:
        db.close()
