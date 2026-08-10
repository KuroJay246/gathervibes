import { dateFromValue, toDateInput } from './dateUtils.js'

export const TASK_STATUS_OPTIONS = [
  'Not Started',
  'In Progress',
  'Waiting on Someone',
  'Blocked',
  'Completed',
  'Cancelled',
]

export const TASK_PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Urgent']

export const TASK_CATEGORY_OPTIONS = [
  'Event Setup',
  'Venue',
  'Guests and Registration',
  'Payments',
  'Suppliers and Partners',
  'Marketing',
  'Documents',
  'Equipment and Supplies',
  'Event Day',
  'Follow-Up',
  'Other',
]

const LEGACY_TASK_PRIORITIES = {
  Medium: 'Normal',
}

const LEGACY_TASK_CATEGORIES = {
  Registration: 'Guests and Registration',
  Supplier: 'Suppliers and Partners',
  Suppliers: 'Suppliers and Partners',
}

export const TASK_FILTERS = [
  'All',
  'Overdue',
  'Due Today',
  'Due Soon',
  'Waiting',
  'Blocked',
  'Completed',
]

const CLOSED_STATUSES = new Set(['Completed', 'Cancelled'])

export function localDateOnly(value = new Date()) {
  const date = dateFromValue(value) || new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

export function createEmptyTaskDraft() {
  return {
    taskId: '',
    title: '',
    notes: '',
    category: 'Event Setup',
    dueDate: '',
    followUpDate: '',
    priority: 'Normal',
    status: 'Not Started',
    responsibleType: 'organizer',
    responsibleUserId: '',
    responsibleLabel: '',
    waitingOn: '',
    blockerReason: '',
  }
}

export function normalizeTask(value = {}) {
  const status = TASK_STATUS_OPTIONS.includes(value.status) ? value.status : 'Not Started'
  const priorityValue = LEGACY_TASK_PRIORITIES[value.priority] || value.priority
  const categoryValue = LEGACY_TASK_CATEGORIES[value.category] || value.category
  const priority = TASK_PRIORITY_OPTIONS.includes(priorityValue) ? priorityValue : 'Normal'
  const category = TASK_CATEGORY_OPTIONS.includes(categoryValue) ? categoryValue : 'Other'
  return {
    taskId: String(value.taskId || value.id || '').trim(),
    eventId: String(value.eventId || '').trim(),
    eventName: String(value.eventName || '').trim(),
    title: String(value.title || '').trim(),
    notes: String(value.notes || '').trim(),
    category,
    dueDate: toDateInput(value.dueDate),
    followUpDate: toDateInput(value.followUpDate),
    priority,
    status,
    responsibleType: String(value.responsibleType || 'organizer').trim() || 'organizer',
    responsibleUserId: String(value.responsibleUserId || '').trim(),
    responsibleLabel: String(value.responsibleLabel || value.responsible || '').trim(),
    waitingOn: String(value.waitingOn || '').trim(),
    blockerReason: String(value.blockerReason || '').trim(),
    createdAt: value.createdAt || null,
    createdBy: String(value.createdBy || '').trim(),
    updatedAt: value.updatedAt || null,
    updatedBy: String(value.updatedBy || '').trim(),
    completedAt: value.completedAt || null,
    cancelledAt: value.cancelledAt || null,
  }
}

export function taskDueState(task = {}, now = new Date()) {
  const normalized = normalizeTask(task)
  if (CLOSED_STATUSES.has(normalized.status)) return 'closed'
  const dueDate = localDateOnly(normalized.dueDate)
  if (!dueDate) return 'no-date'
  const today = localDateOnly(now)
  const soonLimit = new Date(today)
  soonLimit.setDate(soonLimit.getDate() + 7)
  if (dueDate.getTime() < today.getTime()) return 'overdue'
  if (dueDate.getTime() === today.getTime()) return 'today'
  if (dueDate.getTime() <= soonLimit.getTime()) return 'soon'
  return 'later'
}

export function filterTasks(tasks = [], filter = 'All', now = new Date()) {
  const list = Array.isArray(tasks) ? tasks.map(normalizeTask) : []
  if (filter === 'All') return list
  if (filter === 'Waiting') return list.filter((task) => task.status === 'Waiting on Someone')
  if (filter === 'Blocked') return list.filter((task) => task.status === 'Blocked')
  if (filter === 'Completed') return list.filter((task) => task.status === 'Completed')
  const stateByFilter = {
    Overdue: 'overdue',
    'Due Today': 'today',
    'Due Soon': 'soon',
  }
  return list.filter((task) => taskDueState(task, now) === stateByFilter[filter])
}

export function sortTasks(tasks = []) {
  const priorityRank = { Urgent: 0, High: 1, Normal: 2, Low: 3 }
  const statusRank = {
    Blocked: 0,
    'Waiting on Someone': 1,
    'In Progress': 2,
    'Not Started': 3,
    Completed: 4,
    Cancelled: 5,
  }
  return [...tasks].map(normalizeTask).sort((left, right) => {
    const leftDue = localDateOnly(left.dueDate)
    const rightDue = localDateOnly(right.dueDate)
    if (statusRank[left.status] !== statusRank[right.status]) return statusRank[left.status] - statusRank[right.status]
    if ((priorityRank[left.priority] ?? 9) !== (priorityRank[right.priority] ?? 9)) return priorityRank[left.priority] - priorityRank[right.priority]
    if (leftDue && rightDue) return leftDue.getTime() - rightDue.getTime()
    if (leftDue) return -1
    if (rightDue) return 1
    return left.title.localeCompare(right.title)
  })
}

export function buildTaskWorkflowSummary(tasks = [], now = new Date()) {
  const list = Array.isArray(tasks) ? tasks.map(normalizeTask) : []
  const open = list.filter((task) => !CLOSED_STATUSES.has(task.status))
  return {
    total: list.length,
    open: open.length,
    completed: list.filter((task) => task.status === 'Completed').length,
    cancelled: list.filter((task) => task.status === 'Cancelled').length,
    overdue: list.filter((task) => taskDueState(task, now) === 'overdue').length,
    dueToday: list.filter((task) => taskDueState(task, now) === 'today').length,
    dueSoon: list.filter((task) => taskDueState(task, now) === 'soon').length,
    waiting: list.filter((task) => task.status === 'Waiting on Someone').length,
    blocked: list.filter((task) => task.status === 'Blocked').length,
  }
}
