import asyncio
import base64
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from ..database import SessionLocal
from ..models import Task, TaskStatus
from ..schemas import TaskResponse
from ..services.pubsub import publish_sync
from ..worker.tasks import transcribe_voice

log = logging.getLogger(__name__)

# ── Visual helpers ────────────────────────────────────────────────────────────

STATUS_ICON = {
    "pending":     "🟡",
    "in_progress": "🔵",
    "completed":   "✅",
}

STATUS_LABEL = {
    "pending":     "Pending",
    "in_progress": "In Progress",
    "completed":   "Done",
}

STATUS_BAR = {
    "pending":     "▓░░",
    "in_progress": "▓▓░",
    "completed":   "▓▓▓",
}

STATUS_ORDER = ["pending", "in_progress", "completed"]

HELP_TEXT = (
    "✦ *Task Manager Bot*\n\n"
    "💬 Send a *text message* → create a task\n"
    "🎙 Send a *voice message* → transcribe & save\n\n"
    "/list — your 5 latest tasks\n"
    "/id — workspace ID for web dashboard\n"
    "/help — show this message"
)


def _status_line(status: str) -> str:
    return f"{STATUS_ICON[status]} {STATUS_LABEL[status]}  {STATUS_BAR[status]}"


def _task_card(task) -> str:
    status_val = task.status.value if hasattr(task.status, "value") else str(task.status)
    return f"📋 *{task.title[:80]}*\n{_status_line(status_val)}"


def _task_keyboard(task_id: int, current_status: str) -> InlineKeyboardMarkup:
    idx = STATUS_ORDER.index(current_status)
    status_row = []
    if idx > 0:
        prev_s = STATUS_ORDER[idx - 1]
        status_row.append(InlineKeyboardButton(
            f"◀ {STATUS_LABEL[prev_s]}",
            callback_data=f"status:{task_id}:{prev_s}",
        ))
    if idx < len(STATUS_ORDER) - 1:
        next_s = STATUS_ORDER[idx + 1]
        status_row.append(InlineKeyboardButton(
            f"{STATUS_LABEL[next_s]} ▶",
            callback_data=f"status:{task_id}:{next_s}",
        ))
    delete_row = [InlineKeyboardButton("🗑 Delete", callback_data=f"delete:{task_id}")]
    rows = ([status_row] if status_row else []) + [delete_row]
    return InlineKeyboardMarkup(rows)


# ── Commands ──────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT, parse_mode="Markdown")


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT, parse_mode="Markdown")


async def cmd_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    uid = str(user.id)
    msg = await update.message.reply_text("🔍 Fetching your ID...")
    await asyncio.sleep(0.5)
    await msg.edit_text(
        f"🪪 *Your workspace ID*\n\n`{uid}`\n\n"
        "Enter this in the web dashboard to link your tasks.",
        parse_mode="Markdown",
    )


async def cmd_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = str(update.effective_user.id)

    msg = await update.message.reply_text("🔄 Loading your tasks...")
    await asyncio.sleep(0.4)

    db = SessionLocal()
    try:
        tasks = (
            db.query(Task)
            .filter(Task.user_token == user_id)
            .order_by(Task.created_at.desc())
            .limit(5)
            .all()
        )
        if not tasks:
            await msg.edit_text("📭 No tasks yet.\nSend me a message to create one!")
            return

        await msg.edit_text(f"📂 *Your tasks* ({len(tasks)} shown)", parse_mode="Markdown")

        for task in tasks:
            status_val = task.status.value if hasattr(task.status, "value") else str(task.status)
            kb = _task_keyboard(task.id, status_val)
            await update.message.reply_text(
                _task_card(task),
                parse_mode="Markdown",
                reply_markup=kb,
            )
    finally:
        db.close()


# ── Callback: status change ───────────────────────────────────────────────────

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data or ""
    user_id = str(query.from_user.id)

    if data.startswith("delete:"):
        task_id = int(data.split(":", 1)[1])
        await query.answer("Deleting…")
        db = SessionLocal()
        try:
            task = db.query(Task).filter(Task.id == task_id, Task.user_token == user_id).first()
            if not task:
                await query.edit_message_text("⚠️ Task not found.")
                return
            db.delete(task)
            db.commit()
            publish_sync("task_deleted", {"id": task_id}, token=user_id)
            await query.edit_message_text("🗑 *Task deleted.*", parse_mode="Markdown")
        except Exception as exc:
            log.error("handle_callback delete error: %s", exc)
            await query.edit_message_text("⚠️ Failed to delete task.")
        finally:
            db.close()
        return

    if not data.startswith("status:"):
        await query.answer()
        return

    _, task_id_str, new_status = data.split(":", 2)
    task_id = int(task_id_str)

    await query.answer(f"Moving to {STATUS_LABEL[new_status]}…")

    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id, Task.user_token == user_id).first()
        if not task:
            await query.edit_message_text("⚠️ Task not found.")
            return

        # Show a brief "updating" state
        await query.edit_message_text(
            f"⏳ *Updating…*",
            parse_mode="Markdown",
        )
        await asyncio.sleep(0.4)

        task.status = TaskStatus(new_status)
        db.commit()
        db.refresh(task)

        publish_sync(
            "task_updated",
            TaskResponse.model_validate(task).model_dump(mode="json"),
            token=user_id,
        )

        status_val = task.status.value if hasattr(task.status, "value") else str(task.status)
        kb = _task_keyboard(task.id, status_val)
        await query.edit_message_text(
            _task_card(task),
            parse_mode="Markdown",
            reply_markup=kb,
        )
    except Exception as exc:
        log.error("handle_callback error: %s", exc)
        await query.edit_message_text("⚠️ Failed to update status.")
    finally:
        db.close()


# ── Message handlers ──────────────────────────────────────────────────────────

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    title = update.message.text.strip()
    if not title:
        return

    user_token = str(user.id)

    msg = await update.message.reply_text("⏳")
    await asyncio.sleep(0.3)
    await msg.edit_text("⏳ Saving task…")

    db = SessionLocal()
    try:
        task = Task(
            title=title,
            status=TaskStatus.pending,
            source="telegram",
            user_token=user_token,
            telegram_user_id=user_token,
            telegram_username=user.username,
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        publish_sync(
            "task_created",
            TaskResponse.model_validate(task).model_dump(mode="json"),
            token=user_token,
        )
        await asyncio.sleep(0.3)
        await msg.edit_text(
            f"✅ *Task saved!*\n\n{_task_card(task)}",
            parse_mode="Markdown",
        )
    except Exception as exc:
        log.error("handle_text error: %s", exc)
        await msg.edit_text("⚠️ Something went wrong. Please try again.")
    finally:
        db.close()


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user

    msg = await update.message.reply_text("🎙")
    await asyncio.sleep(0.3)
    await msg.edit_text("🎙 Voice received…")
    await asyncio.sleep(0.4)
    await msg.edit_text("🔄 Transcribing your message…")

    try:
        voice = update.message.voice
        tg_file = await context.bot.get_file(voice.file_id)
        audio_bytes = await tg_file.download_as_bytearray()
        audio_b64 = base64.b64encode(bytes(audio_bytes)).decode()

        transcribe_voice.delay(
            audio_b64,
            str(user.id),
            user.username or "",
            update.message.chat_id,
        )
        await asyncio.sleep(0.4)
        await msg.edit_text("📬 Queued! I'll send you the task once transcription is done.")
    except Exception as exc:
        log.error("handle_voice error: %s", exc)
        await msg.edit_text("⚠️ Failed to process voice. Please try again.")
