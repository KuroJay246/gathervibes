import { buildCheckInSummary } from './checkInUtils.js'
import { formatPaymentLabel as sharedFormatPaymentLabel, normalizePaymentStatus } from './paymentStatus.js'
import { normalizeTicketCode } from './ticketUtils.js'

export function buildEventDaySummary(registrations = []) {
  const summary = buildCheckInSummary(registrations)
  const ticketAssignedRegistrations = registrations.filter((registration) => normalizeTicketCode(registration.ticketCode)).length
  const missingTicketRegistrations = registrations.length - ticketAssignedRegistrations

  return {
    ...summary,
    ticketAssignedRegistrations,
    missingTicketRegistrations,
    manualLookupReady: true,
    qrLookupReady: ticketAssignedRegistrations > 0,
  }
}

export function getMissingTicketRegistrations(registrations = []) {
  return registrations.filter((registration) => !normalizeTicketCode(registration.ticketCode))
}

export function getPendingPaymentRegistrations(registrations = []) {
  return registrations.filter((registration) => {
    const status = normalizePaymentStatus(registration.paymentStatus)
    return status === 'pending' || status === 'unknown' || status === 'door-list'
  })
}

export function getDoorListRegistrations(registrations = []) {
  return [...registrations].sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')))
}

export function formatTicketStatus(registration = {}) {
  return normalizeTicketCode(registration.ticketCode) ? 'Ticket assigned' : 'No ticket assigned'
}

export function formatDoorStatus(registration = {}) {
  return registration.checkedIn ? 'Checked in' : 'Not checked in'
}

export function formatPaymentLabel(status = '') {
  const normalized = normalizePaymentStatus(status)
  if (normalized === 'pending') return 'Pending payment'
  if (normalized === 'door') return 'Door Paid'
  if (normalized === 'door-list') return 'To Pay at Door'
  return sharedFormatPaymentLabel(normalized)
}

function csvValue(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) ? registration.attendeeNames.join('; ') : ''
}

export function formatEventDayCsv(registrations = [], event = {}) {
  const headers = [
    'Event',
    'Full name',
    'Buyer name',
    'Attendee names',
    'Group name',
    'Persons attending',
    'Payment status',
    'Ticket code',
    'Ticket status',
    'Check-in status',
  ]

  const rows = registrations.map((registration) => [
    event.eventName || '',
    registration.fullName || '',
    registration.buyerName || '',
    attendeeNamesText(registration),
    registration.groupName || '',
    registration.personsAttending || 1,
    formatPaymentLabel(registration.paymentStatus),
    normalizeTicketCode(registration.ticketCode),
    formatTicketStatus(registration),
    formatDoorStatus(registration),
  ])

  return [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\n')
}
