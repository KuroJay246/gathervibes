import { PAYMENT_STATUSES, normalizePaymentStatus } from './paymentStatus.js'

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

  if (!values.eventName.trim()) errors.eventName = 'Event name is required.'
  if (!values.eventDate) errors.eventDate = 'Event date is required.'
  if (!values.location.trim()) errors.location = 'Location is required.'
  if (!values.eventType) errors.eventType = 'Event type is required.'
  if (!values.status) errors.status = 'Status is required.'

  const capacity = Number(values.capacity)
  if (values.capacity === '' || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be a whole number greater than zero.'
  }

  const ticketPrice = Number(values.ticketPrice)
  if (values.ticketPrice === '' || Number.isNaN(ticketPrice) || ticketPrice < 0) {
    errors.ticketPrice = 'Ticket price must be zero or greater.'
  }

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

  if (values.ticketStatus && !validTicketStatuses.includes(values.ticketStatus)) {
    errors.ticketStatus = 'Invalid ticket status.'
  }

  return errors
}
