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
  firstpay: 'FirstPay',
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
  return `${currency} $${roundMoney(amount).toFixed(2)}`
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
    currency: registration.currency || event.currency || DEFAULT_CURRENCY,
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

export function buildFinanceSummary(registrations = [], event = {}) {
  return registrations.reduce((summary, registration) => {
    const finance = calculateRegistrationFinance(registration, event)
    const persons = finance.personsAttending
    const due = finance.amountDue || 0
    const paid = finance.amountPaid || 0
    const balance = finance.balanceDue || 0

    summary.totalExpected += due
    summary.totalCollected += paid
    summary.totalOutstanding += balance

    if (finance.paymentStatus === 'paid' || balance === 0) {
      summary.paidRegistrations += 1
      summary.paidPersons += persons
      summary.paidTotal += paid
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
    currency: event.currency || DEFAULT_CURRENCY,
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
