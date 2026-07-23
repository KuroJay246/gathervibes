import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ClipboardList, PencilLine, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { formatEventDate } from '../../utils/dateUtils'
import {
  buildOrganizerOverview,
  buildReadinessChecklist,
  createEmptyTask,
  eventStatusDescription,
  eventStatusLabel,
  eventTypeLabel,
  formatDaysUntilEvent,
  hydrateEventForPlanning,
  TASK_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '../../utils/eventPlanning'
import { formatCurrency } from '../../utils/financeUtils'
import { validatePlanningTask } from '../../utils/validators'

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
      <p className="text-lg font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#816D62]">{detail}</p>}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-2 border-b border-[#F2E8E1] py-3 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      <p className="text-sm font-bold text-[#2B1723]">{value || 'Not set'}</p>
    </div>
  )
}

function taskSortValue(task, sortMode) {
  if (sortMode === 'priority') {
    return { High: 0, Medium: 1, Low: 2 }[task.priority] ?? 3
  }
  if (sortMode === 'category') return task.category
  return task.dueDate || '9999-12-31'
}

function isTaskOverdue(task) {
  if (!task.dueDate || task.status === 'Completed') return false
  const dueDate = new Date(`${task.dueDate}T12:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate.getTime() < today.getTime()
}

export function EventPlanningWorkspace({ event, onEditEvent, onSaveTask, onDeleteTask, onToggleReadiness }) {
  const hydratedEvent = useMemo(() => hydrateEventForPlanning(event), [event])
  const overview = useMemo(() => buildOrganizerOverview(hydratedEvent), [hydratedEvent])
  const readiness = useMemo(() => buildReadinessChecklist(hydratedEvent), [hydratedEvent])
  const [taskForm, setTaskForm] = useState(createEmptyTask())
  const [taskErrors, setTaskErrors] = useState({})
  const [savingTask, setSavingTask] = useState(false)
  const [taskFilter, setTaskFilter] = useState('all')
  const [taskSort, setTaskSort] = useState('due-date')
  const [taskMessage, setTaskMessage] = useState('')

  const filteredTasks = useMemo(() => {
    const tasks = hydratedEvent.planningTasks.filter((task) => {
      if (taskFilter === 'completed') return task.status === 'Completed'
      if (taskFilter === 'open') return task.status !== 'Completed'
      if (taskFilter === 'overdue') return isTaskOverdue(task)
      return true
    })

    return tasks
      .slice()
      .sort((left, right) => {
        const leftValue = taskSortValue(left, taskSort)
        const rightValue = taskSortValue(right, taskSort)
        if (leftValue < rightValue) return -1
        if (leftValue > rightValue) return 1
        return left.title.localeCompare(right.title)
      })
  }, [hydratedEvent.planningTasks, taskFilter, taskSort])

  const quickActions = useMemo(() => {
    const items = []
    if (readiness.needsAttentionCount > 0) {
      items.push(...readiness.needsAttention.slice(0, 3).map((item) => ({
        label: item.label,
        detail: 'This readiness item still needs attention before the event feels fully prepared.',
        to: '/events',
      })))
    }
    if (overview.tasks.overdue > 0) {
      items.push({
        label: `${overview.tasks.overdue} overdue planning task${overview.tasks.overdue === 1 ? '' : 's'}`,
        detail: 'Update or complete overdue planning work so the organizer knows what needs to happen next.',
        to: '/events',
      })
    }
    if (overview.partners.totalRecords === 0) {
      items.push({
        label: 'Add suppliers, sponsors, or helpers',
        detail: 'Operations now includes the contact and commitment workspace for bakers, vendors, suppliers, sponsors, and venue contacts.',
        to: '/operations',
      })
    }
    return items.slice(0, 4)
  }, [overview.partners.totalRecords, overview.tasks.overdue, readiness.needsAttention, readiness.needsAttentionCount])

  async function handleSaveTask(submitEvent) {
    submitEvent.preventDefault()
    const errors = validatePlanningTask(taskForm)
    setTaskErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingTask(true)
    setTaskMessage('')
    try {
      await onSaveTask(taskForm)
      setTaskForm(createEmptyTask())
      setTaskMessage(taskForm.taskId ? 'Task updated.' : 'Task added.')
    } finally {
      setSavingTask(false)
    }
  }

  async function updateTaskStatus(task, nextStatus) {
    setSavingTask(true)
    setTaskMessage('')
    try {
      await onSaveTask({
        ...task,
        status: nextStatus,
        completedDate: nextStatus === 'Completed' ? new Date().toISOString().slice(0, 10) : '',
      })
      setTaskMessage(nextStatus === 'Completed' ? 'Task completed.' : 'Task reopened.')
    } finally {
      setSavingTask(false)
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Remove task "${task.title}" from ${event.eventName}?`)) return
    setSavingTask(true)
    setTaskMessage('')
    try {
      await onDeleteTask(task.taskId)
      setTaskMessage('Task removed.')
      if (taskForm.taskId === task.taskId) setTaskForm(createEmptyTask())
    } finally {
      setSavingTask(false)
    }
  }

  async function handleToggleReadiness(key, currentValue) {
    await onToggleReadiness(key, !currentValue)
  }

  return (
    <section id="planning-workspace" className="space-y-6">
      <section className="rounded-[26px] border border-[#EEDFD6] bg-white p-6 shadow-[0_10px_32px_rgba(84,53,67,0.05)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#FCEEF1] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">
              <CalendarDays className="size-3.5" />
              Plan a New Event
            </p>
            <h3 className="mt-4 font-serif text-3xl text-[#2B1723]">{event.eventName}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B564C]">
              {formatEventDate(event.eventDate)} · {hydratedEvent.venueName || hydratedEvent.location || 'Venue not set'} · {eventStatusLabel(event.status)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B564C]">
              {eventStatusDescription(event.status)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEditEvent} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white">
              <PencilLine className="size-4" />
              Edit setup
            </button>
            <Link to="/dashboard" className="inline-flex min-h-11 items-center rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#5A443B]">
              Open Overview
            </Link>
            <Link to="/operations" className="inline-flex min-h-11 items-center rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#5A443B]">
              Open Operations
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Days remaining" value={formatDaysUntilEvent(event.eventDate)} />
        <SummaryCard label="Capacity" value={hydratedEvent.capacity || 'Not set'} detail={hydratedEvent.registrationRequired ? 'Registration is required' : 'Registration is optional'} />
        <SummaryCard label="Projected cash position" value={formatCurrency(overview.projectedCashPosition)} detail="Budget plan only, not final profit" />
        <SummaryCard label="Budgeted expenses" value={formatCurrency(overview.budgets.totalBudget)} />
        <SummaryCard label="Tasks completed" value={`${overview.tasks.completed} / ${overview.tasks.total || 0}`} detail={`${overview.tasks.overdue} overdue`} />
        <SummaryCard label="Outstanding commitments" value={formatCurrency(overview.totalOutstandingCommitments)} detail={`${overview.partners.totalRecords} partner records`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Setup summary</p>
          <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">What is already defined</h3>
          <div className="mt-4">
            <DetailRow label="Event type" value={eventTypeLabel(hydratedEvent.eventType)} />
            <DetailRow label="Date and time" value={`${formatEventDate(event.eventDate)}${hydratedEvent.eventStartTime ? ` · ${hydratedEvent.eventStartTime}` : ''}${hydratedEvent.eventEndTime ? ` to ${hydratedEvent.eventEndTime}` : ''}`} />
            <DetailRow label="Venue" value={hydratedEvent.venueName} />
            <DetailRow label="Location" value={hydratedEvent.location} />
            <DetailRow label="Registration window" value={hydratedEvent.registrationOpenDate || hydratedEvent.registrationCloseDate ? `${hydratedEvent.registrationOpenDate || 'TBD'} to ${hydratedEvent.registrationCloseDate || 'TBD'}` : 'Not set yet'} />
            <DetailRow label="Event notes" value={hydratedEvent.eventDescription || hydratedEvent.notes} />
          </div>
        </article>

        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">What to do next</p>
          <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Organizer next steps</h3>
          {quickActions.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
              No high-priority planning blockers are currently visible for this event.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {quickActions.map((item) => (
                <Link key={`${item.label}-${item.to}`} to={item.to} className="block rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 hover:bg-white">
                  <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                  <p className="mt-2 text-xs leading-5 text-[#816D62]">{item.detail}</p>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Budget and cash position</p>
          <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Planning numbers</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Projected registration income" value={formatCurrency(overview.budgets.projectedRegistrationIncome)} />
            <SummaryCard label="Venue budget" value={formatCurrency(overview.budgets.venueBudget)} />
            <SummaryCard label="Supplier budget" value={formatCurrency(overview.budgets.supplierBudget)} />
            <SummaryCard label="Marketing budget" value={formatCurrency(overview.budgets.marketingBudget)} />
            <SummaryCard label="Staffing budget" value={formatCurrency(overview.budgets.staffingBudget)} />
            <SummaryCard label="Contingency" value={formatCurrency(overview.budgets.contingencyBudget)} />
          </div>
          <div className="mt-4 rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
            Confirmed sponsor cash and in-kind support are managed in Operations. Requested sponsorship does not count as confirmed income.
          </div>
        </article>

        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Readiness checklist</p>
          <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">What still needs attention</h3>
          <div className="mt-5 space-y-3">
            {readiness.items.map((item) => {
              const toggleable = Object.prototype.hasOwnProperty.call(hydratedEvent.readinessChecklist, item.key)
              const currentValue = Boolean(hydratedEvent.readinessChecklist[item.key])
              return (
                <div key={item.key} className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                      <p className="mt-1 text-xs text-[#816D62]">{item.status}</p>
                    </div>
                    {toggleable ? (
                      <button
                        type="button"
                        onClick={() => void handleToggleReadiness(item.key, currentValue)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold ${
                          currentValue ? 'bg-[#EAF6EF] text-[#17623A]' : 'border border-[#E7D6CC] bg-white text-[#5A443B]'
                        }`}
                      >
                        {currentValue ? 'Marked ready' : 'Mark ready'}
                      </button>
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
                        item.status === 'Ready' ? 'bg-[#EAF6EF] text-[#17623A]' : item.status === 'Not Required' ? 'bg-[#F7F1ED] text-[#6B564C]' : 'bg-[#FFF1F1] text-[#A32626]'
                      }`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Planning tasks</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Add and track organizer work</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Task filter" value={taskFilter} onChange={(changeEvent) => setTaskFilter(changeEvent.target.value)} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold text-[#5A443B]">
                <option value="all">All tasks</option>
                <option value="open">Open tasks</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
              <select aria-label="Task sort" value={taskSort} onChange={(changeEvent) => setTaskSort(changeEvent.target.value)} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold text-[#5A443B]">
                <option value="due-date">Sort by due date</option>
                <option value="priority">Sort by priority</option>
                <option value="category">Sort by category</option>
              </select>
            </div>
          </div>

          {taskMessage && (
            <div className="mt-4 rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">
              {taskMessage}
            </div>
          )}

          <form onSubmit={handleSaveTask} className="mt-5 space-y-4 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="planning-task-title" className="event-label">Task title</label>
                <input id="planning-task-title" value={taskForm.title} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, title: changeEvent.target.value }))} className="event-input" placeholder="Confirm venue access, add signage supplier, review registration balances..." />
                {taskErrors.title && <p className="mt-1 text-[11px] font-medium text-[#C53030]">{taskErrors.title}</p>}
              </div>
              <div>
                <label htmlFor="planning-task-category" className="event-label">Category</label>
                <select id="planning-task-category" value={taskForm.category} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, category: changeEvent.target.value }))} className="event-input">
                  {TASK_CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="planning-task-due-date" className="event-label">Due date</label>
                <input id="planning-task-due-date" type="date" value={taskForm.dueDate} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, dueDate: changeEvent.target.value }))} className="event-input" />
              </div>
              <div>
                <label htmlFor="planning-task-priority" className="event-label">Priority</label>
                <select id="planning-task-priority" value={taskForm.priority} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, priority: changeEvent.target.value }))} className="event-input">
                  {TASK_PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="planning-task-status" className="event-label">Status</label>
                <select id="planning-task-status" value={taskForm.status} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, status: changeEvent.target.value }))} className="event-input">
                  {TASK_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="planning-task-responsible" className="event-label">Responsible</label>
                <input id="planning-task-responsible" value={taskForm.responsible} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, responsible: changeEvent.target.value }))} className="event-input" placeholder="Organizer, venue manager, helper..." />
              </div>
              <div>
                <label htmlFor="planning-task-linked-operation" className="event-label">Linked supplier or operation</label>
                <input id="planning-task-linked-operation" value={taskForm.linkedOperation} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, linkedOperation: changeEvent.target.value }))} className="event-input" placeholder="Venue deposit, signage supplier, sponsor follow-up" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="planning-task-notes" className="event-label">Notes</label>
                <textarea id="planning-task-notes" value={taskForm.notes} onChange={(changeEvent) => setTaskForm((current) => ({ ...current, notes: changeEvent.target.value }))} className="event-input resize-y" rows={3} placeholder="What needs to happen, who is waiting, or what will change after completion?" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={savingTask} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white disabled:opacity-50">
                <Plus className="size-4" />
                {taskForm.taskId ? 'Save task' : 'Add task'}
              </button>
              {taskForm.taskId && (
                <button type="button" onClick={() => setTaskForm(createEmptyTask())} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#5A443B]">
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="size-5 text-[#9A5260]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Task list</p>
              <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Current planning work</h3>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-6 text-sm leading-6 text-[#816D62]">
              No tasks match the current filter. Add the next organizer action here so the event plan stays visible and easy to follow.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.taskId} className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#2B1723]">{task.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          task.status === 'Completed'
                            ? 'bg-[#EAF6EF] text-[#17623A]'
                            : isTaskOverdue(task)
                              ? 'bg-[#FFF1F1] text-[#A32626]'
                              : 'bg-[#F7F1ED] text-[#6B564C]'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#816D62]">
                        {task.category} · {task.priority} priority · {task.dueDate || 'No due date'}
                        {task.responsible ? ` · ${task.responsible}` : ''}
                      </p>
                      {task.linkedOperation && <p className="mt-2 text-xs leading-5 text-[#816D62]">{task.linkedOperation}</p>}
                      {task.notes && <p className="mt-2 text-sm leading-6 text-[#6B564C]">{task.notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setTaskForm(task)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-3 text-xs font-bold text-[#5A443B]">
                        <PencilLine className="size-3.5" />
                        Edit
                      </button>
                      {task.status === 'Completed' ? (
                        <button type="button" onClick={() => void updateTaskStatus(task, 'To Do')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-3 text-xs font-bold text-[#5A443B]">
                          <RotateCcw className="size-3.5" />
                          Reopen
                        </button>
                      ) : (
                        <button type="button" onClick={() => void updateTaskStatus(task, 'Completed')} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1E7345] px-3 text-xs font-bold text-white">
                          <CheckCircle2 className="size-3.5" />
                          Complete
                        </button>
                      )}
                      <button type="button" onClick={() => void removeTask(task)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F2C3C3] bg-white px-3 text-xs font-bold text-[#A32626]">
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </section>
  )
}
