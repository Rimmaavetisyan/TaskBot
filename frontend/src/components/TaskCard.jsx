import { Trash2, ChevronRight, ChevronLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { updateStatus, deleteTask } from '../api/tasks'
import { useLang } from '../i18n.jsx'

const STATUS_ORDER = ['pending', 'in_progress', 'completed']

const STATUS_BAR = {
  pending:     'bg-amber-400',
  in_progress: 'bg-blue-500',
  completed:   'bg-emerald-500',
}

export default function TaskCard({ task, onUpdate, onDelete }) {
  const { t } = useLang()

  const SOURCE_BADGE = {
    telegram: {
      label: t.srcTelegram,
      cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900',
    },
    voice: {
      label: t.srcVoice,
      cls: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-900',
    },
    api: {
      label: t.srcWeb,
      cls: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    },
  }

  const currentIdx = STATUS_ORDER.indexOf(task.status)
  const src = SOURCE_BADGE[task.source] || SOURCE_BADGE.api
  const bar = STATUS_BAR[task.status] || 'bg-slate-300'

  const move = async (dir) => {
    const nextStatus = STATUS_ORDER[currentIdx + dir]
    if (!nextStatus) return
    const updated = await updateStatus(task.id, nextStatus)
    onUpdate(updated)
  }

  const remove = async () => {
    await deleteTask(task.id)
    onDelete(task.id)
  }

  const timeAgo = formatDistanceToNow(new Date(task.created_at), { addSuffix: true })

  return (
    <div className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all">
      {/* Status top bar */}
      <div className={`h-0.5 w-full ${bar}`} />

      <div className="p-3.5">
        {/* Title row */}
        <div className="flex items-start gap-2 mb-3">
          <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-snug flex-1 line-clamp-3">
            {task.title}
          </p>
          <button
            onClick={remove}
            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-0.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 shrink-0 mt-0.5"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${src.cls}`}>
              {src.label}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-600">{timeAgo}</span>
          </div>

          <div className="flex gap-0.5">
            {currentIdx > 0 && (
              <button
                onClick={() => move(-1)}
                className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t.moveBack}
              >
                <ChevronLeft size={13} />
              </button>
            )}
            {currentIdx < STATUS_ORDER.length - 1 && (
              <button
                onClick={() => move(1)}
                className="p-1 rounded text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={t.moveForward}
              >
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
