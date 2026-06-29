import { parseMoney } from './financeUtils.js'

export function getSafePriceTiers(event = null) {
  return Array.isArray(event?.priceTiers) ? event.priceTiers : []
}

export function getSafeTicketPrice(event = null) {
  return parseMoney(event?.ticketPrice)
}

export function hasSelectedWorkingEvent(event = null) {
  return Boolean(event?.eventId)
}

export function getWorkingEventDisplayName(event = null) {
  return event?.eventName || 'No selected Working Event'
}
