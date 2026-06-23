import { buildRegistrationMetrics } from './registrationMetrics.js'
import { normalizePaymentStatus } from './paymentStatus.js'

export const CHECK_IN_VIEWS = [
  { value: 'search', label: 'Search Guest' },
  { value: 'checked-in', label: 'Checked In' },
  { value: 'not-checked-in', label: 'Not Checked In' },
  { value: 'all', label: 'All Guests' },
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
