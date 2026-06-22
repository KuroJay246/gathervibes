import { searchableRegistrationText } from './ticketUtils.js'

function includesQuery(value, query) {
  return String(value || '').toLowerCase().includes(query)
}

export function buildAdminSearchResults({ query, events = [], registrations = [], activeEvent = null }) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  const eventResults = events
    .filter((event) => includesQuery(event.eventName, normalizedQuery))
    .slice(0, 6)
    .map((event) => ({
      id: `event-${event.eventId}`,
      type: 'Event',
      title: event.eventName,
      detail: event.location || 'Event record',
      to: '/events',
    }))

  if (!activeEvent?.eventId) return eventResults

  const registrationResults = registrations
    .filter((registration) => searchableRegistrationText(registration).includes(normalizedQuery))
    .slice(0, 8)
    .flatMap((registration) => {
      const base = {
        title: registration.fullName,
        detail: registration.email || registration.phone || registration.ticketCode || activeEvent.eventName,
      }

      const results = [{
        ...base,
        id: `registration-${registration.registrationId}`,
        type: 'Registration',
        to: '/registrations',
      }]

      if (registration.ticketCode || normalizedQuery.includes('gsv')) {
        results.push({
          ...base,
          id: `ticket-${registration.registrationId}`,
          type: 'Ticket',
          detail: registration.ticketCode || 'Ticket assignment',
          to: '/tickets',
        })
      }

      if (registration.checkedIn || normalizedQuery.includes('check')) {
        results.push({
          ...base,
          id: `check-in-${registration.registrationId}`,
          type: 'Check-In',
          detail: registration.checkedIn ? 'Already checked in' : 'Door check-in record',
          to: '/check-in',
        })
      }

      return results
    })
    .slice(0, 10)

  return eventResults.concat(registrationResults).slice(0, 12)
}

