import { buildEventReadiness } from './eventReadiness.js'
import {
  buildFinanceClassificationContext,
  buildFinanceSummary,
  classifyRegistrationFinance,
  financeWarnings,
  formatCurrency,
} from './financeUtils.js'
import {
  buildOperationsControlSummary,
  buildOperationsEntryCounts,
  buildOperationsTotals,
} from './operationsReport.js'
import { normalizePaymentStatus } from './paymentStatus.js'
import {
  buildRegistrationMetrics,
  countTotalGuests,
  formatRegistrationGuestSummary,
} from './registrationMetrics.js'
import { dateFromValue } from './dateUtils.js'
import { normalizeTicketCode } from './ticketUtils.js'

const PREVIEW_LIMIT = 5

function sampleNames(rows = [], limit = PREVIEW_LIMIT) {
  return rows
    .slice(0, limit)
    .map((row) => row?.fullName || row?.buyerName || row?.label || row?.category || 'Unknown record')
}

function sampleLedgerLabels(rows = [], limit = PREVIEW_LIMIT) {
  return rows
    .slice(0, limit)
    .map((row) => row?.label || row?.category || row?.paidByOrPaidTo || 'Ledger item')
}

function countDuplicateContactRows(registrations = []) {
  const emailCounts = new Map()
  const phoneCounts = new Map()

  registrations.forEach((registration) => {
    const email = String(registration?.email || '').trim().toLowerCase()
    const phone = String(registration?.phone || '').trim().toLowerCase()
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
  })

  return registrations.filter((registration) => {
    const email = String(registration?.email || '').trim().toLowerCase()
    const phone = String(registration?.phone || '').trim().toLowerCase()
    return (email && (emailCounts.get(email) || 0) > 1) || (phone && (phoneCounts.get(phone) || 0) > 1)
  })
}

function buildFollowUpItem({
  key,
  label,
  count,
  explanation,
  to,
  preview = [],
}) {
  return {
    key,
    label,
    count,
    explanation,
    to,
    preview,
    remainingCount: Math.max(0, count - preview.length),
  }
}

function getEventTiming(event = {}, asOf = new Date()) {
  const eventDate = dateFromValue(event?.eventDate)
  const status = String(event?.status || '').toLowerCase()
  const isCompleted = status === 'completed'
  const isCancelled = status === 'cancelled'
  const isPast = Boolean(eventDate && eventDate.getTime() < asOf.getTime())
  const isPostEvent = !isCancelled && (isCompleted || isPast)

  return {
    status,
    eventDate,
    isCompleted,
    isCancelled,
    isPast,
    isPostEvent,
    sectionTitle: isPostEvent ? 'Post-Event Summary' : 'Current Event Summary',
    sectionEyebrow: isPostEvent ? 'Post-event reporting' : 'Readiness snapshot',
  }
}

function buildRegistrationPaymentBreakdown(registrations = [], event = {}) {
  const summary = buildFinanceSummary(registrations, event)
  const financeContext = buildFinanceClassificationContext(registrations, event)
  let doorListCount = 0
  let partialPaymentCount = 0
  let unknownCount = 0
  let paymentFollowUpCount = 0
  let dataReviewCount = 0
  let prominentDataReviewCount = 0
  let actionRequiredCount = 0
  let internalCleanupCount = 0
  let historicalLimitationCount = 0
  let informationalOnlyCount = 0
  let paidAmountNotRecordedCount = 0
  let financeWarningCount = 0

  registrations.forEach((registration) => {
    const paymentStatus = normalizePaymentStatus(registration?.paymentStatus)
    const finance = classifyRegistrationFinance(registration, event, financeContext)
    const warnings = financeWarnings(registration, event)

    if (paymentStatus === 'door-list') doorListCount += 1
    if (finance.statusGroup === 'partial') partialPaymentCount += 1
    if (paymentStatus === 'unknown') unknownCount += 1
    if (finance.paymentFollowUpRequired) paymentFollowUpCount += 1
    if (finance.dataReviewRequired) dataReviewCount += 1
    if (finance.dataReviewProminent) prominentDataReviewCount += 1
    if (finance.dataReviewActionRequired) actionRequiredCount += 1
    if (finance.dataReviewInternalCleanup) internalCleanupCount += 1
    if (finance.dataReviewHistoricalLimitation) historicalLimitationCount += 1
    if (finance.dataReviewInformationalOnly) informationalOnlyCount += 1
    if (finance.dataReviewCategoryKeys.includes('paid-amount-not-recorded')) paidAmountNotRecordedCount += 1
    if (warnings.length > 0) financeWarningCount += 1
  })

  return {
    ...summary,
    doorListCount,
    partialPaymentCount,
    unknownCount,
    paymentFollowUpCount,
    dataReviewCount,
    prominentDataReviewCount,
    actionRequiredCount,
    internalCleanupCount,
    historicalLimitationCount,
    informationalOnlyCount,
    paidAmountNotRecordedCount,
    pricingReviewCount: dataReviewCount,
    financeWarningCount,
  }
}

function buildLedgerBreakdown(entries = [], currency = 'BBD') {
  const totals = buildOperationsTotals(entries)
  const counts = buildOperationsEntryCounts(entries)
  const control = buildOperationsControlSummary(entries)

  let receivedIncome = 0
  let paidExpenses = 0
  let paidRefunds = 0

  entries.forEach((entry) => {
    if (entry?.status === 'cancelled') return
    const amount = Number(entry?.amount) || 0
    if (entry?.entryType === 'income' && entry?.status === 'received') receivedIncome += amount
    if (entry?.entryType === 'expense' && entry?.status === 'paid') paidExpenses += amount
    if (entry?.entryType === 'refund' && entry?.status === 'paid') paidRefunds += amount
  })

  return {
    currency,
    totals,
    counts,
    control,
    receivedIncome,
    pendingIncome: control.pendingIncome,
    paidExpenses,
    pendingExpenses: control.pendingExpenses,
    paidRefunds,
    pendingRefunds: control.pendingRefunds,
  }
}

function buildTicketCoverage(registrations = []) {
  const assignedRows = registrations.filter((registration) => normalizeTicketCode(registration?.ticketCode))
  const missingRows = registrations.filter((registration) => !normalizeTicketCode(registration?.ticketCode))
  const paidMissingRows = registrations.filter((registration) => {
    const paymentStatus = normalizePaymentStatus(registration?.paymentStatus)
    return !normalizeTicketCode(registration?.ticketCode) && (paymentStatus === 'paid' || paymentStatus === 'door')
  })

  return {
    assignedCount: assignedRows.length,
    missingCount: missingRows.length,
    paidMissingCount: paidMissingRows.length,
    assignedPercent: registrations.length > 0 ? Math.round((assignedRows.length / registrations.length) * 100) : 0,
  }
}

function buildAttendanceSummary(registrations = []) {
  const metrics = buildRegistrationMetrics(registrations)
  return {
    checkedInRegistrations: metrics.checkedInRegistrations,
    checkedInGuests: metrics.checkedInPersons,
    attendanceRate: metrics.totalPersons > 0 ? Math.round((metrics.checkedInPersons / metrics.totalPersons) * 100) : 0,
  }
}

export function buildEventReview(event = null, registrations = [], operationsEntries = [], options = {}) {
  const asOf = options?.asOf || new Date()
  const rows = Array.isArray(registrations) ? registrations : []
  const ledgerRows = Array.isArray(operationsEntries) ? operationsEntries : []

  if (!event?.eventId) {
    return {
      hasEvent: false,
      timing: getEventTiming({}, asOf),
      followUp: { items: [], unresolvedCount: 0 },
      paymentReview: null,
      summary: null,
      readiness: buildEventReadiness(null, [], []),
    }
  }

  const timing = getEventTiming(event, asOf)
  const readiness = buildEventReadiness(event, rows, ledgerRows)
  const metrics = buildRegistrationMetrics(rows, event)
  const finance = buildRegistrationPaymentBreakdown(rows, event)
  const financeContext = buildFinanceClassificationContext(rows, event)
  const ledger = buildLedgerBreakdown(ledgerRows, finance.currency)
  const ticketCoverage = buildTicketCoverage(rows)
  const attendance = buildAttendanceSummary(rows)
  const missingContactRows = rows.filter((registration) => !String(registration?.email || '').trim() && !String(registration?.phone || '').trim())
  const duplicateContactRows = countDuplicateContactRows(rows)
  const paymentReviewRows = rows.filter((registration) => classifyRegistrationFinance(registration, event, financeContext).paymentFollowUpRequired)
  const incompleteFinanceRows = rows.filter((registration) => classifyRegistrationFinance(registration, event, financeContext).dataReviewProminent)
  const paidMissingTicketRows = rows.filter((registration) => {
    const paymentStatus = normalizePaymentStatus(registration?.paymentStatus)
    return !normalizeTicketCode(registration?.ticketCode) && (paymentStatus === 'paid' || paymentStatus === 'door')
  })
  const otherMissingTicketRows = rows.filter((registration) => {
    const paymentStatus = normalizePaymentStatus(registration?.paymentStatus)
    return !normalizeTicketCode(registration?.ticketCode) && paymentStatus !== 'paid' && paymentStatus !== 'door'
  })
  const openLedgerRows = ledgerRows.filter((entry) => entry?.status === 'pending' || entry?.status === 'expected')

  const followUpItems = []

  if (missingContactRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'missing-contact',
      label: 'Missing contact information',
      count: missingContactRows.length,
      explanation: 'These registrations have neither a usable email address nor a phone number for follow-up.',
      to: '/registrations',
      preview: sampleNames(missingContactRows),
    }))
  }

  if (paymentReviewRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'payment-review',
      label: 'Payment Follow-Up',
      count: paymentReviewRows.length,
      explanation: 'These registrations still look unresolved for payment collection or balance follow-up.',
      to: '/registrations',
      preview: sampleNames(paymentReviewRows),
    }))
  }

  if (paidMissingTicketRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'paid-missing-ticket',
      label: 'Paid registrations missing tickets',
      count: paidMissingTicketRows.length,
      explanation: 'These registrations appear paid but still do not have ticket codes assigned.',
      to: '/tickets',
      preview: sampleNames(paidMissingTicketRows),
    }))
  }

  if (otherMissingTicketRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'other-missing-ticket',
      label: 'Other registrations missing tickets',
      count: otherMissingTicketRows.length,
      explanation: 'These registrations still need ticket assignment before event-day use.',
      to: '/tickets',
      preview: sampleNames(otherMissingTicketRows),
    }))
  }

  if (incompleteFinanceRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'data-review',
      label: 'Active finance review',
      count: incompleteFinanceRows.length,
      explanation: 'These registrations do not show money outstanding, but they still need active organizer review or internal cleanup.',
      to: '/registrations',
      preview: sampleNames(incompleteFinanceRows),
    }))
  }

  if (duplicateContactRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'duplicate-contacts',
      label: 'Review repeated contact details',
      count: duplicateContactRows.length,
      explanation: 'These registrations reuse the same email or phone details. Review them in Registrations to decide whether they are group bookings or true duplicates.',
      to: '/registrations?review=duplicate-contacts',
      preview: sampleNames(duplicateContactRows),
    }))
  }

  if (metrics.capacity > 0 && metrics.totalPersons >= Math.ceil(metrics.capacity * 0.85)) {
    const overCapacity = metrics.totalPersons > metrics.capacity
    followUpItems.push(buildFollowUpItem({
      key: 'capacity',
      label: overCapacity ? 'Capacity exceeded' : 'Capacity nearing full',
      count: metrics.totalPersons,
      explanation: overCapacity
        ? `Guest count is above the stated capacity for this event.`
        : `Guest count is at or above 85% of the stated capacity for this event.`,
      to: '/events',
      preview: [],
    }))
  }

  if (openLedgerRows.length > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'open-operations',
      label: 'Open operations items',
      count: openLedgerRows.length,
      explanation: 'These ledger entries are still expected or pending and should be reviewed before the event is considered settled.',
      to: '/operations',
      preview: sampleLedgerLabels(openLedgerRows),
    }))
  }

  if (metrics.totalRegistrations > 0 && attendance.checkedInRegistrations === 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'checkin-not-started',
      label: 'Check-in not started',
      count: metrics.remainingRegistrations,
      explanation: 'No registrations have been checked in yet for the selected Working Event.',
      to: '/check-in',
      preview: [],
    }))
  }

  if (metrics.totalRegistrations > 0 && attendance.checkedInRegistrations > 0 && attendance.checkedInRegistrations < metrics.totalRegistrations) {
    followUpItems.push(buildFollowUpItem({
      key: 'checkin-in-progress',
      label: 'Check-in in progress',
      count: metrics.remainingRegistrations,
      explanation: 'Some registrations are checked in, but others are still waiting.',
      to: '/check-in',
      preview: [],
    }))
  }

  if (metrics.totalRegistrations > 0 && attendance.checkedInRegistrations === metrics.totalRegistrations) {
    followUpItems.push(buildFollowUpItem({
      key: 'checkin-complete',
      label: 'Check-in appears completed',
      count: attendance.checkedInRegistrations,
      explanation: 'All current registration records are marked checked in.',
      to: '/check-in',
      preview: [],
    }))
  }

  const unresolvedCount = followUpItems
    .filter((item) => item.key !== 'checkin-complete')
    .reduce((total, item) => total + item.count, 0)

  if (timing.isPostEvent && unresolvedCount > 0) {
    followUpItems.push(buildFollowUpItem({
      key: 'post-event-unresolved',
      label: 'Past event still has unresolved items',
      count: unresolvedCount,
      explanation: 'This event is completed or in the past, but there are still unresolved registration or operations items to review.',
      to: '/events',
      preview: [],
    }))
  }

  const validCapacity = Number.isInteger(Number(event?.capacity)) && Number(event.capacity) > 0 ? Number(event.capacity) : 0
  const totalGuests = countTotalGuests(rows)
  const capacityUsagePercent = validCapacity > 0 ? Math.round((totalGuests / validCapacity) * 100) : 0
  const comparisonDifference = finance.totalCollected - ledger.receivedIncome

  return {
    hasEvent: true,
    timing,
    readiness,
    followUp: {
      items: followUpItems,
      unresolvedCount,
    },
    paymentReview: {
      explanation: 'Registration payment records track what guests owe and have paid. The Operations Ledger tracks manually recorded event income, expenses, refunds, and adjustments. These are separate records and may not match automatically.',
      registrationRecords: {
        registrationCount: metrics.totalRegistrations,
        guestCount: metrics.totalPersons,
        guestSummary: formatRegistrationGuestSummary(metrics.totalRegistrations, metrics.totalPersons),
        expectedIncome: finance.totalExpected,
        collectedAmount: finance.totalCollected,
        outstandingAmount: finance.totalOutstanding,
        complimentaryRegistrations: metrics.complimentaryRegistrations,
        complimentaryGuests: metrics.complimentaryPersons,
        paymentFollowUpCount: finance.paymentFollowUpCount,
        dataReviewCount: finance.dataReviewCount,
        prominentDataReviewCount: finance.prominentDataReviewCount,
        actionRequiredCount: finance.actionRequiredCount,
        internalCleanupCount: finance.internalCleanupCount,
        historicalLimitationCount: finance.historicalLimitationCount,
        informationalOnlyCount: finance.informationalOnlyCount,
        paidAmountNotRecordedCount: finance.paidAmountNotRecordedCount,
        pendingCount: metrics.pendingRegistrations,
        partialPaymentCount: finance.partialPaymentCount,
        paidCount: finance.paidRegistrations,
        doorPaidCount: metrics.doorRegistrations,
        doorListCount: finance.doorListCount,
        unknownCount: finance.unknownCount,
        pricingReviewCount: finance.pricingReviewCount,
        financeWarningCount: finance.financeWarningCount,
      },
      operationsLedger: {
        incomeReceived: ledger.receivedIncome,
        incomePending: ledger.pendingIncome,
        expensesPaid: ledger.paidExpenses,
        expensesPending: ledger.pendingExpenses,
        refundsPaid: ledger.paidRefunds,
        refundsPending: ledger.pendingRefunds,
        adjustments: ledger.totals.adjustments,
        cancelledItems: ledger.counts.cancelled,
        openItemCount: ledger.control.openEntries,
        netPosition: ledger.totals.net,
      },
      comparison: {
        label: 'Boundary comparison for review only',
        registrationCollected: finance.totalCollected,
        ledgerReceivedIncome: ledger.receivedIncome,
        difference: comparisonDifference,
        note: 'Registration payments and Operations income are separate record sets. Do not add them together or treat the difference as a reconciliation result unless each overlapping entry has been manually confirmed.',
      },
    },
    summary: {
      title: timing.sectionTitle,
      eyebrow: timing.sectionEyebrow,
      eventName: event?.eventName || 'Selected event',
      eventStatus: event?.status || 'unknown',
      capacity: validCapacity,
      registrationCount: metrics.totalRegistrations,
      guestCount: totalGuests,
      paidCount: finance.paidRegistrations,
      pendingCount: metrics.pendingRegistrations,
      partialPaymentCount: finance.partialPaymentCount,
      complimentaryCount: metrics.complimentaryRegistrations,
      doorListCount: finance.doorListCount,
      unknownCount: finance.unknownCount,
      ticketCoverage,
      checkedInRegistrations: attendance.checkedInRegistrations,
      checkedInGuests: attendance.checkedInGuests,
      attendanceRate: attendance.attendanceRate,
      capacityUsagePercent,
      operationsIncome: ledger.totals.income,
      operationsExpenses: ledger.totals.expenses,
      operationsRefunds: ledger.totals.refunds,
      operationsAdjustments: ledger.totals.adjustments,
      operationsNetPosition: ledger.totals.net,
      openOperationsItems: ledger.control.openEntries,
      incompleteDataWarnings: missingContactRows.length + finance.prominentDataReviewCount + duplicateContactRows.length,
      attendanceNote: 'Guest attendance is based on the full personsAttending value of each checked-in registration record. Group registrations are not scanned guest-by-guest.',
    },
  }
}

export function formatEventReviewMoney(value, currency = 'BBD') {
  return formatCurrency(value, currency)
}
