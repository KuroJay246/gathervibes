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
