import { PAYMENT_STATUSES, normalizePaymentStatus } from './paymentStatus.js'
import { PAYMENT_METHODS, normalizePaymentMethod, parseMoney } from './financeUtils.js'
import {
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  PARTNER_STATUS_OPTIONS,
  PARTNER_TYPE_OPTIONS,
  SPONSOR_TYPE_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from './eventPlanning.js'

// ─── Event validation ──────────────────────────────────────────────────────

export const VALID_TIER_NAMES = [
  'Early Bird',
  'General',
  'Door',
  'Tier 1',
  'Tier 2',
  'Tier 3',
  'Complimentary',
]

export const VALID_TIER_STATUSES = ['active', 'sold-out', 'hidden']

export const MAX_PRICE_TIERS = 7

export function validatePriceTier(tier, index) {
  const errors = {}
  const label = `Tier ${index + 1}`

  if (!tier.name || !tier.name.trim()) {
    errors.name = `${label}: name is required.`
  }

  const price = Number(tier.price)
  if (tier.price === '' || tier.price === undefined || Number.isNaN(price) || price < 0) {
    errors.price = `${label}: price must be zero or greater.`
  }

  if (tier.status && !VALID_TIER_STATUSES.includes(tier.status)) {
    errors.status = `${label}: invalid status.`
  }

  return errors
}

export function validatePriceTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return {}
  if (tiers.length > MAX_PRICE_TIERS) {
    return { _array: `No more than ${MAX_PRICE_TIERS} price tiers allowed.` }
  }

  const allErrors = {}
  tiers.forEach((tier, i) => {
    const errs = validatePriceTier(tier, i)
    if (Object.keys(errs).length > 0) allErrors[i] = errs
  })
  return allErrors
}

export function validateEvent(values) {
  const errors = {}
  const allowedEventTypes = EVENT_TYPE_OPTIONS.map((option) => option.value)
  const allowedStatuses = [...EVENT_STATUS_OPTIONS.map((option) => option.value), 'upcoming', 'active']

  if (!values.eventName.trim()) errors.eventName = 'Event name is required.'
  if (!values.eventDate) errors.eventDate = 'Event date is required.'
  if (!String(values.venueName || '').trim()) errors.venueName = 'Venue is required.'
  if (!values.location.trim()) errors.location = 'Location is required.'
  if (!allowedEventTypes.includes(values.eventType)) errors.eventType = 'Event type is required.'
  if (!allowedStatuses.includes(values.status)) errors.status = 'Status is required.'
  if (!String(values.eventStartTime || '').trim()) errors.eventStartTime = 'Start time is required.'

  const capacity = Number(values.capacity)
  if (values.capacity === '' || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be a whole number greater than zero.'
  }

  const ticketTypeCount = Number(values.ticketTypeCount)
  if (values.ticketTypeCount === '' || !Number.isInteger(ticketTypeCount) || ticketTypeCount < 1 || ticketTypeCount > 12) {
    errors.ticketTypeCount = 'Ticket type count must be a whole number between 1 and 12.'
  }

  const ticketPrice = Number(values.ticketPrice)
  if (values.ticketPrice === '' || Number.isNaN(ticketPrice) || ticketPrice < 0) {
    errors.ticketPrice = 'Ticket price must be zero or greater.'
  }

  if (values.registrationOpenDate && !values.registrationRequired) {
    errors.registrationOpenDate = 'Registration dates should only be used when registration is required.'
  }

  if (values.registrationOpenDate && values.registrationCloseDate && values.registrationCloseDate < values.registrationOpenDate) {
    errors.registrationCloseDate = 'Registration close date cannot be before the opening date.'
  }

  const budgetFields = [
    'projectedRegistrationIncome',
    'venueBudget',
    'supplierBudget',
    'entertainmentBudget',
    'marketingBudget',
    'staffingBudget',
    'contingencyBudget',
    'otherBudget',
  ]
  const financialPlanErrors = {}
  budgetFields.forEach((field) => {
    const value = values.financialPlan?.[field]
    if (value !== '' && value !== null && value !== undefined && parseMoney(value) === null) {
      financialPlanErrors[field] = 'Budget values must be zero or greater.'
    }
  })
  if (Object.keys(financialPlanErrors).length > 0) errors.financialPlan = financialPlanErrors

  const operationsPlanErrors = {}
  if (Array.isArray(values.operationsPlan?.timeline)) {
    const timelineErrors = {}
    values.operationsPlan.timeline.forEach((item, index) => {
      const hasTime = String(item?.time || '').trim().length > 0
      const hasLabel = String(item?.label || '').trim().length > 0
      if (hasTime !== hasLabel) {
        timelineErrors[index] = 'Add both a time and a label, or leave the row blank.'
      }
    })
    if (Object.keys(timelineErrors).length > 0) operationsPlanErrors.timeline = timelineErrors
  }
  if (Object.keys(operationsPlanErrors).length > 0) errors.operationsPlan = operationsPlanErrors

  // Optional price tiers
  if (values.priceTiers && values.priceTiers.length > 0) {
    const tierErrors = validatePriceTiers(values.priceTiers)
    if (Object.keys(tierErrors).length > 0) errors.priceTiers = tierErrors
  }

  return errors
}

// ─── Registration validation ───────────────────────────────────────────────

export const validPaymentStatuses = PAYMENT_STATUSES
export const validTicketStatuses = ['no-ticket-assigned', 'partially-assigned', 'assigned']
const MAX_PERSONS_ATTENDING = 100

export function validateRegistration(values) {
  const errors = {}

  if (!values.fullName?.trim()) errors.fullName = 'Full name is required.'

  const persons = Number(values.personsAttending)
  if (!values.personsAttending || !Number.isInteger(persons) || persons < 1) {
    errors.personsAttending = 'Persons attending must be a whole number of at least 1.'
  } else if (persons > MAX_PERSONS_ATTENDING) {
    errors.personsAttending = `Persons attending cannot exceed ${MAX_PERSONS_ATTENDING}.`
  }

  const normalizedPaymentStatus = normalizePaymentStatus(values.paymentStatus)
  const rawPaymentStatus = String(values.paymentStatus || '').trim().toLowerCase()
  if (values.paymentStatus && (!validPaymentStatuses.includes(normalizedPaymentStatus) || (normalizedPaymentStatus === 'unknown' && rawPaymentStatus !== 'unknown'))) {
    errors.paymentStatus = 'Invalid payment status.'
  }

  if (values.paymentMethod && !PAYMENT_METHODS.includes(normalizePaymentMethod(values.paymentMethod))) {
    errors.paymentMethod = 'Invalid payment method.'
  }

  for (const field of ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue']) {
    const value = values[field]
    if (value !== '' && value !== null && value !== undefined && parseMoney(value) === null) {
      errors[field] = 'Money fields must be zero or greater.'
    }
  }

  if (values.ticketStatus && !validTicketStatuses.includes(values.ticketStatus)) {
    errors.ticketStatus = 'Invalid ticket status.'
  }

  return errors
}

export function validatePlanningTask(values) {
  const errors = {}

  if (!String(values.title || '').trim()) errors.title = 'Task title is required.'
  if (!TASK_CATEGORY_OPTIONS.includes(values.category)) errors.category = 'Choose a task category.'
  if (values.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(values.dueDate))) errors.dueDate = 'Use a valid due date.'
  if (!TASK_PRIORITY_OPTIONS.includes(values.priority)) errors.priority = 'Choose a priority.'
  if (!TASK_STATUS_OPTIONS.includes(values.status)) errors.status = 'Choose a task status.'

  return errors
}

export function validatePartnerRecord(values) {
  const errors = {}
  const validTypes = PARTNER_TYPE_OPTIONS.map(([value]) => value)
  const validSponsorTypes = SPONSOR_TYPE_OPTIONS.map(([value]) => value)

  if (!validTypes.includes(values.recordType)) errors.recordType = 'Choose a contact type.'
  if (!String(values.name || '').trim()) errors.name = 'Name is required.'
  if (!PARTNER_STATUS_OPTIONS.includes(values.status)) errors.status = 'Choose a status.'

  for (const field of ['agreedAmount', 'amountPaid', 'requestedAmount', 'confirmedCashAmount', 'estimatedValue']) {
    const value = values[field]
    if (value !== '' && value !== null && value !== undefined && parseMoney(value) === null) {
      errors[field] = 'Money values must be zero or greater.'
    }
  }

  if (values.recordType === 'sponsor') {
    if (!validSponsorTypes.includes(values.sponsorType)) errors.sponsorType = 'Choose a sponsor type.'
    if (values.sponsorType === 'cash' && !String(values.requestedAmount ?? '').length && !String(values.confirmedCashAmount ?? '').length) {
      errors.confirmedCashAmount = 'Add the requested or confirmed cash amount for a cash sponsor.'
    }
    if (values.sponsorType === 'in-kind' && !String(values.itemOrService || '').trim()) {
      errors.itemOrService = 'Describe the sponsored item or service.'
    }
  }

  return errors
}
