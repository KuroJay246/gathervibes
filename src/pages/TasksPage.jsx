import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock3, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router'
import { useSearchParams } from 'react-router'
import { AssignedEventGate } from '../components/AssignedEventGate'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import {
  createEmptyTaskDraft,
  buildTaskWorkflowSummary,
  filterTasks,
  sortTasks,
  TASK_CATEGORY_OPTIONS,
  TASK_FILTERS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  taskDueState,
} from '../utils/taskWorkflow.js'
import { formatEventDate } from '../utils/dateUtils.js'
import { canManageTasks, canViewTasks } from '../utils/accessRoles.js'
import { deleteTask, saveTaskDraft, subscribeToTasks, updateTaskStatus } from '../services/taskService.js'

function friendlyFirebaseError(error) {
  if (error?.code === 'permission-denied') return 'Tasks were blocked by Firestore authorization or task-record validation. If System QA shows Protected Owner = PASS, run the owner capability check and inspect the task record for older unsupported fields.'
  if (error?.code === 'unauthenticated') return 'Your session expired. Sign in again to continue.'
  return error?.message || 'Tasks are unavailable. Try again.'
}

function statusClass(status) {
  if (status === 'Completed') return 'bg-[#EAF6EF] text-[#17623A]'
  if (status === 'Cancelled') return 'bg-[#EEF2F9] text-[#415F91]'
  if (status === 'Blocked') return 'bg-[#FFF1F1] text-[#A32626]'
  if (status === 'Waiting on Someone') return 'bg-[#FFF4DF] text-[#7A5818]'
  if (status === 'In Progress') return 'bg-[#E9EFFB] text-[#415F91]'
  return 'bg-[#F1ECE8] text-[#725F55]'
}

function dueClass(state) {
  if (state === 'overdue') return 'text-[#A32626]'
  if (state === 'today') return 'text-[#7A5818]'
  if (state === 'soon') return 'text-[#415F91]'
  return 'text-[#80685B]'
}

function TaskMetric({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-[#9A5260] bg-[#FCEEF1]' : 'border-[#EEDFD6] bg-white hover:bg-[#FFF8F2]'}`}
    >
      <p className="text-2xl font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
    </button>
  )
}

function TaskForm({ task, onCancel, onSave, saving }) {
  const [draft, setDraft] = useState(() => ({ ...createEmptyTaskDraft(), ...task }))

  function updateField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!draft.title.trim()) return
    void onSave(draft)
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{draft.taskId ? 'Edit task' : 'New task'}</p>
          <h2 className="mt-1 font-serif text-2xl text-[#2B1723]">{draft.taskId ? 'Update task details' : 'Add task or deadline'}</h2>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-[#80685B] hover:bg-[#FFF8F2]" aria-label="Close task form">
          <X className="size-5" />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#6B564C]">
        <strong className="text-[#2B1723]">Status help:</strong> Not Started means work has not begun. In Progress means someone is working on it. Waiting on Someone means another person must respond. Blocked means the task cannot move forward until the blocker is fixed. Completed and Cancelled are set manually.
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Basic information</p>
          <p className="mt-1 text-xs text-[#80685B]">Required: task title. Everything else helps prioritize or assign the work.</p>
        </div>
        <label className="lg:col-span-2">
          <span className="text-xs font-bold text-[#5A443B]">Task title</span>
          <input value={draft.title} onChange={(event) => updateField('title', event.target.value)} required maxLength={160} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Category</span>
          <select value={draft.category} onChange={(event) => updateField('category', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {TASK_CATEGORY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Status</span>
          <select value={draft.status} onChange={(event) => updateField('status', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {TASK_STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Priority</span>
          <select value={draft.priority} onChange={(event) => updateField('priority', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {TASK_PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <div className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Responsibility and timing</p>
          <p className="mt-1 text-xs text-[#80685B]">Use these fields to show who owns the task and when the organizer should check it again.</p>
        </div>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Responsible person or team</span>
          <input value={draft.responsibleLabel} onChange={(event) => updateField('responsibleLabel', event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Due date</span>
          <input type="date" value={draft.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </label>
        <label>
          <span className="text-xs font-bold text-[#5A443B]">Follow-up date</span>
          <input type="date" value={draft.followUpDate} onChange={(event) => updateField('followUpDate', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </label>
        {draft.status === 'Waiting on Someone' && (
          <label>
            <span className="text-xs font-bold text-[#5A443B]">Waiting on</span>
            <input value={draft.waitingOn} onChange={(event) => updateField('waitingOn', event.target.value)} maxLength={160} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
          </label>
        )}
        {draft.status === 'Blocked' && (
          <label>
            <span className="text-xs font-bold text-[#5A443B]">Blocker reason</span>
            <input value={draft.blockerReason} onChange={(event) => updateField('blockerReason', event.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
          </label>
        )}
        <div className="lg:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Notes</p>
          <p className="mt-1 text-xs text-[#80685B]">Use notes for context. Saving this task does not automatically change linked resources, documents, money, tickets, or attendance.</p>
        </div>
        <label className="lg:col-span-2">
          <span className="text-xs font-bold text-[#5A443B]">Notes</span>
          <textarea value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} maxLength={2000} rows={4} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">Cancel</button>
        <button type="submit" disabled={saving || !draft.title.trim()} className="rounded-xl bg-[#9A5260] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">
          {saving ? 'Saving...' : 'Save task'}
        </button>
      </div>
    </form>
  )
}

function TaskRow({ task, canManage, onEdit, onStatus, onDelete }) {
  const dueState = taskDueState(task)
  return (
    <article className="gsv-record-row">
      <div className="gsv-record-row-main xl:grid-cols-[minmax(15rem,1.35fr)_minmax(30rem,2fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(task.status)}`}>{task.status}</span>
            {task.status === 'Blocked' && <span className="rounded-full bg-[#FFF1F1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A32626]">Blocked</span>}
          </div>
          <h3 className="gsv-record-title mt-2">{task.title}</h3>
          <p className="mt-1 text-xs font-semibold text-[#80685B]">{task.category}</p>
        </div>
        <div className="gsv-record-meta-grid">
          <div className="gsv-record-meta">
            <p className="gsv-record-meta-label">Priority</p>
            <p className="gsv-record-meta-value">{task.priority}</p>
          </div>
          <div className="gsv-record-meta">
            <p className="gsv-record-meta-label">Due</p>
            <p className={`gsv-record-meta-value ${dueClass(dueState)}`}>{task.dueDate ? formatEventDate(task.dueDate) : 'No due date'}</p>
          </div>
          <div className="gsv-record-meta">
            <p className="gsv-record-meta-label">Responsible</p>
            <p className="gsv-record-meta-value">{task.responsibleLabel || 'Unassigned'}</p>
          </div>
          <div className="gsv-record-meta">
            <p className="gsv-record-meta-label">Follow-up</p>
            <p className="gsv-record-meta-value">{task.followUpDate ? formatEventDate(task.followUpDate) : task.waitingOn ? `Waiting on ${task.waitingOn}` : 'None'}</p>
          </div>
        </div>
        {canManage && (
          <div className="gsv-record-actions xl:justify-end">
            {task.status !== 'Completed' && <button type="button" onClick={() => onStatus(task, 'Completed')} className="rounded-xl bg-[#1E7345] px-3 py-2 text-xs font-bold text-white">Complete</button>}
            {task.status !== 'In Progress' && !['Completed', 'Cancelled'].includes(task.status) && <button type="button" onClick={() => onStatus(task, 'In Progress')} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">In Progress</button>}
            {task.status !== 'Waiting on Someone' && !['Completed', 'Cancelled'].includes(task.status) && <button type="button" onClick={() => onStatus(task, 'Waiting on Someone')} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">Waiting</button>}
            {task.status !== 'Blocked' && !['Completed', 'Cancelled'].includes(task.status) && <button type="button" onClick={() => onStatus(task, 'Blocked')} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">Blocked</button>}
            {['Completed', 'Cancelled'].includes(task.status) && <button type="button" onClick={() => onStatus(task, 'Not Started')} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">Reopen</button>}
            {task.status !== 'Cancelled' && <button type="button" onClick={() => onStatus(task, 'Cancelled')} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">Cancel</button>}
            <button type="button" onClick={() => onEdit(task)} className="grid size-9 place-items-center rounded-xl border border-[#E7D6CC] text-[#6B564C]" aria-label={`Edit ${task.title}`}><Pencil className="size-4" /></button>
            <button type="button" onClick={() => onDelete(task)} className="grid size-9 place-items-center rounded-xl border border-[#F0D3D3] text-[#A32626]" aria-label={`Delete ${task.title}`}><Trash2 className="size-4" /></button>
          </div>
        )}
      </div>
      {(task.blockerReason || task.notes) && (
        <div className="gsv-secondary-detail">
          {task.blockerReason && <p className="font-semibold text-[#A32626]">Blocked: {task.blockerReason}</p>}
          {task.notes && <p className={task.blockerReason ? 'mt-1' : ''}>{task.notes}</p>}
        </div>
      )}
    </article>
  )
}

export function TasksPage() {
  const { activeEvent } = useActiveEvent()
  const { user, access } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formTask, setFormTask] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const canRead = canViewTasks(access, activeEvent?.eventId)
  const canManage = canManageTasks(access, activeEvent?.eventId)
  const prefilledTask = useMemo(() => {
    const prefills = {
      title: searchParams.get('title') || '',
      category: searchParams.get('category') || '',
      responsibleLabel: searchParams.get('responsibleLabel') || '',
      dueDate: searchParams.get('dueDate') || '',
      followUpDate: searchParams.get('followUpDate') || '',
      notes: searchParams.get('notes') || '',
      status: searchParams.get('status') || '',
      priority: searchParams.get('priority') || '',
    }
    if (!Object.values(prefills).some(Boolean)) return null
    return {
      ...createEmptyTaskDraft(),
      ...Object.fromEntries(Object.entries(prefills).filter(([, value]) => value)),
    }
  }, [searchParams])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setTasks([])
    setError('')
    setLoading(Boolean(activeEvent?.eventId))
    if (!activeEvent?.eventId || !canRead) {
      setLoading(false)
      return undefined
    }
    return subscribeToTasks(
      activeEvent.eventId,
      (nextTasks) => {
        setTasks(nextTasks)
        setLoading(false)
      },
      (nextError) => {
        setError(friendlyFirebaseError(nextError))
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId, canRead])

  const summary = useMemo(() => buildTaskWorkflowSummary(tasks), [tasks])
  const visibleTasks = useMemo(() => sortTasks(filterTasks(tasks, filter)), [filter, tasks])

  async function handleSave(values) {
    setSaving(true)
    setSuccess('')
    try {
      await saveTaskDraft(activeEvent, values, user, formTask?.taskId ? formTask : null)
      if (prefilledTask) setSearchParams(new URLSearchParams(), { replace: true })
      setFormTask(null)
      setSuccess('Task saved.')
    } catch (saveError) {
      setError(friendlyFirebaseError(saveError))
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(task, status) {
    setSaving(true)
    setSuccess('')
    try {
      await updateTaskStatus(activeEvent, task, status, user)
      setSuccess(`Task marked ${status}.`)
    } catch (statusError) {
      setError(friendlyFirebaseError(statusError))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(task) {
    setDeleteCandidate(task)
  }

  async function confirmDeleteTask() {
    const task = deleteCandidate
    if (!task) return
    setSaving(true)
    setSuccess('')
    try {
      await deleteTask(activeEvent, task, user)
      setSuccess('Task deleted.')
      setDeleteCandidate(null)
    } catch (deleteError) {
      setError(friendlyFirebaseError(deleteError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AssignedEventGate purpose="Tasks">
      <div data-route="tasks" data-tour-id="tasks-workspace" className="space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Event-scoped workflow</p>
            <h2 className="mt-2 font-serif text-3xl text-[#2B1723]">Tasks & Deadlines</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
              Track event setup, due dates, blockers, and follow-up for <strong>{activeEvent?.eventName || 'the selected Working Event'}</strong>. Completed events stay editable through the same confirmations and audit log.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/events" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">Change event</Link>
            {canManage && (
              <button type="button" onClick={() => setFormTask(createEmptyTaskDraft())} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9A5260] px-5 text-xs font-bold text-white shadow-lg shadow-[#9A5260]/20">
                <Plus className="size-4" /> Add Task
              </button>
            )}
          </div>
        </header>

        {success && <div role="status" className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{success}</div>}
        {error && <ErrorState title="Tasks could not be loaded" message={error} />}
        {!canManage && canRead && (
          <div className="rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm text-[#6B564C]">
            This account can read tasks for the selected event but cannot create, edit, complete, cancel, or delete them.
          </div>
        )}
        {(formTask || prefilledTask) && canManage && (
          <TaskForm
            task={formTask || prefilledTask}
            saving={saving}
            onCancel={() => {
              setFormTask(null)
              if (prefilledTask) setSearchParams(new URLSearchParams(), { replace: true })
            }}
            onSave={handleSave}
          />
        )}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8" aria-label="Task summary">
          <TaskMetric label="Open" value={summary.open} active={filter === 'All'} onClick={() => setFilter('All')} />
          <TaskMetric label="Overdue" value={summary.overdue} active={filter === 'Overdue'} onClick={() => setFilter('Overdue')} />
          <TaskMetric label="Due Today" value={summary.dueToday} active={filter === 'Due Today'} onClick={() => setFilter('Due Today')} />
          <TaskMetric label="Due Soon" value={summary.dueSoon} active={filter === 'Due Soon'} onClick={() => setFilter('Due Soon')} />
          <TaskMetric label="Waiting" value={summary.waiting} active={filter === 'Waiting'} onClick={() => setFilter('Waiting')} />
          <TaskMetric label="Blocked" value={summary.blocked} active={filter === 'Blocked'} onClick={() => setFilter('Blocked')} />
          <TaskMetric label="Completed" value={summary.completed} active={filter === 'Completed'} onClick={() => setFilter('Completed')} />
          <TaskMetric label="Total" value={summary.total} active={false} onClick={() => setFilter('All')} />
        </section>

        <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {TASK_FILTERS.map((option) => (
              <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === option ? 'bg-[#2B1723] text-white' : 'border border-[#E5D7CF] text-[#80685B]'}`}>
                {option}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <LoadingState message="Loading event tasks..." />
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={tasks.length === 0 ? 'No tasks recorded yet' : 'No tasks match this filter'}
            description={tasks.length === 0 ? 'Add the first event-scoped task when there is planning work, a deadline, a blocker, or follow-up to track.' : 'Choose a different task filter or clear completed work.'}
          />
        ) : (
          <div className="gsv-record-list" aria-label="Compact task rows">
            {visibleTasks.map((task) => (
              <TaskRow key={task.taskId} task={task} canManage={canManage && !saving} onEdit={setFormTask} onStatus={handleStatus} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-[#EEDFD6] bg-[#FBF8F5] p-4 text-xs leading-5 text-[#80685B]">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#1E7345]" />
            <p>Tasks are scoped to the selected Working Event. Cancel keeps history when work is no longer needed; Delete is available only for approved organizers when a record was created by mistake.</p>
          </div>
          <div className="mt-2 flex gap-3">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-[#7A5818]" />
            <p>Overdue means a due date earlier than today and not Completed or Cancelled. Due Soon covers the next seven calendar days.</p>
          </div>
        </section>

        <ConfirmDialog
          open={Boolean(deleteCandidate)}
          title="Delete task?"
          recordName={deleteCandidate?.title}
          message={`This removes the task from ${activeEvent?.eventName || 'the Working Event'}. Use Cancel instead when historical task context should remain visible.`}
          confirmLabel="Delete Task"
          pending={saving}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmDeleteTask}
        />
      </div>
    </AssignedEventGate>
  )
}
