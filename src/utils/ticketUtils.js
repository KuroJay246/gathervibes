import { normalizePaymentStatus } from './paymentStatus.js'

export const TICKET_CODE_PREFIX = 'GSV'
export const TICKET_CODE_PATTERN = /^GSV-[A-HJ-NP-Z2-9]{6}$/
export const FLEXIBLE_TICKET_CODE_PATTERN = /^[A-Z0-9][A-Z0-9 _-]{0,31}$/
export const SEQUENTIAL_TICKET_CODE_PATTERN = /^([A-Z0-9]{2,12})-(\d{3,6})$/
export const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeTicketCode(value) {
  return (value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

export function buildTicketPrefix(event = {}) {
  const candidate = event.ticketPrefix || event.eventCode || event.eventName || ''
  const words = candidate
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)

  if (words.length === 0) return TICKET_CODE_PREFIX
  if (words.length === 1) return words[0].slice(0, 6) || TICKET_CODE_PREFIX

  const initials = words.map((word) => word[0]).join('')
  return initials.slice(0, 6) || TICKET_CODE_PREFIX
}

export function ticketCodeForSort(value) {
  return normalizeTicketCode(value)
}

export function generateTicketCode(existingCodes = new Set(), random = Math.random) {
  const codes = existingCodes instanceof Set ? existingCodes : new Set(existingCodes.filter(Boolean))

  for (let attempt = 0; attempt < 100; attempt += 1) {
    let suffix = ''
    for (let i = 0; i < 6; i += 1) {
      suffix += TICKET_ALPHABET[Math.floor(random() * TICKET_ALPHABET.length)]
    }
    const code = `${TICKET_CODE_PREFIX}-${suffix}`
    if (!codes.has(code)) return code
  }

  throw new Error('Could not generate a unique ticket code. Try again.')
}

export function generateSequentialTicketCode(existingCodes = [], event = {}, minimumDigits = 3) {
  const prefix = buildTicketPrefix(event)
  const codes = existingCodes instanceof Set ? [...existingCodes] : existingCodes
  const normalized = new Set(codes.map(normalizeTicketCode).filter(Boolean))
  let maxNumber = 0

  for (const code of normalized) {
    const match = code.match(SEQUENTIAL_TICKET_CODE_PATTERN)
    if (match?.[1] === prefix) {
      maxNumber = Math.max(maxNumber, Number(match[2]))
    }
  }

  for (let nextNumber = maxNumber + 1; nextNumber < 1000000; nextNumber += 1) {
    const suffix = String(nextNumber).padStart(minimumDigits, '0')
    const candidate = `${prefix}-${suffix}`
    if (!normalized.has(candidate)) return candidate
  }

  throw new Error(`Could not generate a unique ${prefix} ticket code.`)
}

export function validateTicketCode(value, existingRegistrations = [], currentRegistrationId = null) {
  const code = normalizeTicketCode(value)
  if (!code) return 'Ticket code is required.'
  if (code.length > 32 || !FLEXIBLE_TICKET_CODE_PATTERN.test(code)) {
    return 'Use letters, numbers, spaces, hyphens, or underscores only.'
  }

  const duplicate = existingRegistrations.find((registration) => (
    registration.registrationId !== currentRegistrationId
    && normalizeTicketCode(registration.ticketCode) === code
  ))

  if (duplicate) return 'This ticket code is already assigned for the selected event.'
  return ''
}

export function findTicketCodeDuplicate(existingRegistrations = [], processedRows = [], row = {}) {
  const code = normalizeTicketCode(row.ticketCode)
  if (!code) return null

  const existingDuplicate = existingRegistrations.find((registration) => normalizeTicketCode(registration.ticketCode) === code)
  if (existingDuplicate) return 'Duplicate ticket code for selected event'

  const batchDuplicate = processedRows.find((processed) => normalizeTicketCode(processed.row?.ticketCode) === code)
  if (batchDuplicate) return 'Duplicate ticket code in import batch'

  return null
}

export function ticketStatusForCode(ticketCode) {
  return normalizeTicketCode(ticketCode) ? 'assigned' : 'no-ticket-assigned'
}

export function canTransitionTicketStatus(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true
  return (
    (fromStatus === 'no-ticket-assigned' && toStatus === 'assigned')
    || (fromStatus === 'assigned' && toStatus === 'no-ticket-assigned')
  )
}

export function canCompleteCheckIn(registration) {
  if (registration?.checkedIn) return {
    allowed: false,
    reason: 'This guest is already checked in.',
  }

  return { allowed: true, reason: '' }
}

export function checkInWarnings(registration) {
  const warnings = []
  if (!registration?.ticketCode) warnings.push('No ticket code is assigned.')
  const paymentStatus = normalizePaymentStatus(registration?.paymentStatus)
  if (paymentStatus === 'pending' || paymentStatus === 'unknown') {
    warnings.push('Payment is not marked paid.')
  }
  if (paymentStatus === 'door') warnings.push('Door payment: collect or verify payment at check-in.')
  return warnings
}

export function searchableRegistrationText(registration) {
  return [
    registration.fullName,
    registration.buyerName,
    ...(Array.isArray(registration.attendeeNames) ? registration.attendeeNames : []),
    registration.email,
    registration.phone,
    registration.ticketCode,
  ].filter(Boolean).join(' ').toLowerCase()
}
