export const TICKET_CODE_PREFIX = 'GSV'
export const TICKET_CODE_PATTERN = /^GSV-[A-HJ-NP-Z2-9]{6}$/
export const TICKET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeTicketCode(value) {
  return (value || '').trim().toUpperCase()
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

export function validateTicketCode(value, existingRegistrations = [], currentRegistrationId = null) {
  const code = normalizeTicketCode(value)
  if (!code) return 'Ticket code is required.'
  if (!TICKET_CODE_PATTERN.test(code)) return 'Use format GSV-XXXXXX with readable letters or numbers.'

  const duplicate = existingRegistrations.find((registration) => (
    registration.registrationId !== currentRegistrationId
    && normalizeTicketCode(registration.ticketCode) === code
  ))

  if (duplicate) return 'This ticket code is already assigned for the selected event.'
  return ''
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
  if (registration?.paymentStatus === 'pending' || registration?.paymentStatus === 'unknown') {
    warnings.push('Payment is not marked paid.')
  }
  return warnings
}

export function searchableRegistrationText(registration) {
  return [
    registration.fullName,
    registration.email,
    registration.phone,
    registration.ticketCode,
  ].filter(Boolean).join(' ').toLowerCase()
}
