import { normalizePaymentStatus } from './paymentStatus.js'

export function normalizePersonsAttending(value, fallback = 1) {
  if (value === '' || value === null || value === undefined) return fallback
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : Number.NaN
}

export function personsCount(registration) {
  const count = normalizePersonsAttending(registration?.personsAttending)
  return Number.isNaN(count) ? 1 : count
}

export function countRegistrationRecords(registrations = []) {
  return Array.isArray(registrations) ? registrations.length : 0
}

export function countTotalGuests(registrations = []) {
  return Array.isArray(registrations)
    ? registrations.reduce((total, registration) => total + personsCount(registration), 0)
    : 0
}

export function getRegistrationGuestSummary(registrations = []) {
  const registrationCount = countRegistrationRecords(registrations)
  const guestCount = countTotalGuests(registrations)
  return `${registrationCount} registration${registrationCount === 1 ? '' : 's'} / ${guestCount} guest${guestCount === 1 ? '' : 's'}`
}

export function formatRegistrationGuestSummary(registrationCount = 0, guestCount = 0) {
  return `${registrationCount} registration${registrationCount === 1 ? '' : 's'} / ${guestCount} guest${guestCount === 1 ? '' : 's'}`
}

export function buildRegistrationMetrics(registrations = [], event = {}) {
  const rows = Array.isArray(registrations) ? registrations : []
  const metrics = rows.reduce((summary, registration) => {
    const persons = personsCount(registration)
    summary.totalRegistrations += 1
    summary.totalPersons += persons

    if (registration.checkedIn) {
      summary.checkedInRegistrations += 1
      summary.checkedInPersons += persons
    }

    const paymentStatus = normalizePaymentStatus(registration.paymentStatus)

    if (paymentStatus === 'paid') {
      summary.paidRegistrations += 1
      summary.paidPersons += persons
    }
    if (paymentStatus === 'pending') {
      summary.pendingRegistrations += 1
      summary.pendingPersons += persons
    }
    if (paymentStatus === 'complimentary') {
      summary.complimentaryRegistrations += 1
      summary.complimentaryPersons += persons
    }
    if (paymentStatus === 'door') {
      summary.doorRegistrations += 1
      summary.doorPersons += persons
    }
    if (!registration.ticketCode) {
      summary.missingTicketRegistrations += 1
      summary.missingTicketPersons += persons
    }

    return summary
  }, {
    totalRegistrations: 0,
    totalPersons: 0,
    checkedInRegistrations: 0,
    checkedInPersons: 0,
    paidRegistrations: 0,
    pendingRegistrations: 0,
    complimentaryRegistrations: 0,
    doorRegistrations: 0,
    missingTicketRegistrations: 0,
    paidPersons: 0,
    pendingPersons: 0,
    complimentaryPersons: 0,
    doorPersons: 0,
    missingTicketPersons: 0,
  })

  metrics.remainingRegistrations = metrics.totalRegistrations - metrics.checkedInRegistrations
  metrics.remainingPersons = metrics.totalPersons - metrics.checkedInPersons
  metrics.capacity = normalizePersonsAttending(event?.capacity, 0)
  metrics.capacityUsed = metrics.totalPersons
  metrics.capacityPercent = metrics.capacity > 0
    ? Math.min(100, Math.round((metrics.capacityUsed / metrics.capacity) * 100))
    : 0

  return metrics
}

export function buildEventMetrics(event = {}, registrations = []) {
  return {
    eventId: event?.eventId || null,
    eventName: event?.eventName || null,
    ...buildRegistrationMetrics(registrations, event),
  }
}
