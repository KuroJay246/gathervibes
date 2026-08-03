import { toDateInput } from './dateUtils.js'

export const RUN_OF_SHOW_CATEGORIES = [
  'Setup',
  'Staff Arrival',
  'Supplier Arrival',
  'Registration / Doors Open',
  'Guest Arrival',
  'Activity',
  'Programme',
  'Presentation',
  'Performance',
  'Food / Beverage Service',
  'Break',
  'Transition',
  'Announcement',
  'Photo / Media',
  'Safety Check',
  'Closing',
  'Breakdown',
  'Collection / Pickup',
  'Other',
]

export const RUN_OF_SHOW_STATUSES = ['Planned', 'Confirmed', 'In Progress', 'Completed', 'Delayed', 'Cancelled']
export const ARRIVAL_STATUSES = ['Expected', 'Arrived', 'Delayed', 'Cancelled / Not Required']

function cleanText(value, maxLength = 1000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function cleanList(values = [], maxItems = 40) {
  if (!Array.isArray(values)) return []
  const cleaned = []
  for (const value of values) {
    const next = cleanText(value, 128)
    if (next) cleaned.push(next)
    if (cleaned.length >= maxItems) break
  }
  return cleaned
}

export function createEmptyRunOfShowItem(prefill = {}) {
  return {
    title: '',
    category: 'Activity',
    date: '',
    startTime: '',
    endTime: '',
    sequence: 0,
    location: '',
    status: 'Planned',
    description: '',
    notes: '',
    responsibleStaffUid: '',
    responsibleContactId: '',
    responsibleOrganizationId: '',
    responsibleLabel: '',
    expectedArrivalTime: '',
    actualArrivalTime: '',
    arrivalStatus: 'Expected',
    arrivalNote: '',
    linkedTaskId: '',
    linkedDocumentIds: [],
    linkedResourceIds: [],
    dependencyItemIds: [],
    delayReason: '',
    criticalForEvent: false,
    ...prefill,
  }
}

export function normalizeRunOfShowItem(values = {}, event = {}, existing = {}) {
  const status = RUN_OF_SHOW_STATUSES.includes(values.status) ? values.status : 'Planned'
  const category = RUN_OF_SHOW_CATEGORIES.includes(values.category) ? values.category : 'Other'
  const eventDate = toDateInput(event.eventDate || values.date || existing.date)
  return {
    itemId: cleanText(values.itemId || existing.itemId, 128),
    eventId: cleanText(event.eventId || values.eventId || existing.eventId, 128),
    eventName: cleanText(event.eventName || values.eventName || existing.eventName, 180),
    title: cleanText(values.title || 'Untitled timeline item', 180),
    category,
    date: toDateInput(values.date) || eventDate,
    startTime: cleanText(values.startTime || existing.startTime, 5),
    endTime: cleanText(values.endTime || existing.endTime, 5),
    sequence: Number.isFinite(Number(values.sequence)) ? Number(values.sequence) : Number(existing.sequence || 0),
    location: cleanText(values.location, 180),
    status,
    description: cleanText(values.description, 2000),
    notes: cleanText(values.notes, 2000),
    responsibleStaffUid: cleanText(values.responsibleStaffUid, 128),
    responsibleContactId: cleanText(values.responsibleContactId, 128),
    responsibleOrganizationId: cleanText(values.responsibleOrganizationId, 128),
    responsibleLabel: cleanText(values.responsibleLabel, 180),
    expectedArrivalTime: cleanText(values.expectedArrivalTime, 5),
    actualArrivalTime: cleanText(values.actualArrivalTime, 5),
    arrivalStatus: ARRIVAL_STATUSES.includes(values.arrivalStatus) ? values.arrivalStatus : 'Expected',
    arrivalNote: cleanText(values.arrivalNote, 1000),
    linkedTaskId: cleanText(values.linkedTaskId, 128),
    linkedDocumentIds: cleanList(values.linkedDocumentIds || existing.linkedDocumentIds),
    linkedResourceIds: cleanList(values.linkedResourceIds || existing.linkedResourceIds),
    dependencyItemIds: cleanList(values.dependencyItemIds || existing.dependencyItemIds),
    delayReason: status === 'Delayed' ? cleanText(values.delayReason, 1000) : '',
    criticalForEvent: Boolean(values.criticalForEvent),
    createdAt: existing.createdAt || values.createdAt || null,
    createdBy: cleanText(existing.createdBy || values.createdBy, 256),
    updatedAt: values.updatedAt || existing.updatedAt || null,
    updatedBy: cleanText(values.updatedBy || existing.updatedBy, 256),
  }
}

export function validateRunOfShowItem(values = {}) {
  const item = normalizeRunOfShowItem(values)
  const errors = []
  if (!item.title) errors.push('Title is required.')
  if (!item.date) errors.push('Date is required.')
  if (!/^\d{2}:\d{2}$/.test(item.startTime)) errors.push('Start time is required.')
  if (item.endTime && !/^\d{2}:\d{2}$/.test(item.endTime)) errors.push('End time must use HH:MM.')
  if (item.actualArrivalTime && !/^\d{2}:\d{2}$/.test(item.actualArrivalTime)) errors.push('Actual arrival must use HH:MM.')
  if (item.endTime && item.endTime < item.startTime) errors.push('End time cannot be before start time.')
  return errors
}

export function sortRunOfShowItems(items = []) {
  return [...items].map(normalizeRunOfShowItem).sort((left, right) => (
    String(left.date).localeCompare(String(right.date))
    || String(left.startTime).localeCompare(String(right.startTime))
    || Number(left.sequence || 0) - Number(right.sequence || 0)
    || left.title.localeCompare(right.title)
  ))
}

export function buildTimelineState(items = [], now = new Date()) {
  const sorted = sortRunOfShowItems(items)
  const nowDate = now.toISOString().slice(0, 10)
  const nowTime = now.toTimeString().slice(0, 5)
  const active = sorted.find((item) => item.date === nowDate && item.startTime <= nowTime && (!item.endTime || item.endTime >= nowTime) && !['Completed', 'Cancelled'].includes(item.status))
  const upcoming = sorted.filter((item) => (item.date > nowDate || (item.date === nowDate && item.startTime > nowTime)) && !['Completed', 'Cancelled'].includes(item.status))
  return {
    now: active || null,
    next: upcoming[0] || null,
    upcoming,
    delayed: sorted.filter((item) => item.status === 'Delayed'),
    completed: sorted.filter((item) => item.status === 'Completed'),
    recentlyCompleted: sorted.filter((item) => item.status === 'Completed').slice(-5).reverse(),
  }
}

export function unresolvedDependencies(item = {}, allItems = []) {
  const byId = new Map(allItems.map((entry) => [entry.itemId, normalizeRunOfShowItem(entry)]))
  const unresolved = []
  for (const id of cleanList(item.dependencyItemIds)) {
    const entry = byId.get(id)
    if (entry && !['Completed', 'Cancelled'].includes(entry.status)) unresolved.push(entry)
  }
  return unresolved
}

export function runOfShowTaskPrefill(item = {}) {
  const normalized = normalizeRunOfShowItem(item)
  return {
    title: `Follow up: ${normalized.title}`,
    category: 'Event Day',
    dueDate: normalized.date,
    status: 'Not Started',
    priority: normalized.status === 'Delayed' ? 'High' : 'Normal',
    responsibleLabel: normalized.responsibleLabel,
    notes: `Run of Show item: ${normalized.title}. ${normalized.delayReason || normalized.notes || normalized.description}`.trim(),
  }
}

export function buildRunOfShowSummary(items = []) {
  const rows = Array.isArray(items) ? items.map(normalizeRunOfShowItem) : []
  return {
    total: rows.length,
    confirmed: rows.filter((item) => item.status === 'Confirmed').length,
    inProgress: rows.filter((item) => item.status === 'In Progress').length,
    completed: rows.filter((item) => item.status === 'Completed').length,
    delayed: rows.filter((item) => item.status === 'Delayed').length,
    criticalDelayed: rows.filter((item) => item.criticalForEvent && item.status === 'Delayed').length,
    cancelled: rows.filter((item) => item.status === 'Cancelled').length,
    supplierArrivalsExpected: rows.filter((item) => item.expectedArrivalTime && item.arrivalStatus === 'Expected').length,
    supplierArrivalsDelayed: rows.filter((item) => item.arrivalStatus === 'Delayed').length,
    criticalSupplierArrivalsDelayed: rows.filter((item) => item.criticalForEvent && item.arrivalStatus === 'Delayed').length,
  }
}
