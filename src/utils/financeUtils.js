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

export const DATA_REVIEW_SEVERITY_LABELS = {
  'action-required': 'Action Required',
  'internal-cleanup': 'Internal Cleanup',
  'historical-limitation': 'Historical Limitation',
  'informational-only': 'Informational Only',
}

export const DATA_REVIEW_CATEGORY_LABELS = {
  'paid-amount-not-recorded': 'Paid — Amount Not Recorded',
  'missing-payment-reference': 'Missing Payment Reference',
  'missing-payment-method': 'Missing Payment Method',
  'legacy-import-data': 'Legacy Import Data',
  'evidence-classification-missing': 'Evidence Classification Missing',
  'ticket-data-incomplete': 'Ticket Data Incomplete',
  'group-booking-metadata': 'Group Booking Metadata',
  'possible-duplicate-payment': 'Possible Duplicate',
  'amount-mismatch': 'Finance Amount Mismatch',
  'organizer-decision-required': 'Organizer Decision Required',
  'no-action-required': 'No Action Required',
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

function reviewReason(code, label, message, category, metadata = {}) {
  return { code, label, message, category, ...metadata }
}

function dataReviewReason(code, label, message, severity, categoryKeys = [], metadata = {}) {
  return reviewReason(code, label, message, 'data-review', {
    severity,
    categoryKeys,
    ...metadata,
  })
}

function normalizeRelationshipKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function isHistoricalEvent(event = {}) {
  const status = String(event?.status || '').trim().toLowerCase()
  if (['completed', 'cancelled'].includes(status)) return true
  const eventDate = event?.eventDate ? new Date(event.eventDate) : null
  return Boolean(eventDate && !Number.isNaN(eventDate.getTime()) && eventDate.getTime() < Date.now())
}

function severityRank(severity = '') {
  return {
    'action-required': 0,
    'internal-cleanup': 1,
    'historical-limitation': 2,
    'informational-only': 3,
  }[severity] ?? 4
}

function primarySeverity(reasons = []) {
  return reasons
    .map((reason) => reason.severity)
    .sort((left, right) => severityRank(left) - severityRank(right))[0] || null
}

function uniqueStrings(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function categoryLabels(categoryKeys = []) {
  return categoryKeys.map((key) => DATA_REVIEW_CATEGORY_LABELS[key] || key)
}

export function buildFinanceClassificationContext(registrations = [], event = {}) {
  const rows = Array.isArray(registrations) ? registrations : []
  const resolvedPayerNameCounts = new Map()

  rows.forEach((registration) => {
    const computed = calculateRegistrationFinance(registration, event)
    const hasPositiveBalance = (computed.balanceDue || 0) > 0
    const coveredByPayer = (
      computed.paymentStatus === 'paid'
      || (computed.paymentStatus === 'door' && !hasPositiveBalance)
      || (computed.paymentStatus === 'complimentary' && !hasPositiveBalance)
      || computed.amountPaid > 0
    )

    if (!coveredByPayer) return

    ;[registration?.fullName, registration?.buyerName].forEach((value) => {
      const key = normalizeRelationshipKey(value)
      if (key) resolvedPayerNameCounts.set(key, (resolvedPayerNameCounts.get(key) || 0) + 1)
    })
  })

  return {
    paymentReferenceCounts: buildPaymentReferenceCounts(rows),
    resolvedPayerNameCounts,
    isHistoricalEvent: isHistoricalEvent(event),
  }
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
  const classificationContext = {
    ...buildFinanceClassificationContext([registration], event),
    ...(context || {}),
  }
  const personsRaw = hasRawValue(registration?.personsAttending) ? Number(registration.personsAttending) : 1
  const explicitBalance = parseMoney(registration?.balanceDue)
  const expectedBalance = computed.amountDue !== null ? Math.max(0, roundMoney(computed.amountDue - computed.amountPaid)) : null
  const reference = normalizePaymentReference(registration?.paymentReference)
  const referenceCounts = classificationContext?.paymentReferenceCounts
  const duplicateReference = reference && referenceCounts?.get(reference) > 1
  const paymentStatusRaw = String(registration?.paymentStatus || '').trim()
  const paymentMethodRaw = String(registration?.paymentMethod || '').trim()
  const historicalEvent = Boolean(classificationContext?.isHistoricalEvent ?? isHistoricalEvent(event))
  const paymentEvidenceClass = String(registration?.paymentEvidenceClass || '').trim()
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
  const missingRecordedAmountBase = (computed.paymentStatus === 'paid' || computed.paymentStatus === 'door')
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
  const fullNameKey = normalizeRelationshipKey(registration?.fullName)
  const buyerNameKey = normalizeRelationshipKey(registration?.buyerName)
  const hasDistinctBuyer = Boolean(fullNameKey && buyerNameKey && fullNameKey !== buyerNameKey)
  const payerCoveredGroupGuest = hasDistinctBuyer
    && !hasPositiveBalance
    && (computed.amountDue || 0) === 0
    && (computed.amountPaid || 0) === 0
    && (classificationContext?.resolvedPayerNameCounts?.get(buyerNameKey) || 0) > 1
  const missingRecordedAmount = missingRecordedAmountBase && !payerCoveredGroupGuest
  const legacyImportMetadataGap = historicalEvent
    && registration?.source === 'csv-import'
    && isPaymentResolved
    && !hasPositiveBalance
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
  const baseHistoricalCategories = uniqueStrings([
    legacyImportMetadataGap ? 'legacy-import-data' : null,
    !paymentEvidenceClass ? 'evidence-classification-missing' : null,
    legacyImportMetadataGap ? 'no-action-required' : null,
  ])
  if ((statusGroup === 'paid' || statusGroup === 'door') && !hasPositiveBalance && missingRecordedAmount) {
    dataReviewReasons.push(dataReviewReason(
      'paid-amount-not-recorded',
      statusGroup === 'door' ? 'Door Paid — Amount Not Recorded' : 'Paid — Amount Not Recorded',
      'Payment is confirmed, but the exact ticket amount was not recorded.',
      'internal-cleanup',
      uniqueStrings([
        'paid-amount-not-recorded',
        missingPaymentReference ? 'missing-payment-reference' : null,
      ]),
      {
        activeReview: true,
      },
    ))
  }
  if (isPaymentResolved && missingPaymentMethod && !payerCoveredGroupGuest) {
    dataReviewReasons.push(dataReviewReason(
      'missing-payment-method',
      'Missing Payment Method',
      legacyImportMetadataGap
        ? 'Payment is resolved, but the historical import did not preserve a reliable payment method.'
        : 'Payment is resolved, but the payment method is not recorded clearly.',
      legacyImportMetadataGap ? 'historical-limitation' : 'internal-cleanup',
      uniqueStrings([
        'missing-payment-method',
        ...baseHistoricalCategories,
      ]),
      {
        activeReview: !legacyImportMetadataGap,
      },
    ))
  }
  if (isResolvedPaid && missingPaymentReference) {
    dataReviewReasons.push(dataReviewReason(
      'missing-payment-reference',
      'Missing Payment Reference',
      legacyImportMetadataGap
        ? 'Payment is resolved, but the historical import did not preserve a recoverable payment reference.'
        : 'Payment is resolved, but no payment reference was recorded.',
      legacyImportMetadataGap && !missingRecordedAmount ? 'historical-limitation' : 'internal-cleanup',
      uniqueStrings([
        'missing-payment-reference',
        ...baseHistoricalCategories,
      ]),
      {
        activeReview: !(legacyImportMetadataGap && !missingRecordedAmount),
      },
    ))
  }
  if (warnings.some((item) => ['amount-due-mismatch', 'balance-mismatch', 'overpaid'].includes(item.code))) {
    dataReviewReasons.push(dataReviewReason(
      'amount-mismatch',
      'Amount Mismatch',
      'Recorded finance amounts do not align and should be reviewed internally.',
      'action-required',
      ['amount-mismatch'],
      {
        activeReview: true,
      },
    ))
  }
  if (duplicateReference) {
    dataReviewReasons.push(dataReviewReason(
      'possible-duplicate-payment',
      'Possible Duplicate Payment',
      'A payment reference appears on more than one registration and should be reviewed.',
      'action-required',
      ['possible-duplicate-payment'],
      {
        activeReview: true,
      },
    ))
  }
  if (statusGroup === 'complimentary' && (hasPositiveBalance || computed.amountDue > 0)) {
    dataReviewReasons.push(dataReviewReason(
      'complimentary-classification-review',
      'Complimentary Classification Review',
      'Complimentary status should be checked against the recorded finance details.',
      'action-required',
      ['organizer-decision-required'],
      {
        activeReview: true,
      },
    ))
  }

  const reviewReasons = [...paymentFollowUpReasons, ...dataReviewReasons]
  const paymentFollowUpRequired = paymentFollowUpReasons.length > 0
  const dataReviewRequired = !paymentFollowUpRequired && dataReviewReasons.length > 0
  const dataReviewSeverity = dataReviewRequired ? primarySeverity(dataReviewReasons) : null
  const dataReviewSeverityLabel = dataReviewSeverity ? DATA_REVIEW_SEVERITY_LABELS[dataReviewSeverity] : null
  const dataReviewProminent = dataReviewRequired && ['action-required', 'internal-cleanup'].includes(dataReviewSeverity)
  const dataReviewCategoryKeys = uniqueStrings(dataReviewReasons.flatMap((reason) => reason.categoryKeys || []))
  const dataReviewCategoryLabels = categoryLabels(dataReviewCategoryKeys)
  const dataReviewPrimaryCategory = dataReviewCategoryKeys[0] || null
  const dataReviewPrimaryCategoryLabel = dataReviewPrimaryCategory ? DATA_REVIEW_CATEGORY_LABELS[dataReviewPrimaryCategory] : null
  const dataReviewPrimaryReason = dataReviewReasons
    .slice()
    .sort((left, right) => severityRank(left.severity) - severityRank(right.severity))[0] || null
  const primaryReviewReason = paymentFollowUpReasons[0] || dataReviewPrimaryReason || null

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
    dataReviewProminent,
    dataReviewSeverity,
    dataReviewSeverityLabel,
    dataReviewPrimaryCategory,
    dataReviewPrimaryCategoryLabel,
    dataReviewCategoryKeys,
    dataReviewCategoryLabels,
    dataReviewActionRequired: dataReviewSeverity === 'action-required',
    dataReviewInternalCleanup: dataReviewSeverity === 'internal-cleanup',
    dataReviewHistoricalLimitation: dataReviewSeverity === 'historical-limitation',
    dataReviewInformationalOnly: dataReviewSeverity === 'informational-only',
    reviewCategory: paymentFollowUpRequired ? 'payment-follow-up' : dataReviewRequired ? 'data-review' : null,
    reviewCategoryLabel: paymentFollowUpRequired ? 'Payment Follow-Up' : dataReviewSeverityLabel,
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
  const classificationContext = buildFinanceClassificationContext(rows, event)
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
    actionRequiredCount: 0,
    internalCleanupCount: 0,
    historicalLimitationCount: 0,
    informationalOnlyCount: 0,
    prominentDataReviewCount: 0,
    paidAmountNotRecordedCount: 0,
    needsFollowUpCount: 0,
    dataReviewCategoryCounts: Object.fromEntries(Object.keys(DATA_REVIEW_CATEGORY_LABELS).map((key) => [key, 0])),
  }

  const paymentRows = rows.map((registration) => {
    const finance = classifyRegistrationFinance(registration, event, classificationContext)
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
      dataReviewProminent: finance.dataReviewProminent,
      dataReviewSeverity: finance.dataReviewSeverity,
      dataReviewSeverityLabel: finance.dataReviewSeverityLabel,
      dataReviewPrimaryCategory: finance.dataReviewPrimaryCategory,
      dataReviewPrimaryCategoryLabel: finance.dataReviewPrimaryCategoryLabel,
      dataReviewCategoryKeys: finance.dataReviewCategoryKeys,
      dataReviewCategoryLabels: finance.dataReviewCategoryLabels,
      dataReviewActionRequired: finance.dataReviewActionRequired,
      dataReviewInternalCleanup: finance.dataReviewInternalCleanup,
      dataReviewHistoricalLimitation: finance.dataReviewHistoricalLimitation,
      dataReviewInformationalOnly: finance.dataReviewInformationalOnly,
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
    if (finance.dataReviewProminent) summary.prominentDataReviewCount += 1
    if (finance.dataReviewActionRequired) summary.actionRequiredCount += 1
    if (finance.dataReviewInternalCleanup) summary.internalCleanupCount += 1
    if (finance.dataReviewHistoricalLimitation) summary.historicalLimitationCount += 1
    if (finance.dataReviewInformationalOnly) summary.informationalOnlyCount += 1
    if (finance.dataReviewCategoryKeys.includes('paid-amount-not-recorded')) summary.paidAmountNotRecordedCount += 1
    finance.dataReviewCategoryKeys.forEach((categoryKey) => {
      summary.dataReviewCategoryCounts[categoryKey] = (summary.dataReviewCategoryCounts[categoryKey] || 0) + 1
    })
    if (finance.needsFollowUp) summary.needsFollowUpCount += 1
    return row
  })

  const filterCounts = {
    all: paymentRows.length,
    'needs-follow-up': paymentRows.filter((row) => row.paymentFollowUpRequired).length,
    'payment-follow-up': paymentRows.filter((row) => row.paymentFollowUpRequired).length,
    'data-review': paymentRows.filter((row) => row.dataReviewRequired).length,
    'action-required': paymentRows.filter((row) => row.dataReviewActionRequired).length,
    'internal-cleanup': paymentRows.filter((row) => row.dataReviewInternalCleanup).length,
    'historical-limitation': paymentRows.filter((row) => row.dataReviewHistoricalLimitation).length,
    'informational-only': paymentRows.filter((row) => row.dataReviewInformationalOnly).length,
    'paid-amount-not-recorded': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('paid-amount-not-recorded')).length,
    'missing-method': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('missing-payment-method')).length,
    'missing-reference': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('missing-payment-reference')).length,
    'group-booking-metadata': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('group-booking-metadata')).length,
    'possible-duplicate': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('possible-duplicate-payment')).length,
    'amount-mismatch': paymentRows.filter((row) => row.dataReviewCategoryKeys.includes('amount-mismatch')).length,
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
    prominentDataReviewRows: paymentRows.filter((row) => row.dataReviewProminent),
    historicalDataReviewRows: paymentRows.filter((row) => row.dataReviewHistoricalLimitation),
    followUpRows: paymentRows.filter((row) => row.paymentFollowUpRequired),
    summary,
    filterCounts,
  }
}

export function paymentFilterMatches(row = {}, filter = 'all') {
  if (!filter || filter === 'all') return true
  if (filter === 'needs-follow-up' || filter === 'payment-follow-up') return Boolean(row.paymentFollowUpRequired)
  if (filter === 'data-review') return Boolean(row.dataReviewRequired)
  if (filter === 'action-required') return Boolean(row.dataReviewActionRequired)
  if (filter === 'internal-cleanup') return Boolean(row.dataReviewInternalCleanup)
  if (filter === 'historical-limitation') return Boolean(row.dataReviewHistoricalLimitation)
  if (filter === 'informational-only') return Boolean(row.dataReviewInformationalOnly)
  if (filter === 'paid-amount-not-recorded') return row.dataReviewCategoryKeys?.includes('paid-amount-not-recorded')
  if (filter === 'missing-method') return row.dataReviewCategoryKeys?.includes('missing-payment-method')
  if (filter === 'missing-reference') return row.dataReviewCategoryKeys?.includes('missing-payment-reference')
  if (filter === 'group-booking-metadata') return row.dataReviewCategoryKeys?.includes('group-booking-metadata')
  if (filter === 'possible-duplicate') return row.dataReviewCategoryKeys?.includes('possible-duplicate-payment')
  if (filter === 'amount-mismatch') return row.dataReviewCategoryKeys?.includes('amount-mismatch')
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
