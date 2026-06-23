import { FLEXIBLE_TICKET_CODE_PATTERN, normalizeTicketCode } from './ticketUtils.js'

export const QR_TICKET_PREFIX = 'GSV:TICKET:'

export function qrPayloadForTicketCode(ticketCode) {
  const normalized = normalizeTicketCode(ticketCode)
  if (!normalized || !FLEXIBLE_TICKET_CODE_PATTERN.test(normalized)) return ''
  return `${QR_TICKET_PREFIX}${normalized}`
}

export function parseQrTicketCode(value) {
  const raw = String(value || '').trim()
  if (!raw) return { ticketCode: '', error: 'Scan or enter a ticket code first.' }

  const upper = raw.toUpperCase()
  const withoutPrefix = upper.startsWith(QR_TICKET_PREFIX)
    ? upper.slice(QR_TICKET_PREFIX.length)
    : upper
  const ticketCode = normalizeTicketCode(withoutPrefix)

  if (!FLEXIBLE_TICKET_CODE_PATTERN.test(ticketCode)) {
    return {
      ticketCode: '',
      error: 'This QR code does not contain a valid ticket code.',
    }
  }

  return { ticketCode, error: '' }
}

export function findRegistrationByQrTicketCode(registrations = [], scannedValue = '') {
  const { ticketCode, error } = parseQrTicketCode(scannedValue)
  if (error) return null

  return registrations.find((registration) => (
    normalizeTicketCode(registration.ticketCode) === ticketCode
  )) || null
}
