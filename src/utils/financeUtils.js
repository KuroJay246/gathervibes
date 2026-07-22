import { normalizePaymentStatus } from './paymentStatus.js'
import { normalizePersonsAttending } from './registrationMetrics.js'

export const DEFAULT_CURRENCY = 'BBD'

export const PAYMENT_METHODS = [
  'firstpay',
  'bank-transfer',
  'cash',
  'door',
  'card',
  'complimentary',
  'unknown',
]

export const PAYMENT_METHOD_LABELS = {
  firstpay: 'CIBC 1stPay',
  'bank-transfer': 'Bank transfer',
  cash: 'Cash',
  door: 'Door',
  card: 'Card',
  complimentary: 'Complimentary',
  unknown: 'Unknown',
}

export const DEFAULT_FINANCE_SETTINGS = {
  currency: DEFAULT_CURRENCY,
  defaultTicketPrice: null,
  defaultPriceTier: 'General',
  defaultPaymentMethod: 'unknown',
  allowBlankTicketCodes: true,
  allowDoorPayment: true,
  requirePaymentReferenceForPaidStatus: false,
  showFinanceWarnings: true,
}

export function normalizeCurrency(value) {
  const code = String(value || '').trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : DEFAULT_CURRENCY
}

export function getCurrencyCode(configOrEvent = {}) {
  return normalizeCurrency(configOrEvent?.currency)
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function parseMoney(value) {
  if (value === null || value === undefined || value === '') return null
  const cleaned = String(value).replace(/BBD|USD|\$/gi, '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const number = Number(cleaned)
  return Number.isFinite(number) && number >= 0 ? roundMoney(number) : null
}

function hasRawValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function rawMoneyIssue(value) {
  if (!hasRawValue(value)) return null
  const cleaned = String(value).replace(/BBD|USD|\$/gi, '').replace(/,/g, '').trim()
  const number = Number(cleaned)
  if (!Number.isFinite(number)) return 'invalid'
  if (number < 0) return 'negative'
  return null
}

export function normalizePaymentMethod(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'unknown'
  const normalized = raw.toLowerCase().replace(/[_\s]+/g, '-').replace(/[^a-z0-9-]/g, '')

  if (['firstpay', 'first-pay', 'firstpay-reference'].includes(normalized)) return 'firstpay'
  if (['bank', 'bank-transfer', 'transfer', 'wire', 'banktransfer'].includes(normalized)) return 'bank-transfer'
  if (['cash'].includes(normalized)) return 'cash'
  if (['door', 'pay-at-door', 'door-payment'].includes(normalized)) return 'door'
  if (['card', 'credit-card', 'debit-card'].includes(normalized)) return 'card'
  if (['comp', 'complimentary', 'free'].includes(normalized)) return 'complimentary'
  return PAYMENT_METHODS.includes(normalized) ? normalized : 'unknown'
}

export function formatPaymentMethod(value) {
  return PAYMENT_METHOD_LABELS[normalizePaymentMethod(value)] || PAYMENT_METHOD_LABELS.unknown
}

export function formatCurrency(value, currency = DEFAULT_CURRENCY) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0
  return `${normalizeCurrency(currency)} $${roundMoney(amount).toFixed(2)}`
}

export function defaultTicketPriceForEvent(event = {}) {
  event = event || {}
  const defaultPrice = parseMoney(event.defaultTicketPrice)
  if (defaultPrice !== null) return defaultPrice
  const ticketPrice = parseMoney(event.ticketPrice)
  if (ticketPrice !== null) return ticketPrice
  return null
}

export function calculateRegistrationFinance(registration = {}, event = {}) {
  registration = registration || {}
  event = event || {}
  const personsAttending = normalizePersonsAttending(registration.personsAttending, 1)
  const persons = Number.isNaN(personsAttending) ? 1 : personsAttending
  const paymentStatus = normalizePaymentStatus(registration.paymentStatus)
  const paymentMethod = normalizePaymentMethod(registration.paymentMethod || (paymentStatus === 'door' ? 'door' : paymentStatus === 'complimentary' ? 'complimentary' : 'unknown'))
  const explicitTicketPrice = parseMoney(registration.ticketPrice)
  // We no longer automatically inherit defaultPrice into the registration's calculated ticketPrice/amountDue
  // unless explicitly requested by a configuration in the future.
  const explicitAmountDue = parseMoney(registration.amountDue)
  const amountDue = explicitAmountDue !== null
    ? explicitAmountDue
    : explicitTicketPrice !== null
      ? roundMoney(explicitTicketPrice * persons)
      : null
  const amountPaid = parseMoney(registration.amountPaid) ?? 0
  const balanceDue = parseMoney(registration.balanceDue) ?? (amountDue !== null ? Math.max(0, roundMoney(amountDue - amountPaid)) : null)
  const complimentaryValue = paymentStatus === 'complimentary'
    ? (explicitTicketPrice !== null ? roundMoney(explicitTicketPrice * persons) : amountDue || 0)
    : 0
  const needsFinanceReview = amountDue === null || explicitTicketPrice === null

  return {
    currency: normalizeCurrency(registration.currency || event.currency),
    priceTier: registration.priceTier || event.defaultPriceTier || DEFAULT_FINANCE_SETTINGS.defaultPriceTier,
    ticketPrice: explicitTicketPrice,
    personsAttending: persons,
    amountDue,
    amountPaid,
    balanceDue,
    paymentStatus,
    paymentMethod,
    complimentaryValue,
    needsFinanceReview,
  }
}

export function financePayload(values = {}, event = {}) {
  const computed = calculateRegistrationFinance(values, event)
  return {
    priceTier: String(values.priceTier || computed.priceTier || '').trim() || null,
    ticketPrice: computed.ticketPrice,
    amountDue: computed.amountDue,
    amountPaid: computed.amountPaid,
    balanceDue: computed.balanceDue,
    paymentMethod: computed.paymentMethod,
  }
}

export function financeWarnings(registration = {}, event = {}, options = {}) {
  const computed = calculateRegistrationFinance(registration, event)
  const warnings = []
  const expectedDue = computed.ticketPrice !== null ? roundMoney(computed.ticketPrice * computed.personsAttending) : null

  if (registration.financeReviewRequired && computed.ticketPrice === null) warnings.push('Missing ticket price; review before relying on finance totals.')
  if (registration.financeReviewRequired && computed.amountDue === null) warnings.push('Missing amount due; review before relying on finance totals.')
  if (expectedDue !== null && computed.amountDue !== null && Math.abs(expectedDue - computed.amountDue) > 0.009) {
    warnings.push('Amount due does not match ticket price times persons attending.')
  }
  if (computed.paymentStatus === 'paid' && computed.balanceDue > 0) warnings.push('Paid status has an outstanding balance.')
  if (computed.paymentStatus === 'paid' && computed.amountPaid < (computed.amountDue || 0)) warnings.push('Paid row has amount paid below amount due.')
  if (computed.paymentStatus === 'paid' && options.requirePaymentReferenceForPaidStatus && !registration.paymentReference) warnings.push('Paid row is missing a payment reference.')
  if (computed.paymentStatus === 'complimentary' && computed.amountDue > 0) warnings.push('Complimentary row has amount due greater than zero.')
  if (computed.paymentStatus === 'door' && computed.amountPaid === 0) warnings.push('Door Paid status has no confirmed amount paid.')
  if (computed.paymentStatus === 'door-list' && computed.balanceDue === 0) warnings.push('To Pay at Door row has no balance due.')

  return warnings
}

function normalizePaymentReference(value) {
  return String(value || '').trim().toLowerCase()
}

function warning(level, code, message) {
  return { level, code, message }
}

function reviewReason(code, label, message, category) {
  return { code, label, message, category }
}

export function buildPaymentReferenceCounts(registrations = []) {
  const counts = new Map()
  ;(Array.isArray(registrations) ? registrations : []).forEach((registration) => {
    const reference = normalizePaymentReference(registration?.paymentReference)
    if (reference) counts.set(reference, (counts.get(reference) || 0) + 1)
  })
  return counts
}

export function classifyRegistrationFinance(registration = {}, event = {}, context = {}) {
  const computed = calculateRegistrationFinance(registration, event)
  const warnings = []
  const personsRaw = hasRawValue(registration?.personsAttending) ? Number(registration.personsAttending) : 1
  const explicitBalance = parseMoney(registration?.balanceDue)
  const expectedBalance = computed.amountDue !== null ? Math.max(0, roundMoney(computed.amountDue - computed.amountPaid)) : null
  const reference = normalizePaymentReference(registration?.paymentReference)
  const referenceCounts = context?.paymentReferenceCounts
  const duplicateReference = reference && referenceCounts?.get(reference) > 1
  const paymentStatusRaw = String(registration?.paymentStatus || '').trim()
  const paymentMethodRaw = String(registration?.paymentMethod || '').trim()
  const moneyFields = [
    ['ticketPrice', 'Ticket price'],
    ['amountDue', 'Amount due'],
    ['amountPaid', 'Amount paid'],
    ['balanceDue', 'Balance due'],
  ]

  if (!Number.isInteger(personsRaw) || personsRaw < 1) {
    warnings.push(warning('blocking', 'invalid-persons', 'Persons attending must be a whole number of 1 or more.'))
  }

  moneyFields.forEach(([field, label]) => {
    const issue = rawMoneyIssue(registration?.[field])
    if (issue === 'invalid') warnings.push(warning('blocking', `invalid-${field}`, `${label} is not a valid money amount.`))
    if (issue === 'negative') warnings.push(warning('blocking', `negative-${field}`, `${label} cannot be negative.`))
  })

  if (computed.ticketPrice === null) warnings.push(warning('warning', 'missing-ticket-price', 'Ticket price is missing, so the price basis needs review.'))
  if (computed.amountDue === null) warnings.push(warning('blocking', 'missing-amount-due', 'Amount due is missing, so expected registration income cannot be trusted.'))

  const expectedDue = computed.ticketPrice !== null ? roundMoney(computed.ticketPrice * computed.personsAttending) : null
  if (expectedDue !== null && computed.amountDue !== null && Math.abs(expectedDue - computed.amountDue) > 0.009) {
    warnings.push(warning('warning', 'amount-due-mismatch', 'Amount due does not match ticket price times persons attending.'))
  }

  if (computed.paymentStatus === 'paid' && !hasRawValue(registration?.amountPaid)) {
    warnings.push(warning('blocking', 'paid-missing-amount', 'Paid status is missing a recorded amount paid.'))
  }
  if (computed.amountDue !== null && computed.amountPaid > computed.amountDue) {
    warnings.push(warning('warning', 'overpaid', 'Amount paid is greater than amount due; review before using totals.'))
  }
  if (explicitBalance !== null && expectedBalance !== null && Math.abs(explicitBalance - expectedBalance) > 0.009) {
    warnings.push(warning('warning', 'balance-mismatch', 'Balance due does not match amount due minus amount paid.'))
  }
  if (!paymentStatusRaw || computed.paymentStatus === 'unknown') {
    warnings.push(warning('warning', 'unknown-payment-status', 'Payment status is unknown or not recorded.'))
  }
  if (computed.paymentStatus === 'paid' && computed.balanceDue > 0) {
    warnings.push(warning('blocking', 'paid-outstanding-balance', 'Paid status has an outstanding balance.'))
  }
  if (computed.paymentStatus === 'complimentary' && computed.balanceDue > 0) {
    warnings.push(warning('warning', 'complimentary-balance', 'Complimentary registration still has a positive balance.'))
  }
  if (computed.paymentStatus === 'complimentary' && computed.amountDue > 0) {
    warnings.push(warning('warning', 'complimentary-amount-due', 'Complimentary registration has amount due greater than zero.'))
  }
  if (computed.paymentStatus === 'door' && computed.amountPaid === 0) {
    warnings.push(warning('warning', 'door-missing-paid-amount', 'Door Paid status has no confirmed amount paid.'))
  }
  if (computed.paymentStatus === 'door-list' && computed.balanceDue === 0) {
    warnings.push(warning('warning', 'door-list-no-balance', 'To Pay at Door row has no balance due.'))
  }
  if (computed.paymentStatus === 'pending' && computed.balanceDue === 0 && computed.amountDue !== null) {
    warnings.push(warning('warning', 'pending-no-balance', 'Pending payment has no balance due.'))
  }
  if (duplicateReference) {
    warnings.push(warning('warning', 'duplicate-payment-reference', 'Payment reference appears on more than one registration for this event.'))
  }

  const hasPositiveBalance = (computed.balanceDue || 0) > 0
  const missingTicketPrice = computed.ticketPrice === null
  const missingAmountDue = computed.amountDue === null
  const missingRecordedAmount = (computed.paymentStatus === 'paid' || computed.paymentStatus === 'door')
    && !hasPositiveBalance
    && (!hasRawValue(registration?.amountPaid) || missingTicketPrice || missingAmountDue)
  const missingPaymentMethod = !paymentMethodRaw || computed.paymentMethod === 'unknown'
  const isPartial = (
    !['door', 'door-list', 'complimentary'].includes(computed.paymentStatus)
    && computed.amountPaid > 0
    && hasPositiveBalance
  )
  const statusGroup = isPartial
    ? 'partial'
    : computed.paymentStatus === 'door'
      ? 'door'
      : computed.paymentStatus === 'door-list'
        ? 'door-list'
        : computed.paymentStatus === 'complimentary'
          ? 'complimentary'
          : computed.paymentStatus === 'paid'
            ? 'paid'
            : computed.paymentStatus === 'pending'
              ? 'pending'
              : 'unknown'

  const isResolvedPaid = statusGroup === 'paid'
    || (statusGroup === 'door' && !hasPositiveBalance)
  const isPaymentResolved = isResolvedPaid || (statusGroup === 'complimentary' && !hasPositiveBalance)
  const referenceExpected = ['firstpay', 'bank-transfer', 'card'].includes(computed.paymentMethod)
  const missingPaymentReference = isResolvedPaid
    && referenceExpected
    && !String(registration?.paymentReference || '').trim()
  const displayBalanceDue = hasPositiveBalance
    ? computed.balanceDue
    : isPaymentResolved
      ? 0
      : computed.balanceDue

  const paymentFollowUpReasons = []
  if (hasPositiveBalance && ['pending', 'partial', 'door-list', 'door', 'paid', 'unknown'].includes(statusGroup)) {
    paymentFollowUpReasons.push(reviewReason(
      'outstanding-payment',
      'Outstanding Payment',
      'A positive balance remains on this registration and may still require patron payment follow-up.',
      'payment-follow-up',
    ))
  } else if (statusGroup === 'unknown' || statusGroup === 'pending' || statusGroup === 'door-list') {
    paymentFollowUpReasons.push(reviewReason(
      'payment-follow-up-required',
      'Payment Follow-Up Required',
      'Payment status is unresolved and may still require organizer follow-up with the patron.',
      'payment-follow-up',
    ))
  }

  const dataReviewReasons = []
  if ((statusGroup === 'paid' || statusGroup === 'door') && !hasPositiveBalance && missingRecordedAmount) {
    dataReviewReasons.push(reviewReason(
      'paid-amount-not-recorded',
      statusGroup === 'door' ? 'Door Paid — Amount Not Recorded' : 'Paid — Amount Not Recorded',
      'Payment is confirmed, but the exact ticket amount was not recorded.',
      'data-review',
    ))
  }
  if (isPaymentResolved && missingPaymentMethod) {
    dataReviewReasons.push(reviewReason(
      'missing-payment-method',
      'Missing Payment Method',
      'Payment is resolved, but the payment method is not recorded clearly.',
      'data-review',
    ))
  }
  if (isResolvedPaid && missingPaymentReference) {
    dataReviewReasons.push(reviewReason(
      'missing-payment-reference',
      'Missing Payment Reference',
      'Payment is resolved, but no payment reference was recorded.',
      'data-review',
    ))
  }
  if (warnings.some((item) => ['amount-due-mismatch', 'balance-mismatch', 'overpaid'].includes(item.code))) {
    dataReviewReasons.push(reviewReason(
      'amount-mismatch',
      'Amount Mismatch',
      'Recorded finance amounts do not align and should be reviewed internally.',
      'data-review',
    ))
  }
  if (duplicateReference) {
    dataReviewReasons.push(reviewReason(
      'possible-duplicate-payment',
      'Possible Duplicate Payment',
      'A payment reference appears on more than one registration and should be reviewed.',
      'data-review',
    ))
  }
  if (statusGroup === 'complimentary' && (hasPositiveBalance || computed.amountDue > 0)) {
    dataReviewReasons.push(reviewReason(
      'complimentary-classification-review',
      'Complimentary Classification Review',
      'Complimentary status should be checked against the recorded finance details.',
      'data-review',
    ))
  }

  const reviewReasons = [...paymentFollowUpReasons, ...dataReviewReasons]
  const paymentFollowUpRequired = paymentFollowUpReasons.length > 0
  const dataReviewRequired = !paymentFollowUpRequired && dataReviewReasons.length > 0
  const primaryReviewReason = reviewReasons[0] || null

  return {
    ...computed,
    statusGroup,
    displayStatus: formatPaymentStatusGroup(statusGroup),
    warnings,
    blockingWarnings: warnings.filter((item) => item.level === 'blocking'),
    isResolvedPaid,
    isPaymentResolved,
    displayBalanceDue,
    outstandingPayment: paymentFollowUpReasons.some((reason) => reason.code === 'outstanding-payment'),
    paymentFollowUpRequired,
    dataReviewRequired,
    reviewCategory: paymentFollowUpRequired ? 'payment-follow-up' : dataReviewRequired ? 'data-review' : null,
    reviewCategoryLabel: paymentFollowUpRequired ? 'Payment Follow-Up' : dataReviewRequired ? 'Data Review' : null,
    reviewLabel: primaryReviewReason?.label || null,
    reviewMessage: primaryReviewReason?.message || null,
    reviewMessages: reviewReasons.map((reason) => reason.message),
    reviewReasons,
    needsFollowUp: paymentFollowUpRequired,
    paymentReminderEligible: paymentFollowUpRequired,
  }
}

export function formatPaymentStatusGroup(value = '') {
  const labels = {
    paid: 'Paid',
    partial: 'Partial payment',
    pending: 'Pending',
    door: 'Door Paid',
    'door-list': 'To Pay at Door',
    complimentary: 'Complimentary',
    unknown: 'Unknown',
    'needs-review': 'Needs Review',
  }
  return labels[value] || labels.unknown
}

function registrationDisplayName(registration = {}) {
  return registration.fullName || registration.buyerName || registration.name || registration.email || 'Unnamed registration'
}

export function buildPaymentsWorkspace(registrations = [], event = {}) {
  const rows = Array.isArray(registrations) ? registrations : []
  const paymentReferenceCounts = buildPaymentReferenceCounts(rows)
  const summary = {
    currency: getCurrencyCode(event || {}),
    registrationCount: 0,
    guestCount: 0,
    expectedRegistrationIncome: 0,
    recordedPayments: 0,
    outstandingBalance: 0,
    paidRegistrations: 0,
    partialPaymentRegistrations: 0,
    pendingRegistrations: 0,
    doorPaidRegistrations: 0,
    doorListRegistrations: 0,
    complimentaryRegistrations: 0,
    complimentaryGuests: 0,
    unknownPaymentStates: 0,
    outstandingRegistrations: 0,
    financeReviewCount: 0,
    paymentFollowUpCount: 0,
    dataReviewCount: 0,
    needsFollowUpCount: 0,
  }

  const paymentRows = rows.map((registration) => {
    const finance = classifyRegistrationFinance(registration, event, { paymentReferenceCounts })
    const row = {
      registrationId: registration?.registrationId || registration?.id || '',
      name: registrationDisplayName(registration),
      email: registration?.email || '',
      phone: registration?.phone || '',
      personsAttending: finance.personsAttending,
      ticketCode: registration?.ticketCode || '',
      ticketStatus: registration?.ticketCode ? 'Assigned' : 'Missing',
      priceTier: finance.priceTier,
      ticketPrice: finance.ticketPrice,
      amountDue: finance.amountDue,
      amountPaid: finance.amountPaid,
      balanceDue: finance.balanceDue,
      displayBalanceDue: finance.displayBalanceDue,
      paymentMethod: finance.paymentMethod,
      paymentReference: registration?.paymentReference || '',
      paymentEvidenceClass: registration?.paymentEvidenceClass || '',
      paymentStatus: finance.paymentStatus,
      statusGroup: finance.statusGroup,
      displayStatus: finance.displayStatus,
      isResolvedPaid: finance.isResolvedPaid,
      isPaymentResolved: finance.isPaymentResolved,
      warnings: finance.warnings,
      reviewCategory: finance.reviewCategory,
      reviewCategoryLabel: finance.reviewCategoryLabel,
      reviewLabel: finance.reviewLabel,
      reviewMessage: finance.reviewMessage,
      reviewMessages: finance.reviewMessages,
      paymentFollowUpRequired: finance.paymentFollowUpRequired,
      dataReviewRequired: finance.dataReviewRequired,
      outstandingPayment: finance.outstandingPayment,
      paymentReminderEligible: finance.paymentReminderEligible,
      needsFollowUp: finance.needsFollowUp,
    }

    summary.registrationCount += 1
    summary.guestCount += finance.personsAttending
    summary.expectedRegistrationIncome += finance.amountDue || 0
    summary.recordedPayments += finance.amountPaid || 0
    summary.outstandingBalance += finance.balanceDue || 0
    if (finance.isResolvedPaid) summary.paidRegistrations += 1
    if (finance.statusGroup === 'partial') summary.partialPaymentRegistrations += 1
    if (finance.statusGroup === 'pending') summary.pendingRegistrations += 1
    if (finance.statusGroup === 'door') summary.doorPaidRegistrations += 1
    if (finance.statusGroup === 'door-list') summary.doorListRegistrations += 1
    if (finance.statusGroup === 'complimentary') {
      summary.complimentaryRegistrations += 1
      summary.complimentaryGuests += finance.personsAttending
    }
    if (finance.statusGroup === 'unknown') summary.unknownPaymentStates += 1
    if (finance.outstandingPayment) summary.outstandingRegistrations += 1
    if (finance.dataReviewRequired) summary.financeReviewCount += 1
    if (finance.paymentFollowUpRequired) summary.paymentFollowUpCount += 1
    if (finance.dataReviewRequired) summary.dataReviewCount += 1
    if (finance.needsFollowUp) summary.needsFollowUpCount += 1
    return row
  })

  const filterCounts = {
    all: paymentRows.length,
    'needs-follow-up': paymentRows.filter((row) => row.paymentFollowUpRequired).length,
    'payment-follow-up': paymentRows.filter((row) => row.paymentFollowUpRequired).length,
    'data-review': paymentRows.filter((row) => row.dataReviewRequired).length,
    paid: paymentRows.filter((row) => row.isResolvedPaid).length,
    partial: paymentRows.filter((row) => row.statusGroup === 'partial').length,
    pending: paymentRows.filter((row) => row.statusGroup === 'pending').length,
    door: paymentRows.filter((row) => row.statusGroup === 'door' || row.statusGroup === 'door-list').length,
    complimentary: paymentRows.filter((row) => row.statusGroup === 'complimentary').length,
    unknown: paymentRows.filter((row) => row.statusGroup === 'unknown').length,
    'finance-review': paymentRows.filter((row) => row.dataReviewRequired).length,
  }

  return {
    rows: paymentRows,
    paymentFollowUpRows: paymentRows.filter((row) => row.paymentFollowUpRequired),
    dataReviewRows: paymentRows.filter((row) => row.dataReviewRequired),
    followUpRows: paymentRows.filter((row) => row.paymentFollowUpRequired),
    summary,
    filterCounts,
  }
}

export function paymentFilterMatches(row = {}, filter = 'all') {
  if (!filter || filter === 'all') return true
  if (filter === 'needs-follow-up' || filter === 'payment-follow-up') return Boolean(row.paymentFollowUpRequired)
  if (filter === 'data-review') return Boolean(row.dataReviewRequired)
  if (filter === 'paid') return Boolean(row.isResolvedPaid)
  if (filter === 'door') return row.statusGroup === 'door' || row.statusGroup === 'door-list'
  if (filter === 'finance-review') return Boolean(row.dataReviewRequired)
  return row.statusGroup === filter
}

export function paymentSearchMatches(row = {}, query = '') {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return true
  return [
    row.name,
    row.email,
    row.phone,
    row.ticketCode,
    row.paymentReference,
    row.priceTier,
    row.displayStatus,
  ].some((value) => String(value || '').toLowerCase().includes(q))
}

export function buildFinanceSummary(registrations = [], event = {}) {
  const rows = Array.isArray(registrations) ? registrations : []
  const safeEvent = event && typeof event === 'object' ? event : {}

  return rows.reduce((summary, registration) => {
    const finance = calculateRegistrationFinance(registration, event)
    const persons = finance.personsAttending
    const due = finance.amountDue || 0
    const paid = finance.amountPaid || 0
    const balance = finance.balanceDue || 0

    summary.totalExpected += due
    summary.totalCollected += paid
    summary.totalOutstanding += balance

    const isResolvedPaid = finance.paymentStatus === 'paid' || (finance.paymentStatus === 'door' && paid > 0 && balance === 0)
    const isPartial = !['door', 'door-list', 'complimentary'].includes(finance.paymentStatus) && paid > 0 && balance > 0

    if (isResolvedPaid) {
      summary.paidRegistrations += 1
      summary.paidPersons += persons
      summary.paidTotal += paid
    }
    if (isPartial) {
      summary.partialPaymentRegistrations += 1
      summary.partialPaymentPersons += persons
      summary.partialPaymentTotal += paid
    }
    if (finance.paymentStatus === 'pending' || balance > 0) {
      summary.pendingRegistrations += 1
      summary.pendingPersons += persons
      summary.pendingTotal += balance
    }
    if (finance.paymentStatus === 'door') {
      summary.doorRegistrations += 1
      summary.doorPersons += persons
      summary.doorPaidTotal += paid
    }
    if (finance.paymentStatus === 'door-list') {
      summary.doorListRegistrations += 1
      summary.doorListPersons += persons
      summary.doorListTotal += balance
      summary.doorTotal += balance
    }
    if (finance.paymentStatus === 'complimentary') {
      summary.complimentaryRegistrations += 1
      summary.complimentaryPersons += persons
      summary.complimentaryValue += finance.complimentaryValue
    }
    if (finance.needsFinanceReview) summary.missingFinanceInfo += 1
    if (financeWarnings(registration, event).length > 0) summary.financeWarningCount += 1

    return summary
  }, {
    currency: getCurrencyCode(safeEvent),
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    paidTotal: 0,
    pendingTotal: 0,
    doorTotal: 0,
    doorPaidTotal: 0,
    doorListTotal: 0,
    complimentaryValue: 0,
    paidRegistrations: 0,
    pendingRegistrations: 0,
    doorRegistrations: 0,
    complimentaryRegistrations: 0,
    paidPersons: 0,
    pendingPersons: 0,
    doorPersons: 0,
    doorListRegistrations: 0,
    doorListPersons: 0,
    partialPaymentRegistrations: 0,
    partialPaymentPersons: 0,
    partialPaymentTotal: 0,
    complimentaryPersons: 0,
    missingFinanceInfo: 0,
    financeWarningCount: 0,
  })
}

export function financeFilterMatches(registration = {}, filter = 'all', event = {}) {
  if (!filter || filter === 'all' || filter === 'All') return true
  const finance = calculateRegistrationFinance(registration, event)
  if (filter === 'outstanding' || filter === 'Outstanding Balance') return (finance.balanceDue || 0) > 0
  if (filter === 'missing-amount' || filter === 'Missing Amount') return finance.amountDue === null || finance.amountPaid === null
  if (filter === 'missing-reference' || filter === 'Missing Payment Reference') return finance.paymentStatus === 'paid' && !registration.paymentReference
  if (filter === 'missing-ticket-price' || filter === 'Missing Ticket Price') return finance.ticketPrice === null
  return finance.paymentStatus === normalizePaymentStatus(filter)
}
