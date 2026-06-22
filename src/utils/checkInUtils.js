export const CHECK_IN_VIEWS = [
  { value: 'search', label: 'Search Guest' },
  { value: 'checked-in', label: 'Checked In' },
  { value: 'not-checked-in', label: 'Not Checked In' },
  { value: 'all', label: 'All Guests' },
]

export function personsCount(registration) {
  const count = Number(registration?.personsAttending)
  return Number.isInteger(count) && count > 0 ? count : 1
}

export function buildCheckInSummary(registrations = []) {
  const initial = {
    totalRegistrations: 0,
    totalPersons: 0,
    checkedInRegistrations: 0,
    checkedInPersons: 0,
    notCheckedInRegistrations: 0,
    notCheckedInPersons: 0,
    paidCheckedIn: 0,
    pendingCheckedIn: 0,
    complimentaryCheckedIn: 0,
  }

  return registrations.reduce((summary, registration) => {
    const persons = personsCount(registration)
    summary.totalRegistrations += 1
    summary.totalPersons += persons

    if (registration.checkedIn) {
      summary.checkedInRegistrations += 1
      summary.checkedInPersons += persons
      if (registration.paymentStatus === 'paid') summary.paidCheckedIn += 1
      if (registration.paymentStatus === 'pending') summary.pendingCheckedIn += 1
      if (registration.paymentStatus === 'complimentary') summary.complimentaryCheckedIn += 1
    } else {
      summary.notCheckedInRegistrations += 1
      summary.notCheckedInPersons += persons
    }

    return summary
  }, initial)
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
