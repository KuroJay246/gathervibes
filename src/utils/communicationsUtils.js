import { searchableRegistrationText } from './ticketUtils.js'
import { formatEventDate } from './dateUtils.js'

export const COMMUNICATION_TEMPLATES = [
  {
    id: 'ticket-reminder',
    label: 'Ticket Reminder',
    content: 'Hello {{guestName}}, this is a reminder for {{eventName}}. Your ticket/reference code is {{ticketCode}}. Please keep this handy for check-in.',
  },
  {
    id: 'payment-reminder',
    label: 'Payment Reminder',
    content: 'Hello {{guestName}}, this is a reminder that your payment status for {{eventName}} is currently {{paymentStatus}}. Please contact us if this needs to be updated.',
  },
  {
    id: 'event-day-notice',
    label: 'Event Day Notice',
    content: 'Hello {{guestName}}, we are looking forward to seeing you at {{eventName}}. Please have your ticket/reference code ready for check-in.',
  },
  {
    id: 'door-list-instructions',
    label: 'Door-List Instructions',
    content: 'Hello {{guestName}}, you are listed for {{eventName}}. Please give your name and ticket/reference code at the door.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you / Follow-up',
    content: 'Hello {{guestName}}, thank you for being part of {{eventName}}. We appreciate your support.',
  },
  {
    id: 'missing-ticket',
    label: 'Missing Ticket Code Notice',
    content: 'Hello {{guestName}}, you are registered for {{eventName}} but do not have a ticket code assigned yet. We will assign one shortly.',
  },
]

export function buildMessagePreview(templateContent, registration, event) {
  if (!templateContent) return ''

  const eventName = event?.eventName || 'your event'
  const eventDate = event?.eventDate ? formatEventDate(event.eventDate) : 'the event date'
  const location = event?.location || 'the event location'

  const guestName = registration?.fullName || 'Guest'
  const ticketCode = registration?.ticketCode || 'your ticket code'
  const paymentStatus = registration?.paymentStatus || 'unknown'
  const personsAttending = registration?.personsAttending || 1
  const groupName = registration?.groupName || 'your group'

  return templateContent
    .replace(/\{\{eventName\}\}/g, eventName)
    .replace(/\{\{eventDate\}\}/g, eventDate)
    .replace(/\{\{location\}\}/g, location)
    .replace(/\{\{guestName\}\}/g, guestName)
    .replace(/\{\{ticketCode\}\}/g, ticketCode)
    .replace(/\{\{paymentStatus\}\}/g, paymentStatus)
    .replace(/\{\{personsAttending\}\}/g, personsAttending)
    .replace(/\{\{groupName\}\}/g, groupName)
}

export function filterCommunicationsRegistrations(registrations, filters, searchQuery = '') {
  return registrations.filter((reg) => {
    // Payment Status Filter
    if (filters.paymentStatus !== 'all' && reg.paymentStatus !== filters.paymentStatus) {
      return false
    }

    // Check-in Status Filter
    if (filters.checkInStatus === 'checked-in' && !reg.checkedIn) return false
    if (filters.checkInStatus === 'not-checked-in' && reg.checkedIn) return false

    // Ticket Status Filter
    const hasTicket = Boolean(reg.ticketCode)
    if (filters.ticketStatus === 'assigned' && !hasTicket) return false
    if (filters.ticketStatus === 'not-assigned' && hasTicket) return false

    // Group Filter
    if (filters.groupName && filters.groupName.trim() !== '') {
      const regGroup = (reg.groupName || '').toLowerCase()
      if (!regGroup.includes(filters.groupName.toLowerCase().trim())) {
        return false
      }
    }

    // Search Query Filter
    if (searchQuery.trim() !== '') {
      const text = searchableRegistrationText(reg)
      if (!text.includes(searchQuery.toLowerCase().trim())) {
        return false
      }
    }

    return true
  })
}

export function extractAvailableGroups(registrations) {
  const groups = new Set()
  for (const reg of registrations) {
    if (reg.groupName && reg.groupName.trim() !== '') {
      groups.add(reg.groupName.trim())
    }
  }
  return Array.from(groups).sort()
}

export function buildCommunicationsExport(registrations, templateContent, event) {
  return registrations.map((reg) => {
    const message = buildMessagePreview(templateContent, reg, event)
    const name = reg.fullName || 'Unknown Name'
    const email = reg.email || 'No Email'
    const phone = reg.phone || 'No Phone'
    
    return `---
To: ${name}
Email: ${email}
Phone: ${phone}

${message}`
  }).join('\n\n')
}
