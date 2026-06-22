export function normalizePersonsAttending(value, fallback = 1) {
  if (value === '' || value === null || value === undefined) return fallback
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : Number.NaN
}

export function personsCount(registration) {
  const count = normalizePersonsAttending(registration?.personsAttending)
  return Number.isNaN(count) ? 1 : count
}

export function buildRegistrationMetrics(registrations = [], event = {}) {
  const metrics = registrations.reduce((summary, registration) => {
    const persons = personsCount(registration)
    summary.totalRegistrations += 1
    summary.totalPersons += persons

    if (registration.checkedIn) {
      summary.checkedInRegistrations += 1
      summary.checkedInPersons += persons
    }

    if (registration.paymentStatus === 'paid') {
      summary.paidRegistrations += 1
      summary.paidPersons += persons
    }
    if (registration.paymentStatus === 'pending') {
      summary.pendingRegistrations += 1
      summary.pendingPersons += persons
    }
    if (registration.paymentStatus === 'complimentary') {
      summary.complimentaryRegistrations += 1
      summary.complimentaryPersons += persons
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
    paidPersons: 0,
    pendingPersons: 0,
    complimentaryPersons: 0,
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
