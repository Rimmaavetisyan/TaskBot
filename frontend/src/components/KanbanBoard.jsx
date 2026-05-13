import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import TaskCard from './TaskCard'
import { updateStatus } from '../api/tasks'
import { useLang } from '../i18n.jsx'

export default function KanbanBoard({ tasks, setTasks }) {
  const { t } = useLang()

  const COLUMNS = [
    { id: 'pending',     label: t.pending },
    { id: 'in_progress', label: t.inProgress },
    { id: 'completed',   label: t.completed },
  ]

  const byStatus = (status) => tasks.filter((t) => t.status === status)

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    const taskId = parseInt(result.draggableId, 10)
    const newStatus = result.destination.droppableId
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    try {
      const updated = await updateStatus(taskId, newStatus)
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)))
    }
  }

  const handleUpdate = (updated) =>
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  const handleDelete = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id))

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => {
          const colTasks = byStatus(col.id)
          return (
            <div key={col.id} className="flex flex-col">
              {/* Column header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 dark:text-slate-400">
                  {col.label}
                </span>
                <span className="text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 flex flex-col gap-2.5 p-2 -mx-2 rounded-xl transition-colors min-h-[120px]
                      ${snapshot.isDraggingOver
                        ? 'bg-slate-100 dark:bg-slate-800/50'
                        : ''
                      }`}
                  >
                    {colTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.88 : 1,
                            }}
                          >
                            <TaskCard task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colTasks.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                        <span className="text-xs text-slate-300 dark:text-slate-700">{t.noTasksCol}</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
