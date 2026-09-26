import { buildEventReadiness } from '../../../utils/eventReadiness.js'
import { buildFinanceSummary } from '../../../utils/financeUtils.js'
import { buildRegistrationMetrics } from '../../../utils/registrationMetrics.js'
import { buildTaskWorkflowSummary } from '../../../utils/taskWorkflow.js'

function dateFromTimestamp(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildRecentActivity({ event, registrations = [], operationsEntries = [] } = {}) {
  const activity = []

  if (event?.updatedAt || event?.createdAt) {
    activity.push({
      key: 'event-updated',
      label: event.eventName || 'Event',
      action: 'Event details updated',
      actor: 'Organizer workspace',
      source: 'Events',
      date: dateFromTimestamp(event.updatedAt || event.createdAt),
      to: '/events',
    })
  }

  registrations.slice(0, 6).forEach((registration) => {
    const date = dateFromTimestamp(registration.updatedAt || registration.createdAt || registration.timestamp)
    if (!date) return
    activity.push({
      key: `registration-${registration.registrationId || registration.id || date.getTime()}`,
      label: registration.fullName || registration.buyerName || 'Registration',
      action: registration.ticketCode ? 'Registration and ticket record updated' : 'Registration record updated',
      actor: registration.updatedByName || registration.updatedBy || registration.createdByName || 'Organizer',
      source: 'Guests & Registrations',
      date,
      to: '/registrations',
    })
  })

  operationsEntries.slice(0, 6).forEach((entry) => {
    const date = dateFromTimestamp(entry.updatedAt || entry.createdAt)
    if (!date) return
    activity.push({
      key: `operations-${entry.entryId || entry.id || date.getTime()}`,
      label: entry.label || 'Operations ledger entry',
      action: 'Operations entry updated',
      actor: entry.updatedByName || entry.updatedBy || entry.createdByName || 'Organizer',
      source: 'Operations',
      date,
      to: '/operations',
    })
  })

  return activity
    .filter((item) => item.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
}

export function buildDashboardOverviewModel({
  event,
  registrations = [],
  registrationSummary = null,
  operationsEntries = [],
  runOfShowItems = [],
  resources = [],
  tasks = [],
} = {}) {
  const rowMetrics = buildRegistrationMetrics(registrations, event)
  const metrics = registrationSummary
    ? {
        ...rowMetrics,
        totalRegistrations: registrationSummary.totalRegistrations,
        checkedInRegistrations: registrationSummary.checkedIn,
        remainingRegistrations: registrationSummary.notCheckedIn,
        capacityPercent: rowMetrics.capacity > 0
          ? Math.min(100, Math.round((rowMetrics.capacityUsed / rowMetrics.capacity) * 100))
          : 0,
      }
    : rowMetrics
  return {
    metrics,
    financeSummary: buildFinanceSummary(registrations, event),
    readiness: buildEventReadiness(event, registrations, operationsEntries, runOfShowItems, resources),
    taskSummary: buildTaskWorkflowSummary(tasks),
    recentActivity: buildRecentActivity({ event, registrations, operationsEntries }),
  }
}
