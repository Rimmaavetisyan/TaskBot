import { useState, useEffect } from 'react'
import { Plus, LayoutGrid, List, CheckSquare, Sun, Moon, Copy, Check, Pencil } from 'lucide-react'
import KanbanBoard from './components/KanbanBoard'
import CreateTaskModal from './components/CreateTaskModal'
import TaskCard from './components/TaskCard'
import useWebSocket from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { useWorkspace } from './hooks/useWorkspace'
import { fetchTasks } from './api/tasks'
import { useLang, LANGUAGES } from './i18n.jsx'

/* ── Language switcher ──────────────────────────────────────────── */
function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      {LANGUAGES.map((l, i) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-2 sm:px-2.5 py-1 text-xs font-medium tracking-wide transition-colors
            ${i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}
            ${lang === l.code
              ? 'bg-indigo-600 text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/* ── Theme toggle ───────────────────────────────────────────────── */
function ThemeToggle() {
  const [dark, toggle] = useTheme()
  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700
        text-slate-500 dark:text-slate-400
        hover:text-slate-800 dark:hover:text-slate-200
        hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}

/* ── Workspace panel ────────────────────────────────────────────── */
function WorkspacePanel() {
  const { t } = useLang()
  const [token, setToken] = useWorkspace()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const copy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const startEdit = () => { setDraft(token); setEditing(true) }

  const confirmEdit = () => {
    if (draft.trim() && draft.trim() !== token) setToken(draft.trim())
    setEditing(false)
  }

  const short = token.length > 12 ? `${token.slice(0, 6)}...${token.slice(-4)}` : token

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={confirmEdit}
          className="h-7 w-36 sm:w-48 px-2 text-xs rounded-md border border-indigo-500
            bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder={t.workspaceId}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1">
      <span className="hidden sm:block text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mr-0.5">
        {t.workspace}
      </span>
      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{short}</span>
      <button onClick={copy} className="ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title={t.copyToken}>
        {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
      </button>
      <button onClick={startEdit} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title={t.changeWorkspace}>
        <Pencil size={11} />
      </button>
    </div>
  )
}

/* ── Stats bar ──────────────────────────────────────────────────── */
function StatsBar({ tasks }) {
  const { t } = useLang()
  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})
  const items = [
    { label: t.total,      value: tasks.length,            cls: 'text-slate-700 dark:text-slate-200' },
    { label: t.pending,    value: counts.pending || 0,      cls: 'text-amber-600 dark:text-amber-400' },
    { label: t.inProgress, value: counts.in_progress || 0, cls: 'text-blue-600 dark:text-blue-400' },
    { label: t.completed,  value: counts.completed || 0,   cls: 'text-emerald-600 dark:text-emerald-400' },
  ]
  return (
    <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto">
      {items.map(({ label, value, cls }, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          {i > 0 && <span className="w-px h-3 bg-slate-200 dark:bg-slate-700" />}
          <span className="text-xs text-slate-400 dark:text-slate-500">{label}</span>
          <span className={`text-xs font-semibold tabular-nums ${cls}`}>{value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── App ────────────────────────────────────────────────────────── */
export default function App() {
  const { t } = useLang()
  const [tasks, setTasks] = useState([])
  const [view, setView] = useState('kanban')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useTheme()

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const connected = useWebSocket(({ type, data }) => {
    if (type === 'task_created') {
      setTasks((prev) => prev.some((t) => t.id === data.id) ? prev : [data, ...prev])
    } else if (type === 'task_updated') {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)))
    } else if (type === 'task_deleted') {
      setTasks((prev) => prev.filter((t) => t.id !== data.id))
    }
  })

  const handleUpdate = (updated) =>
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  const handleDelete = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id))

  const btnBase = 'p-1.5 transition-colors border-r last:border-r-0 border-slate-200 dark:border-slate-700'
  const btnActive = 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
  const btnIdle = 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top nav */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <CheckSquare size={14} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              {t.appName}
            </span>
            <span className="hidden md:block text-xs text-slate-400 dark:text-slate-600 font-medium">
              {t.appSub}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {/* Live indicator — sm+ only */}
            <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors
              ${connected
                ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60'
                : 'text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`} />
              {connected ? t.live : t.offline}
            </div>

            {/* Live dot — mobile only */}
            <span className={`sm:hidden w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`} />

            {/* Workspace + Lang — hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1.5">
              <WorkspacePanel />
              <LangSwitcher />
            </div>
            <ThemeToggle />

            {/* View toggle */}
            <div className="hidden sm:flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setView('kanban')} className={`${btnBase} ${view === 'kanban' ? btnActive : btnIdle}`} title="Kanban">
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setView('list')} className={`${btnBase} ${view === 'list' ? btnActive : btnIdle}`} title="List">
                <List size={14} />
              </button>
            </div>

            {/* New Task */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-md transition-colors
                px-3 py-1.5 text-sm shrink-0 whitespace-nowrap"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{t.newTask}</span>
            </button>
          </div>
        </div>

        {/* Stats + mobile controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 flex items-center gap-2">
          <StatsBar tasks={tasks} />
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {/* Workspace + Lang — mobile only */}
            <div className="flex sm:hidden items-center gap-1.5">
              <LangSwitcher />
              <WorkspacePanel />
            </div>
            {/* View toggle — mobile only */}
            <div className="flex sm:hidden rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button onClick={() => setView('kanban')} className={`${btnBase} ${view === 'kanban' ? btnActive : btnIdle}`} title="Kanban">
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => setView('list')} className={`${btnBase} ${view === 'list' ? btnActive : btnIdle}`} title="List">
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-10 sm:pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex items-center gap-2.5 text-slate-400 dark:text-slate-500 text-sm">
              <span className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-slate-400 dark:border-t-slate-400 animate-spin" />
              {t.loading}
            </div>
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard tasks={tasks} setTasks={setTasks} />
        ) : (
          <ListView tasks={tasks} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
      </main>

      {showModal && <CreateTaskModal onClose={() => setShowModal(false)} />}
    </div>
  )
}

function ListView({ tasks, onUpdate, onDelete }) {
  const { t } = useLang()
  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-slate-400 dark:text-slate-600 text-sm">{t.noTasksPage}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2 max-w-2xl mx-auto">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  )
}
