from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Task
from ..schemas import TaskCreate, TaskUpdate, TaskResponse
from ..services.pubsub import publish_async

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _get_tasks_query(db: Session, token: Optional[str]):
    q = db.query(Task)
    if token:
        q = q.filter(Task.user_token == token)
    return q


@router.get("", response_model=List[TaskResponse])
def list_tasks(x_user_token: Optional[str] = Header(None), db: Session = Depends(get_db)):
    return _get_tasks_query(db, x_user_token).order_by(Task.created_at.desc()).all()


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    body: TaskCreate,
    x_user_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    task = Task(**body.model_dump(), user_token=x_user_token, source="api")
    db.add(task)
    db.commit()
    db.refresh(task)
    data = TaskResponse.model_validate(task).model_dump(mode="json")
    await publish_async("task_created", data, token=x_user_token)
    return task


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_status(
    task_id: int,
    body: TaskUpdate,
    x_user_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    q = _get_tasks_query(db, x_user_token)
    task = q.filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = body.status
    db.commit()
    db.refresh(task)
    data = TaskResponse.model_validate(task).model_dump(mode="json")
    await publish_async("task_updated", data, token=x_user_token)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    x_user_token: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    q = _get_tasks_query(db, x_user_token)
    task = q.filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    await publish_async("task_deleted", {"id": task_id}, token=x_user_token)
