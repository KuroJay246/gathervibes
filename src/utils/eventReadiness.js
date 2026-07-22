import { classifyRegistrationFinance } from './financeUtils.js'
import { buildRegistrationMetrics } from './registrationMetrics.js'
import {
  buildOperationsControlSummary,
  buildOperationsEntryCounts,
  buildOperationsTotals,
} from './operationsReport.js'

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

  const rows = Array.isArray(registrations) ? registrations : []
  const metrics = buildRegistrationMetrics(rows, event)
  const operationsTotals = buildOperationsTotals(operationsEntries)
  const operationsCounts = buildOperationsEntryCounts(operationsEntries)
  const operationsSummary = buildOperationsControlSummary(operationsEntries)

  let pendingPayments = 0
  let paidMissingTicket = 0
  let missingTicket = 0
  let missingContact = 0
  let reviewNeeded = 0

  rows.forEach((registration) => {
    const finance = classifyRegistrationFinance(registration, event)
    if (finance.paymentFollowUpRequired) pendingPayments += 1
    if (!registration.ticketCode) missingTicket += 1
    if ((finance.paymentStatus === 'paid' || finance.paymentStatus === 'door') && !registration.ticketCode) paidMissingTicket += 1
    if (!String(registration.email || '').trim() && !String(registration.phone || '').trim()) missingContact += 1
    if (finance.dataReviewRequired || registration.financeReviewRequired) reviewNeeded += 1
  })

  const duplicateContactRows = countDuplicateContactRows(rows)
  const dataQualityWarnings = missingContact + duplicateContactRows
  const checkInStarted = metrics.checkedInRegistrations > 0
  const checkInPercent = metrics.totalRegistrations > 0
    ? Math.round((metrics.checkedInRegistrations / metrics.totalRegistrations) * 100)
    : 0

  const categories = [
    buildCategory(
      'guest-data',
      'Guest data completeness',
      dataQualityWarnings > 0 ? (missingContact > 0 ? 'needs-attention' : 'review') : 'ready',
      dataQualityWarnings > 0
        ? `${missingContact} missing contact, ${duplicateContactRows} possible duplicate contact row${duplicateContactRows === 1 ? '' : 's'}`
        : 'Contact details look usable for the current event.',
    ),
    buildCategory(
      'payment',
      'Payment readiness',
      pendingPayments > 0 ? 'needs-attention' : reviewNeeded > 0 ? 'review' : 'ready',
      pendingPayments > 0
        ? `${pendingPayments} registration${pendingPayments === 1 ? '' : 's'} still need payment follow-up.`
        : reviewNeeded > 0
          ? `${reviewNeeded} registration${reviewNeeded === 1 ? '' : 's'} still need internal finance data review.`
          : 'Payments look settled or intentionally complimentary.',
    ),
    buildCategory(
      'tickets',
      'Ticket readiness',
      paidMissingTicket > 0 ? 'needs-attention' : missingTicket > 0 ? 'review' : 'ready',
      paidMissingTicket > 0
        ? `${paidMissingTicket} paid registration${paidMissingTicket === 1 ? '' : 's'} still missing ticket code${paidMissingTicket === 1 ? '' : 's'}.`
        : missingTicket > 0
          ? `${missingTicket} registration${missingTicket === 1 ? '' : 's'} still need ticket assignment.`
          : 'Ticket assignment looks complete for current registrations.',
    ),
    buildCategory(
      'capacity',
      'Capacity status',
      metrics.capacityPercent >= 100 ? 'needs-attention' : metrics.capacityPercent >= 85 ? 'review' : 'ready',
      Number(event.capacity) > 0
        ? `${metrics.capacityUsed} of ${event.capacity} planned guests used (${metrics.capacityPercent}%).`
        : 'No capacity warning available for this event yet.',
    ),
    buildCategory(
      'operations',
      'Operations status',
      operationsSummary.openEntries > 0 ? 'review' : operationsEntries.length > 0 ? 'ready' : 'review',
      operationsEntries.length === 0
        ? 'No operations ledger entries yet.'
        : operationsSummary.openEntries > 0
          ? `${operationsSummary.openEntries} ledger item${operationsSummary.openEntries === 1 ? '' : 's'} still open or pending.`
          : `Net operations position is ${operationsTotals.net >= 0 ? 'positive or balanced' : 'negative'} for current entries.`,
    ),
    buildCategory(
      'check-in',
      'Check-in status',
      checkInStarted ? 'ready' : event.status === 'active' && metrics.totalRegistrations > 0 ? 'review' : 'ready',
      metrics.totalRegistrations === 0
        ? 'No registrations yet to check in.'
        : checkInStarted
          ? `${metrics.checkedInRegistrations} of ${metrics.totalRegistrations} registrations checked in (${checkInPercent}%).`
          : 'Check-in has not started yet for current registrations.',
    ),
  ]

  const actionItems = []

  if (pendingPayments > 0) {
    actionItems.push({
      key: 'pending-payments',
      label: 'Payment Follow-Up',
      statusLabel: 'Needs attention',
      summary: `${pendingPayments} registration${pendingPayments === 1 ? '' : 's'} still need payment follow-up or balance resolution.`,
      to: '/registrations',
      linkLabel: 'Open Registrations',
    })
  }
  if (paidMissingTicket > 0 || missingTicket > 0) {
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
      summary: `${dataQualityWarnings} contact/duplicate warning${dataQualityWarnings === 1 ? '' : 's'} and ${reviewNeeded} finance data-review row${reviewNeeded === 1 ? '' : 's'}.`,
      to: duplicateContactRows > 0 ? '/registrations?review=duplicate-contacts' : '/registrations',
      linkLabel: duplicateContactRows > 0 ? 'Review repeated contacts' : 'Open Registrations',
    })
  }
  if (metrics.capacityPercent >= 85) {
    actionItems.push({
      key: 'capacity-warning',
      label: 'Review',
      statusLabel: metrics.capacityPercent >= 100 ? 'Needs attention' : 'Review',
      summary: `Capacity is at ${metrics.capacityPercent}% for the current guest count.`,
      to: '/events',
      linkLabel: 'Open Events',
    })
  }
  if (operationsEntries.length > 0) {
    actionItems.push({
      key: 'operations-summary',
      label: operationsSummary.openEntries > 0 ? 'Review' : 'Ready',
      statusLabel: operationsSummary.openEntries > 0 ? 'Review' : 'Ready',
      summary: operationsSummary.openEntries > 0
        ? `${operationsSummary.openEntries} operations item${operationsSummary.openEntries === 1 ? '' : 's'} still open in the ledger.`
        : 'Operations net summary is ready for review.',
      to: '/operations',
      linkLabel: 'Open Operations',
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
    counts: {
      pendingPayments,
      paidMissingTicket,
      missingTicket,
      missingContact,
      reviewNeeded,
      duplicateContactRows,
      dataQualityWarnings,
      checkInPercent,
    },
  }
}
