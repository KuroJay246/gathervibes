import { dateFromValue, toDateInput } from './dateUtils.js'
import { buildFinanceSummary, formatCurrency, parseMoney } from './financeUtils.js'
import { buildOperationsSettlementSummary } from './operationsReport.js'

export const EVENT_TYPE_OPTIONS = [
  { value: 'cake-picnic', label: 'Cake Picnic' },
  { value: 'cake-tasting', label: 'Cake Tasting' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'tasting', label: 'Tasting' },
  { value: 'cultural-experience', label: 'Cultural Experience' },
  { value: 'hospitality-event', label: 'Hospitality Event' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'party', label: 'Party' },
  { value: 'food-event', label: 'Food Event' },
  { value: 'vendor-pop-up', label: 'Vendor Pop-Up' },
  { value: 'private-food-experience', label: 'Private Food Experience' },
  { value: 'private-event', label: 'Private Event' },
  { value: 'other', label: 'Other' },
]

export const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', description: 'Capture the event idea and basic details before planning starts.' },
  { value: 'planning', label: 'Planning', description: 'Build the guest plan, budget, partners, tasks, and readiness details.' },
  { value: 'registration-open', label: 'Registration Open', description: 'Guests can register and payments should be monitored closely.' },
  { value: 'registration-closed', label: 'Registration Closed', description: 'Registration intake is paused while final event prep continues.' },
  { value: 'ready-for-event', label: 'Ready for Event', description: 'Core event-day requirements are in place and the team can prepare to run the event.' },
  { value: 'in-progress', label: 'In Progress', description: 'Use the event-day workflow for attendance, timeline, and urgent contacts.' },
  { value: 'completed', label: 'Completed', description: 'Show final results, unpaid commitments, sponsor support, and closeout work.' },
  { value: 'archived', label: 'Archived', description: 'Keep the event available for reference without showing it as active work.' },
  { value: 'cancelled', label: 'Cancelled', description: 'Keep the record for history while stopping normal event actions.' },
]

export const TASK_CATEGORY_OPTIONS = [
  'Venue',
  'Registration',
  'Finance',
  'Marketing',
  'Sponsors',
  'Vendors',
  'Supplies',
  'Staffing',
  'Compliance',
  'Event Day',
  'Follow-Up',
]

export const TASK_PRIORITY_OPTIONS = ['High', 'Medium', 'Low']
export const TASK_STATUS_OPTIONS = ['To Do', 'In Progress', 'Completed']

export const PARTNER_TYPE_OPTIONS = [
  ['baker', 'Baker'],
  ['vendor', 'Vendor'],
  ['supplier', 'Supplier'],
  ['sponsor', 'Sponsor'],
  ['venue', 'Venue Contact'],
  ['staff-helper', 'Staff / Helper'],
]

export const PARTNER_STATUS_OPTIONS = [
  'Prospective',
  'Contacted',
  'Awaiting Response',
  'Confirmed',
  'Scheduled',
  'Partially Paid',
  'Paid',
  'Declined',
  'Delivered',
  'Completed',
  'Cancelled',
]

export const SPONSOR_TYPE_OPTIONS = [
  ['cash', 'Cash sponsorship'],
  ['in-kind', 'In-kind sponsorship'],
]

export const READINESS_ITEM_CONFIG = [
  {
    key: 'eventDateEntered',
    label: 'Event date entered',
    evaluate: (event) => Boolean(event?.eventDate),
  },
  {
    key: 'venueConfirmed',
    label: 'Venue confirmed',
    evaluate: (event) => Boolean(event?.venueName) && Boolean(event?.readinessChecklist?.venueConfirmed),
  },
  {
    key: 'venueAccessConfirmed',
    label: 'Venue access time confirmed',
    evaluate: (event) => Boolean(event?.operationsPlan?.venueAccessTime) && Boolean(event?.readinessChecklist?.venueAccessConfirmed),
  },
  {
    key: 'capacityEntered',
    label: 'Capacity entered',
    evaluate: (event) => Number(event?.capacity) > 0,
  },
  {
    key: 'ticketPricesConfigured',
    label: 'Ticket prices configured',
    evaluate: (event) => (Number(event?.ticketPrice) || 0) > 0 || (Array.isArray(event?.priceTiers) && event.priceTiers.length > 0),
  },
  {
    key: 'registrationStatusConfigured',
    label: 'Registration status configured',
    evaluate: (event) => ['registration-open', 'registration-closed', 'planning', 'ready-for-event', 'in-progress', 'completed', 'archived', 'cancelled'].includes(normalizeEventStatus(event?.status)),
  },
  {
    key: 'paymentMethodsConfigured',
    label: 'Payment methods configured',
    evaluate: (event) => Boolean(event?.readinessChecklist?.paymentMethodsConfigured),
  },
  {
    key: 'suppliersConfirmed',
    label: 'Suppliers confirmed',
    evaluate: (event) => Boolean(event?.readinessChecklist?.suppliersConfirmed) || countPartnersByType(event?.partnerRecords).supplier > 0,
  },
  {
    key: 'staffAssigned',
    label: 'Staff assigned',
    evaluate: (event) => Boolean(event?.readinessChecklist?.staffAssigned) || countPartnersByType(event?.partnerRecords)['staff-helper'] > 0,
  },
  {
    key: 'eventDayTimelineReady',
    label: 'Event-day timeline created',
    evaluate: (event) => Boolean(event?.readinessChecklist?.eventDayTimelineReady) || (Array.isArray(event?.operationsPlan?.timeline) && event.operationsPlan.timeline.some((item) => item?.time || item?.label)),
  },
  {
    key: 'ticketProcessReady',
    label: 'Ticket process ready',
    evaluate: (event) => Boolean(event?.readinessChecklist?.ticketProcessReady),
  },
  {
    key: 'checkInProcessReady',
    label: 'Check-In process ready',
    evaluate: (event) => Boolean(event?.readinessChecklist?.checkInProcessReady),
  },
  {
    key: 'communicationsPrepared',
    label: 'Communications prepared',
    evaluate: (event) => Boolean(event?.readinessChecklist?.communicationsPrepared),
  },
  {
    key: 'emergencyContactRecorded',
    label: 'Emergency contact recorded',
    evaluate: (event) => Boolean(String(event?.operationsPlan?.emergencyContact || '').trim()),
  },
  {
    key: 'licencesReviewed',
    label: 'Required licences and insurance reviewed',
    evaluate: (event) => {
      const eventType = normalizeEventType(event?.eventType)
      const notRequired = ['private-event', 'other'].includes(eventType)
      if (notRequired) return null
      return Boolean(event?.readinessChecklist?.licencesReviewed) && Boolean(event?.readinessChecklist?.insuranceReviewed)
    },
  },
  {
    key: 'outstandingCommitmentsVisible',
    label: 'Outstanding commitments visible',
    evaluate: (event) => countOutstandingPartnerCommitments(event?.partnerRecords) > 0 ? Boolean(event?.partnerRecords?.length) : true,
  },
]

export function normalizeEventStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'upcoming') return 'planning'
  if (normalized === 'active') return 'in-progress'
  return normalized || 'draft'
}

export function normalizeEventType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized || 'other'
}

export function eventTypeLabel(value) {
  return EVENT_TYPE_OPTIONS.find((option) => option.value === normalizeEventType(value))?.label || 'Other'
}

export function eventStatusMeta(value) {
  return EVENT_STATUS_OPTIONS.find((option) => option.value === normalizeEventStatus(value))
    || EVENT_STATUS_OPTIONS[0]
}

export function eventStatusLabel(value) {
  return eventStatusMeta(value).label
}

export function eventStatusDescription(value) {
  return eventStatusMeta(value).description
}

export function isCompletedEvent(event = null) {
  return ['completed', 'archived', 'cancelled'].includes(normalizeEventStatus(event?.status))
}

export function isPlanningEvent(event = null) {
  return ['draft', 'planning', 'registration-open', 'registration-closed', 'ready-for-event'].includes(normalizeEventStatus(event?.status))
}

export function isEventDayStatus(event = null) {
  return ['in-progress', 'active'].includes(normalizeEventStatus(event?.status))
}

export function createUid(prefix) {
  const randomPart = typeof crypto !== 'undefined' && crypto?.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now()}_${randomPart}`
}

export function emptyFinancialPlan() {
  return {
    projectedRegistrationIncome: '',
    venueBudget: '',
    supplierBudget: '',
    entertainmentBudget: '',
    marketingBudget: '',
    staffingBudget: '',
    contingencyBudget: '',
    otherBudget: '',
  }
}

export function emptyOperationsPlan() {
  return {
    venueAccessTime: '',
    emergencyContact: '',
    suppliersNote: '',
    bakerVendorNote: '',
    sponsorNote: '',
    staffNote: '',
    equipmentNote: '',
    licencesNote: '',
    insuranceNote: '',
    setupTime: '',
    timeline: [{ timelineId: createUid('timeline'), time: '', label: '' }],
  }
}

export function emptyReadinessChecklist() {
  return {
    venueConfirmed: false,
    venueAccessConfirmed: false,
    paymentMethodsConfigured: false,
    suppliersConfirmed: false,
    staffAssigned: false,
    eventDayTimelineReady: false,
    ticketProcessReady: false,
    checkInProcessReady: false,
    communicationsPrepared: false,
    licencesReviewed: false,
    insuranceReviewed: false,
  }
}

export function createEmptyTask() {
  return {
    taskId: '',
    title: '',
    category: 'Venue',
    dueDate: '',
    priority: 'Medium',
    status: 'To Do',
    responsible: '',
    linkedPartnerId: '',
    linkedOperation: '',
    notes: '',
    completedDate: '',
  }
}

export function createEmptyPartner() {
  return {
    partnerId: '',
    recordType: 'supplier',
    name: '',
    company: '',
    role: '',
    email: '',
    phone: '',
    service: '',
    status: 'Prospective',
    agreedAmount: '',
    amountPaid: '',
    balance: '',
    dueDate: '',
    paymentDate: '',
    paymentMethod: 'unknown',
    evidence: '',
    notes: '',
    requestedAmount: '',
    confirmedCashAmount: '',
    sponsorType: 'cash',
    itemOrService: '',
    quantity: '',
    estimatedValue: '',
    followUpDate: '',
  }
}

function normalizeMoneyField(value) {
  const parsed = parseMoney(value)
  return parsed === null ? null : parsed
}

function normalizeTimelineItem(item = {}) {
  return {
    timelineId: item.timelineId || createUid('timeline'),
    time: String(item.time || '').trim(),
    label: String(item.label || '').trim(),
  }
}

function normalizeFinancialPlan(value = {}) {
  const defaults = emptyFinancialPlan()
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, normalizeMoneyField(value?.[key])])) 
}

function normalizeOperationsPlan(value = {}) {
  const defaults = emptyOperationsPlan()
  const timeline = Array.isArray(value?.timeline) && value.timeline.length > 0
    ? value.timeline.map(normalizeTimelineItem).filter((item) => item.time || item.label)
    : []

  return {
    venueAccessTime: String(value?.venueAccessTime || '').trim(),
    emergencyContact: String(value?.emergencyContact || '').trim(),
    suppliersNote: String(value?.suppliersNote || '').trim(),
    bakerVendorNote: String(value?.bakerVendorNote || '').trim(),
    sponsorNote: String(value?.sponsorNote || '').trim(),
    staffNote: String(value?.staffNote || '').trim(),
    equipmentNote: String(value?.equipmentNote || '').trim(),
    licencesNote: String(value?.licencesNote || '').trim(),
    insuranceNote: String(value?.insuranceNote || '').trim(),
    setupTime: String(value?.setupTime || '').trim(),
    timeline: timeline.length > 0 ? timeline : defaults.timeline,
  }
}

function normalizeReadinessChecklist(value = {}) {
  const defaults = emptyReadinessChecklist()
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, Boolean(value?.[key])]))
}

export function normalizePlanningTask(task = {}) {
  const status = TASK_STATUS_OPTIONS.includes(task.status) ? task.status : 'To Do'
  return {
    taskId: task.taskId || createUid('task'),
    title: String(task.title || '').trim(),
    category: TASK_CATEGORY_OPTIONS.includes(task.category) ? task.category : 'Venue',
    dueDate: toDateInput(task.dueDate),
    priority: TASK_PRIORITY_OPTIONS.includes(task.priority) ? task.priority : 'Medium',
    status,
    responsible: String(task.responsible || '').trim(),
    linkedPartnerId: String(task.linkedPartnerId || '').trim(),
    linkedOperation: String(task.linkedOperation || '').trim(),
    notes: String(task.notes || '').trim(),
    completedDate: status === 'Completed' ? toDateInput(task.completedDate || new Date()) : '',
  }
}

export function normalizePartnerRecord(record = {}) {
  const agreedAmount = normalizeMoneyField(record.agreedAmount)
  const amountPaid = normalizeMoneyField(record.amountPaid)
  const sponsorType = record.sponsorType === 'in-kind' ? 'in-kind' : 'cash'
  const confirmedCashAmount = normalizeMoneyField(record.confirmedCashAmount)

  return {
    partnerId: record.partnerId || createUid('partner'),
    recordType: PARTNER_TYPE_OPTIONS.some(([value]) => value === record.recordType) ? record.recordType : 'supplier',
    name: String(record.name || '').trim(),
    company: String(record.company || '').trim(),
    role: String(record.role || '').trim(),
    email: String(record.email || '').trim(),
    phone: String(record.phone || '').trim(),
    service: String(record.service || '').trim(),
    status: PARTNER_STATUS_OPTIONS.includes(record.status) ? record.status : 'Prospective',
    agreedAmount,
    amountPaid,
    balance: agreedAmount === null ? null : Math.max(0, Number((agreedAmount - (amountPaid || 0)).toFixed(2))),
    dueDate: toDateInput(record.dueDate),
    paymentDate: toDateInput(record.paymentDate),
    paymentMethod: String(record.paymentMethod || 'unknown').trim() || 'unknown',
    evidence: String(record.evidence || '').trim(),
    notes: String(record.notes || '').trim(),
    requestedAmount: normalizeMoneyField(record.requestedAmount),
    confirmedCashAmount,
    sponsorType,
    itemOrService: String(record.itemOrService || '').trim(),
    quantity: String(record.quantity || '').trim(),
    estimatedValue: normalizeMoneyField(record.estimatedValue),
    followUpDate: toDateInput(record.followUpDate),
  }
}

export function hydrateEventForPlanning(event = {}) {
  return {
    ...event,
    eventType: normalizeEventType(event?.eventType),
    status: normalizeEventStatus(event?.status),
    eventStartTime: String(event?.eventStartTime || '').trim(),
    eventEndTime: String(event?.eventEndTime || '').trim(),
    venueName: String(event?.venueName || '').trim(),
    eventDescription: String(event?.eventDescription || '').trim(),
    registrationRequired: event?.registrationRequired !== false,
    ticketTypeCount: Number(event?.ticketTypeCount) > 0 ? Number(event.ticketTypeCount) : Math.max(1, Array.isArray(event?.priceTiers) && event.priceTiers.length > 0 ? event.priceTiers.length : 1),
    complimentaryAllowed: Boolean(event?.complimentaryAllowed),
    doorPaymentAllowed: event?.doorPaymentAllowed !== false,
    registrationOpenDate: event?.registrationOpenDate || null,
    registrationCloseDate: event?.registrationCloseDate || null,
    financialPlan: normalizeFinancialPlan(event?.financialPlan),
    operationsPlan: normalizeOperationsPlan(event?.operationsPlan),
    readinessChecklist: normalizeReadinessChecklist(event?.readinessChecklist),
    planningTasks: Array.isArray(event?.planningTasks) ? event.planningTasks.map(normalizePlanningTask) : [],
    partnerRecords: Array.isArray(event?.partnerRecords) ? event.partnerRecords.map(normalizePartnerRecord) : [],
  }
}

export function financialPlanTotals(financialPlan = {}) {
  const normalized = normalizeFinancialPlan(financialPlan)
  const {
    projectedRegistrationIncome: _projectedRegistrationIncome,
    ...budgetFields
  } = normalized
  const totalBudget = Object.values(budgetFields).reduce((sum, value) => sum + (Number(value) || 0), 0)
  return {
    ...normalized,
    totalBudget,
  }
}

export function countPartnersByType(records = []) {
  return (Array.isArray(records) ? records : []).reduce((summary, record) => {
    const key = String(record?.recordType || '').trim()
    if (!summary[key]) summary[key] = 0
    if (key) summary[key] += 1
    return summary
  }, {
    baker: 0,
    vendor: 0,
    supplier: 0,
    sponsor: 0,
    venue: 0,
    'staff-helper': 0,
  })
}

export function countOutstandingPartnerCommitments(records = []) {
  return (Array.isArray(records) ? records : []).filter((record) => (Number(record?.balance) || 0) > 0).length
}

export function buildPartnerSummary(records = []) {
  const list = Array.isArray(records) ? records.map(normalizePartnerRecord) : []
  const counts = countPartnersByType(list)
  const confirmedCashSponsors = list
    .filter((record) => record.recordType === 'sponsor' && record.sponsorType === 'cash' && ['Confirmed', 'Delivered', 'Completed'].includes(record.status))
    .reduce((sum, record) => sum + (record.confirmedCashAmount || record.agreedAmount || 0), 0)
  const inKindEstimatedValue = list
    .filter((record) => record.recordType === 'sponsor' && record.sponsorType === 'in-kind')
    .reduce((sum, record) => sum + (record.estimatedValue || 0), 0)
  const agreedCommitments = list.reduce((sum, record) => sum + (record.agreedAmount || 0), 0)
  const amountPaid = list.reduce((sum, record) => sum + (record.amountPaid || 0), 0)
  const outstandingBalance = list.reduce((sum, record) => sum + (record.balance || 0), 0)
  const openFollowUps = list.filter((record) => ['Prospective', 'Contacted', 'Awaiting Response', 'Confirmed', 'Scheduled', 'Partially Paid'].includes(record.status)).length

  return {
    totalRecords: list.length,
    counts,
    confirmedCashSponsors,
    inKindEstimatedValue,
    agreedCommitments,
    amountPaid,
    outstandingBalance,
    openFollowUps,
  }
}

export function buildTaskSummary(tasks = []) {
  const list = Array.isArray(tasks) ? tasks.map(normalizePlanningTask) : []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let completed = 0
  let overdue = 0
  let upcoming = 0

  list.forEach((task) => {
    if (task.status === 'Completed') {
      completed += 1
      return
    }

    const dueDate = dateFromValue(task.dueDate)
    if (!dueDate) return
    dueDate.setHours(0, 0, 0, 0)
    if (dueDate.getTime() < today.getTime()) overdue += 1
    if (dueDate.getTime() >= today.getTime()) upcoming += 1
  })

  return {
    total: list.length,
    completed,
    open: Math.max(0, list.length - completed),
    overdue,
    upcoming,
  }
}

export function buildReadinessChecklist(event = {}) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const items = READINESS_ITEM_CONFIG.map((config) => {
    const outcome = config.evaluate(hydratedEvent)
    return {
      key: config.key,
      label: config.label,
      status: outcome === null ? 'Not Required' : outcome ? 'Ready' : 'Needs Attention',
    }
  })

  const readyCount = items.filter((item) => item.status === 'Ready').length
  const needsAttention = items.filter((item) => item.status === 'Needs Attention')

  return {
    items,
    readyCount,
    needsAttention,
    needsAttentionCount: needsAttention.length,
    readinessLabel: needsAttention.length === 0 ? 'Ready' : 'Needs Attention',
  }
}

export function buildOrganizerOverview(event = {}, registrations = [], operationsEntries = []) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const financeSummary = buildFinanceSummary(registrations, hydratedEvent)
  const operationsSettlement = buildOperationsSettlementSummary(operationsEntries)
  const budgets = financialPlanTotals(hydratedEvent.financialPlan)
  const tasks = buildTaskSummary(hydratedEvent.planningTasks)
  const partners = buildPartnerSummary(hydratedEvent.partnerRecords)
  const readiness = buildReadinessChecklist(hydratedEvent)
  const projectedCashPosition = (budgets.projectedRegistrationIncome || 0) + partners.confirmedCashSponsors - budgets.totalBudget
  const totalOutstandingCommitments = partners.outstandingBalance + operationsSettlement.outstandingCommitments

  return {
    financeSummary,
    operationsSettlement,
    budgets,
    tasks,
    partners,
    readiness,
    projectedCashPosition,
    totalOutstandingCommitments,
    budgetSummary: `${formatCurrency(budgets.totalBudget)} budgeted`,
  }
}

export function daysUntilEvent(eventDate) {
  const date = dateFromValue(eventDate)
  if (!date) return null
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysUntilEvent(eventDate) {
  const days = daysUntilEvent(eventDate)
  if (days === null) return 'Date not set'
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Today'
  if (days === 1) return '1 day away'
  return `${days} days away`
}

