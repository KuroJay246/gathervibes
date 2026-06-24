import { buildRegistrationMetrics } from './registrationMetrics.js'
import { normalizePaymentStatus } from './paymentStatus.js'
import { calculateRegistrationFinance } from './financeUtils.js'

export const CHECK_IN_VIEWS = [
  { value: 'search', label: 'Search Guest' },
  { value: 'all', label: 'All guests' },
  { value: 'not-checked-in', label: 'Not checked in' },
  { value: 'checked-in', label: 'Checked in' },
  { value: 'door', label: 'Door Paid' },
  { value: 'door-list', label: 'To Pay at Door' },
  { value: 'outstanding', label: 'Outstanding Balance' },
  { value: 'missing-ticket', label: 'Missing Ticket' },
]

export function buildCheckInSummary(registrations = []) {
  const metrics = buildRegistrationMetrics(registrations)
  return {
    ...metrics,
    notCheckedInRegistrations: metrics.remainingRegistrations,
    notCheckedInPersons: metrics.remainingPersons,
    paidCheckedIn: registrations.filter((registration) => registration.checkedIn && normalizePaymentStatus(registration.paymentStatus) === 'paid').length,
    pendingCheckedIn: registrations.filter((registration) => registration.checkedIn && normalizePaymentStatus(registration.paymentStatus) === 'pending').length,
    complimentaryCheckedIn: registrations.filter((registration) => registration.checkedIn && normalizePaymentStatus(registration.paymentStatus) === 'complimentary').length,
    doorCheckedIn: registrations.filter((registration) => registration.checkedIn && normalizePaymentStatus(registration.paymentStatus) === 'door').length,
  }
}

export function filterCheckInRegistrations(registrations = [], view = 'search') {
  if (view === 'checked-in') return registrations.filter((registration) => registration.checkedIn)
  if (view === 'not-checked-in') return registrations.filter((registration) => !registration.checkedIn)
  if (view === 'door') return registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'door')
  if (view === 'door-list') return registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'door-list')
  if (view === 'outstanding') return registrations.filter((registration) => (calculateRegistrationFinance(registration).balanceDue || 0) > 0)
  if (view === 'missing-ticket') return registrations.filter((registration) => !registration.ticketCode)
  if (view === 'all') return registrations
  return []
}

export function formatCheckInTime(value) {
  if (!value) return 'Not checked in'
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
