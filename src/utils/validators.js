export function validateEvent(values) {
  const errors = {}

  if (!values.eventName.trim()) errors.eventName = 'Event name is required.'
  if (!values.eventDate) errors.eventDate = 'Event date is required.'
  if (!values.location.trim()) errors.location = 'Location is required.'
  if (!values.eventType) errors.eventType = 'Event type is required.'
  if (!values.status) errors.status = 'Status is required.'

  const capacity = Number(values.capacity)
  if (values.capacity === '' || !Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = 'Capacity must be a whole number greater than zero.'
  }

  const ticketPrice = Number(values.ticketPrice)
  if (values.ticketPrice === '' || Number.isNaN(ticketPrice) || ticketPrice < 0) {
    errors.ticketPrice = 'Ticket price must be zero or greater.'
  }

  return errors
}

export const validPaymentStatuses = ['paid', 'pending', 'complimentary', 'door-list', 'unknown']
export const validTicketStatuses = ['no-ticket-assigned', 'partially-assigned', 'assigned']
const MAX_PERSONS_ATTENDING = 100

export function validateRegistration(values) {
  const errors = {}

  if (!values.fullName?.trim()) errors.fullName = 'Full name is required.'

  const persons = Number(values.personsAttending)
  if (!values.personsAttending || !Number.isInteger(persons) || persons < 1) {
    errors.personsAttending = 'Persons attending must be a whole number of at least 1.'
  } else if (persons > MAX_PERSONS_ATTENDING) {
    errors.personsAttending = `Persons attending cannot exceed ${MAX_PERSONS_ATTENDING}.`
  }

  if (values.paymentStatus && !validPaymentStatuses.includes(values.paymentStatus)) {
    errors.paymentStatus = 'Invalid payment status.'
  }

  if (values.ticketStatus && !validTicketStatuses.includes(values.ticketStatus)) {
    errors.ticketStatus = 'Invalid ticket status.'
  }

  return errors
}
