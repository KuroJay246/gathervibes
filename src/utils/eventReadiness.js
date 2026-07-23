import { buildFinanceClassificationContext, classifyRegistrationFinance } from './financeUtils.js'
import { buildRegistrationMetrics } from './registrationMetrics.js'
import {
  buildOperationsControlSummary,
  buildOperationsEntryCounts,
  buildOperationsTotals,
} from './operationsReport.js'
import {
  buildOrganizerOverview,
  hydrateEventForPlanning,
  isCompletedEvent,
  isEventDayStatus,
  isPlanningEvent,
} from './eventPlanning.js'

function countDuplicateContactRows(registrations = []) {
  const emailCounts = new Map()
  const phoneCounts = new Map()

  registrations.forEach((registration) => {
    const email = String(registration.email || '').trim().toLowerCase()
    const phone = String(registration.phone || '').trim().toLowerCase()

    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
  })

  let duplicateRows = 0

  registrations.forEach((registration) => {
    const email = String(registration.email || '').trim().toLowerCase()
    const phone = String(registration.phone || '').trim().toLowerCase()
    if ((email && (emailCounts.get(email) || 0) > 1) || (phone && (phoneCounts.get(phone) || 0) > 1)) {
      duplicateRows += 1
    }
  })

  return duplicateRows
}

function statusWeight(status = 'ready') {
  if (status === 'needs-attention') return 0
  if (status === 'review') return 1
  return 2
}

function statusLabel(status = 'ready') {
  if (status === 'needs-attention') return 'Needs attention'
  if (status === 'review') return 'Review'
  return 'Ready'
}

function buildCategory(key, label, status, summary) {
  return {
    key,
    label,
    status,
    statusLabel: statusLabel(status),
    summary,
  }
}

export function buildEventReadiness(event = null, registrations = [], operationsEntries = []) {
  if (!event?.eventId) {
    return {
      hasEvent: false,
      readinessScore: 0,
      readinessLabel: 'Review',
      needsAttentionCount: 0,
      categories: [],
      actionItems: [],
      metrics: buildRegistrationMetrics([], null),
      operationsTotals: buildOperationsTotals([]),
      operationsCounts: buildOperationsEntryCounts([]),
      operationsSummary: buildOperationsControlSummary([]),
    }
  }

  const hydratedEvent = hydrateEventForPlanning(event)
  const rows = Array.isArray(registrations) ? registrations : []
  const metrics = buildRegistrationMetrics(rows, hydratedEvent)
  const operationsTotals = buildOperationsTotals(operationsEntries)
  const operationsCounts = buildOperationsEntryCounts(operationsEntries)
  const operationsSummary = buildOperationsControlSummary(operationsEntries)
  const financeContext = buildFinanceClassificationContext(rows, hydratedEvent)
  const planningOverview = buildOrganizerOverview(hydratedEvent, rows, operationsEntries)
  const completedEvent = isCompletedEvent(hydratedEvent)
  const eventDayMode = isEventDayStatus(hydratedEvent)
  const planningMode = isPlanningEvent(hydratedEvent)

  let pendingPayments = 0
  let paidMissingTicket = 0
  let missingTicket = 0
  let missingContact = 0
  let reviewNeeded = 0
  let historicalReviewCount = 0

  rows.forEach((registration) => {
    const finance = classifyRegistrationFinance(registration, event, financeContext)
    if (finance.paymentFollowUpRequired) pendingPayments += 1
    if (!registration.ticketCode) missingTicket += 1
    if ((finance.paymentStatus === 'paid' || finance.paymentStatus === 'door') && !registration.ticketCode) paidMissingTicket += 1
    if (!String(registration.email || '').trim() && !String(registration.phone || '').trim()) missingContact += 1
    if (finance.dataReviewProminent || registration.financeReviewRequired) reviewNeeded += 1
    if (finance.dataReviewHistoricalLimitation) historicalReviewCount += 1
  })

  const duplicateContactRows = countDuplicateContactRows(rows)
  const dataQualityWarnings = missingContact + duplicateContactRows
  const checkInStarted = metrics.checkedInRegistrations > 0
  const checkInPercent = metrics.totalRegistrations > 0
    ? Math.round((metrics.checkedInRegistrations / metrics.totalRegistrations) * 100)
    : 0

  const categories = [
    buildCategory(
      'event-setup',
      'Event setup',
      planningOverview.readiness.items.some((item) => item.key === 'eventDateEntered' && item.status !== 'Ready')
        || planningOverview.readiness.items.some((item) => item.key === 'capacityEntered' && item.status !== 'Ready')
        || planningOverview.readiness.items.some((item) => item.key === 'venueConfirmed' && item.status === 'Needs Attention')
        ? 'needs-attention'
        : 'ready',
      completedEvent
        ? 'This event is in completed-history mode.'
        : `${hydratedEvent.venueName || 'Venue not set'} · ${hydratedEvent.location || 'Location not set'} · ${hydratedEvent.eventStartTime || 'Start time not set'}`,
    ),
    buildCategory(
      'registration',
      'Registration and tickets',
      completedEvent
        ? 'ready'
        : pendingPayments > 0 || paidMissingTicket > 0
          ? 'needs-attention'
          : missingTicket > 0 || reviewNeeded > 0
            ? 'review'
            : 'ready',
      completedEvent
        ? 'Registration reminders are no longer treated as active work for this completed event.'
        : pendingPayments > 0
          ? `${pendingPayments} registration${pendingPayments === 1 ? '' : 's'} still need payment follow-up.`
          : paidMissingTicket > 0
            ? `${paidMissingTicket} paid registration${paidMissingTicket === 1 ? '' : 's'} still need ticket assignment.`
            : 'Registration and ticket setup look usable for this event.',
    ),
    buildCategory(
      'money',
      'Budget and commitments',
      completedEvent
        ? planningOverview.totalOutstandingCommitments > 0 ? 'review' : 'ready'
        : planningOverview.totalOutstandingCommitments > 0
          ? 'review'
          : planningOverview.budgets.totalBudget > 0 || planningOverview.budgets.projectedRegistrationIncome > 0
            ? 'ready'
            : 'needs-attention',
      completedEvent
        ? `${planningOverview.partners.outstandingBalance > 0 ? formatMoney(planningOverview.partners.outstandingBalance) : 'No'} partner balance remains open.`
        : planningOverview.budgets.totalBudget > 0
          ? `${formatMoney(planningOverview.budgets.totalBudget)} budgeted and ${formatMoney(planningOverview.totalOutstandingCommitments)} still outstanding.`
          : 'Budget categories still need to be entered.',
    ),
    buildCategory(
      'partners',
      'Partners and sponsors',
      completedEvent
        ? planningOverview.partners.outstandingBalance > 0 ? 'review' : 'ready'
        : planningOverview.partners.totalRecords === 0
          ? 'needs-attention'
          : planningOverview.partners.openFollowUps > 0
            ? 'review'
            : 'ready',
      planningOverview.partners.totalRecords === 0
        ? 'No suppliers, sponsors, venue contacts, bakers, or helpers are recorded yet.'
        : `${planningOverview.partners.totalRecords} contact or commitment record${planningOverview.partners.totalRecords === 1 ? '' : 's'} in Operations.`,
    ),
    buildCategory(
      'tasks',
      'Planning tasks',
      completedEvent
        ? planningOverview.tasks.open > 0 ? 'review' : 'ready'
        : planningOverview.tasks.total === 0
          ? 'needs-attention'
          : planningOverview.tasks.overdue > 0
            ? 'needs-attention'
            : planningOverview.tasks.open > 0
              ? 'review'
              : 'ready',
      planningOverview.tasks.total === 0
        ? 'No organizer planning tasks have been added yet.'
        : `${planningOverview.tasks.completed} complete, ${planningOverview.tasks.overdue} overdue, ${planningOverview.tasks.upcoming} upcoming.`,
    ),
    buildCategory(
      'event-day',
      completedEvent ? 'Closeout' : eventDayMode ? 'Event Day' : 'Readiness checklist',
      completedEvent
        ? planningOverview.totalOutstandingCommitments > 0 ? 'review' : 'ready'
        : eventDayMode
          ? checkInStarted ? 'ready' : 'review'
          : planningOverview.readiness.needsAttentionCount > 0
            ? 'review'
            : 'ready',
      completedEvent
        ? 'Use Reports and Operations for final results, unpaid commitments, sponsor support, and closeout.'
        : eventDayMode
          ? metrics.totalRegistrations === 0
            ? 'Event day is active, but no registrations are loaded yet.'
            : checkInStarted
              ? `${metrics.checkedInRegistrations} of ${metrics.totalRegistrations} registrations checked in (${checkInPercent}%).`
              : 'Event day is active. Tickets, Check-In, contacts, and timeline should be front-and-center.'
          : `${planningOverview.readiness.readyCount} readiness item${planningOverview.readiness.readyCount === 1 ? '' : 's'} marked ready.`,
    ),
  ]

  const actionItems = []

  if (!completedEvent && planningMode && planningOverview.readiness.items.some((item) => item.key === 'venueConfirmed' && item.status !== 'Ready')) {
    actionItems.push({
      key: 'venue-setup',
      label: 'Confirm venue details',
      statusLabel: 'Needs attention',
      summary: 'Add or confirm the venue, location, and access timing so the event plan is actionable.',
      to: '/events',
      linkLabel: 'Open Events',
    })
  }
  if (!completedEvent && planningOverview.tasks.overdue > 0) {
    actionItems.push({
      key: 'overdue-tasks',
      label: 'Overdue planning tasks',
      statusLabel: 'Needs attention',
      summary: `${planningOverview.tasks.overdue} planning task${planningOverview.tasks.overdue === 1 ? '' : 's'} are overdue.`,
      to: '/events',
      linkLabel: 'Open Events',
    })
  }
  if (!completedEvent && planningOverview.partners.totalRecords === 0) {
    actionItems.push({
      key: 'partners-missing',
      label: 'Add partners and commitments',
      statusLabel: 'Needs attention',
      summary: 'Suppliers, sponsors, bakers, vendors, venue contacts, and helpers are not recorded yet.',
      to: '/operations',
      linkLabel: 'Open Operations',
    })
  }
  if (!completedEvent && pendingPayments > 0) {
    actionItems.push({
      key: 'pending-payments',
      label: 'Payment Follow-Up',
      statusLabel: 'Needs attention',
      summary: `${pendingPayments} registration${pendingPayments === 1 ? '' : 's'} still need payment follow-up or balance resolution.`,
      to: '/payments',
      linkLabel: 'Open Payments',
    })
  }
  if (!completedEvent && (paidMissingTicket > 0 || missingTicket > 0)) {
    actionItems.push({
      key: 'missing-tickets',
      label: 'Missing ticket',
      statusLabel: paidMissingTicket > 0 ? 'Needs attention' : 'Review',
      summary: `${paidMissingTicket || missingTicket} registration${(paidMissingTicket || missingTicket) === 1 ? '' : 's'} still need ticket work.`,
      to: '/tickets',
      linkLabel: 'Open Tickets',
    })
  }
  if (dataQualityWarnings > 0 || reviewNeeded > 0) {
    actionItems.push({
      key: 'data-incomplete',
      label: 'Data Review',
      statusLabel: missingContact > 0 ? 'Needs attention' : 'Review',
      summary: `${dataQualityWarnings} contact/duplicate warning${dataQualityWarnings === 1 ? '' : 's'} and ${reviewNeeded} active finance review row${reviewNeeded === 1 ? '' : 's'}.`,
      to: duplicateContactRows > 0 ? '/registrations?review=duplicate-contacts' : '/registrations',
      linkLabel: duplicateContactRows > 0 ? 'Review repeated contacts' : 'Open Registrations',
    })
  }
  if (!completedEvent && metrics.capacityPercent >= 85) {
    actionItems.push({
      key: 'capacity-warning',
      label: 'Review',
      statusLabel: metrics.capacityPercent >= 100 ? 'Needs attention' : 'Review',
      summary: `Capacity is at ${metrics.capacityPercent}% for the current guest count.`,
      to: '/events',
      linkLabel: 'Open Events',
    })
  }
  if (planningOverview.totalOutstandingCommitments > 0 || operationsEntries.length > 0) {
    actionItems.push({
      key: 'operations-summary',
      label: planningOverview.totalOutstandingCommitments > 0 ? 'Review' : 'Ready',
      statusLabel: planningOverview.totalOutstandingCommitments > 0 ? 'Review' : 'Ready',
      summary: planningOverview.totalOutstandingCommitments > 0
        ? `${formatMoney(planningOverview.totalOutstandingCommitments)} is still outstanding across partner commitments and open operations.`
        : 'Operations and commitment summaries are ready for review.',
      to: '/operations',
      linkLabel: 'Open Operations',
    })
  }
  if (completedEvent) {
    actionItems.unshift({
      key: 'completed-event',
      label: 'Completed event review',
      statusLabel: 'Ready',
      summary: 'This event is in completed-history mode. Use Reports for final results and Operations for baker or supplier closeout.',
      to: '/event-review',
      linkLabel: 'Open Reports',
    })
  }

  const readinessScore = categories.reduce((total, category) => total + statusWeight(category.status), 0)
  const needsAttentionCount = categories.filter((category) => category.status !== 'ready').length
  const readinessLabel = needsAttentionCount === 0 ? 'Ready' : categories.some((category) => category.status === 'needs-attention') ? 'Needs attention' : 'Review'

  return {
    hasEvent: true,
    readinessScore,
    readinessLabel,
    needsAttentionCount,
    categories,
    actionItems,
    metrics,
    operationsTotals,
    operationsCounts,
    operationsSummary,
    planningOverview,
    counts: {
      pendingPayments,
      paidMissingTicket,
      missingTicket,
      missingContact,
      reviewNeeded,
      historicalReviewCount,
      duplicateContactRows,
      dataQualityWarnings,
      checkInPercent,
    },
  }
}

function formatMoney(value) {
  return `BBD $${Number(value || 0).toFixed(2)}`
}
