import { buildCheckInSummary } from './checkInUtils.js'
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
  return registrations.filter((registration) => registration.paymentStatus === 'pending' || registration.paymentStatus === 'unknown')
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
  if (status === 'paid') return 'Paid'
  if (status === 'pending') return 'Pending payment'
  if (status === 'complimentary') return 'Complimentary'
  return 'Payment unknown'
}

function csvValue(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function formatEventDayCsv(registrations = [], event = {}) {
  const headers = [
    'Event',
    'Full name',
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
    registration.groupName || '',
    registration.personsAttending || 1,
    formatPaymentLabel(registration.paymentStatus),
    normalizeTicketCode(registration.ticketCode),
    formatTicketStatus(registration),
    formatDoorStatus(registration),
  ])

  return [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\n')
}
