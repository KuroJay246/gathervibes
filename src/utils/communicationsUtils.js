import { searchableRegistrationText } from './ticketUtils.js'
import { formatEventDate } from './dateUtils.js'
import { formatPaymentLabel, paymentStatusMatches } from './paymentStatus.js'
import {
  buildFinanceClassificationContext,
  buildFinanceSummary,
  calculateRegistrationFinance,
  classifyRegistrationFinance,
  formatCurrency,
  formatPaymentMethod,
} from './financeUtils.js'

export const COMMUNICATION_TEMPLATES = [
  {
    id: 'ticket-reminder',
    label: 'Ticket / QR Reminder',
    purpose: 'Ticket reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} ticket reminder',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName', 'ticketCode'],
    content: 'Hello {{guestName}}, this is a reminder for {{eventName}}. Your ticket/reference code is {{ticketCode}}. Please keep this handy for check-in.',
  },
  {
    id: 'payment-reminder',
    label: 'Payment Reminder',
    purpose: 'Payment reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} payment follow-up',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName', 'paymentStatus'],
    content: 'Hello {{guestName}}, this is a reminder that your payment status for {{eventName}} is currently {{paymentStatus}}. Please contact us if this needs to be updated.',
  },
  {
    id: 'balance-due-reminder',
    label: 'Balance Due Reminder',
    purpose: 'Payment evidence request',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} outstanding balance',
    version: 'event-neutral-v2',
    fields: ['buyerName', 'eventName', 'balanceDue', 'paymentReference'],
    content: 'Hello {{buyerName}}, your balance due for {{eventName}} is {{balanceDue}}. Please use your payment reference {{paymentReference}} when following up.',
  },
  {
    id: 'event-day-notice',
    label: 'Event Reminder',
    purpose: 'Event reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} event reminder',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName', 'venue', 'ticketCode'],
    content: 'Hello {{guestName}}, we are looking forward to seeing you at {{eventName}} at {{venue}}. Please have your ticket/reference code ready for check-in.',
  },
  {
    id: 'door-payment-instructions',
    label: 'Door Payment Instructions',
    purpose: 'Payment reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} door payment instructions',
    version: 'event-neutral-v2',
    fields: ['buyerName', 'eventName', 'balanceDue', 'attendeeNames'],
    content: 'Hello {{buyerName}}, your {{eventName}} registration is marked for door payment. Please bring {{balanceDue}} and check in with {{attendeeNames}} at the door.',
  },
  {
    id: 'payment-received',
    label: 'Payment Received Confirmation',
    purpose: 'Registration confirmation',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} payment received',
    version: 'event-neutral-v2',
    fields: ['buyerName', 'eventName', 'amountPaid', 'ticketCode'],
    content: 'Hello {{buyerName}}, payment received for {{eventName}}. Amount paid: {{amountPaid}}. Your ticket/reference code is {{ticketCode}}.',
  },
  {
    id: 'ticket-qr-reminder',
    label: 'Ticket / QR Reminder',
    purpose: 'Ticket reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} ticket code',
    version: 'event-neutral-v2',
    fields: ['guestName', 'ticketCode', 'eventName'],
    content: 'Hello {{guestName}}, please keep your ticket code {{ticketCode}} ready for {{eventName}} check-in.',
  },
  {
    id: 'thank-you-payment',
    label: 'Thank-you After Payment',
    purpose: 'Thank-you / follow-up',
    audience: 'Guests and Registrations',
    subject: 'Thank you for {{eventName}}',
    version: 'event-neutral-v2',
    fields: ['buyerName', 'eventName', 'attendeeNames'],
    content: 'Hello {{buyerName}}, thank you for your payment for {{eventName}}. We look forward to seeing {{attendeeNames}}.',
  },
  {
    id: 'check-in-instructions',
    label: 'Check-In Instructions',
    purpose: 'Event-day instruction',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} check-in instructions',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName', 'ticketCode', 'attendeeNames'],
    content: 'Hello {{guestName}}, check-in for {{eventName}} will use your name and ticket code {{ticketCode}}. Please arrive with your group: {{attendeeNames}}.',
  },
  {
    id: 'group-reminder',
    label: 'Group Reminder',
    purpose: 'Event reminder',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} group reminder',
    version: 'event-neutral-v2',
    fields: ['buyerName', 'eventName', 'groupName', 'attendeeNames'],
    content: 'Hello {{buyerName}}, this is a reminder for {{eventName}}. Your group {{groupName}} includes {{attendeeNames}}.',
  },
  {
    id: 'thank-you',
    label: 'Thank-you Message',
    purpose: 'Thank-you / follow-up',
    audience: 'Guests and Registrations',
    subject: 'Thank you from {{eventName}}',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName'],
    content: 'Hello {{guestName}}, thank you for being part of {{eventName}}. We appreciate your support.',
  },
  {
    id: 'post-event-follow-up',
    label: 'Post-event Follow-up',
    purpose: 'Thank-you / follow-up',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} follow-up',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName'],
    content: 'Hello {{guestName}}, thank you for attending {{eventName}}. We hope to see you again soon.',
  },
  {
    id: 'missing-ticket',
    label: 'Missing Ticket Code Follow-up',
    purpose: 'Missing information request',
    audience: 'Guests and Registrations',
    subject: '{{eventName}} ticket follow-up',
    version: 'event-neutral-v2',
    fields: ['guestName', 'eventName'],
    content: 'Hello {{guestName}}, you are registered for {{eventName}} but do not have a ticket code assigned yet. We will assign one shortly.',
  },
  {
    id: 'supplier-follow-up',
    label: 'Supplier Follow-Up',
    purpose: 'Supplier follow-up',
    audience: 'Suppliers and Partners',
    subject: '{{eventName}} supplier follow-up',
    version: 'event-neutral-v1',
    fields: ['buyerName', 'eventName', 'venue'],
    content: 'Hello {{buyerName}}, following up on {{eventName}} at {{venue}}. Please confirm the details we discussed and share any next steps or receipt information.',
  },
  {
    id: 'commitment-reminder',
    label: 'Commitment Reminder',
    purpose: 'Commitment reminder',
    audience: 'Suppliers and Partners',
    subject: '{{eventName}} commitment reminder',
    version: 'event-neutral-v1',
    fields: ['buyerName', 'eventName', 'balanceDue'],
    content: 'Hello {{buyerName}}, this is a reminder about the open commitment for {{eventName}}. Current follow-up amount or balance: {{balanceDue}}.',
  },
  {
    id: 'task-follow-up',
    label: 'Task Follow-Up',
    purpose: 'Task follow-up',
    audience: 'Internal Operations',
    subject: '{{eventName}} task follow-up',
    version: 'event-neutral-v1',
    fields: ['buyerName', 'eventName', 'eventDate'],
    content: 'Hello {{buyerName}}, this is a follow-up for {{eventName}} on {{eventDate}}. Please review the task context and confirm the next action.',
  },
  {
    id: 'response-info-request',
    label: 'Response Information Request',
    purpose: 'Missing information request',
    audience: 'Response Inbox',
    subject: '{{eventName}} information request',
    version: 'event-neutral-v1',
    fields: ['guestName', 'eventName'],
    content: 'Hello {{guestName}}, thank you for your {{eventName}} response. We need one more detail before it can move into import review. Please reply with the missing information.',
  },
  {
    id: 'internal-staff-note',
    label: 'Supplier / Partner / Staff Internal Note',
    purpose: 'Internal operations note',
    audience: 'Internal Operations',
    subject: '{{eventName}} internal note',
    version: 'event-neutral-v2',
    fields: ['guestName', 'buyerName', 'eventName', 'paymentStatus', 'balanceDue', 'groupName', 'ticketCode'],
    content: 'Internal note for {{eventName}}: {{guestName}} / {{buyerName}} has payment status {{paymentStatus}}, balance {{balanceDue}}, group {{groupName}}, ticket {{ticketCode}}.',
  },
]

export const MESSAGE_WORKFLOW_STEPS = [
  'Working Event',
  'Purpose',
  'Recipient Context',
  'Template',
  'Personalize',
  'Preview',
  'Copy',
]

export const MESSAGE_TONE_OPTIONS = ['Professional', 'Friendly', 'Brief']

export function missingMergeFields(templateContent = '', registration = {}, event = {}) {
  const fields = [...String(templateContent).matchAll(/\{\{([a-zA-Z0-9]+)\}\}/g)].map((match) => match[1])
  const finance = calculateRegistrationFinance(registration, event)
  const availability = {
    eventName: Boolean(event?.eventName),
    eventDate: Boolean(event?.eventDate),
    eventTime: Boolean(event?.eventDate),
    location: Boolean(event?.location),
    venue: Boolean(event?.location),
    guestName: Boolean(registration?.fullName),
    buyerName: Boolean(registration?.buyerName || registration?.fullName),
    attendeeNames: Array.isArray(registration?.attendeeNames) && registration.attendeeNames.length > 0,
    ticketCode: Boolean(registration?.ticketCode),
    paymentStatus: Boolean(registration?.paymentStatus),
    personsAttending: Boolean(registration?.personsAttending),
    groupName: Boolean(registration?.groupName),
    amountDue: finance.amountDue !== null,
    amountPaid: registration?.amountPaid !== undefined,
    balanceDue: finance.balanceDue !== null,
    paymentMethod: Boolean(registration?.paymentMethod),
    paymentReference: Boolean(registration?.paymentReference),
  }
  return [...new Set(fields.filter((field) => !availability[field]))]
}

export function buildMessageSubject(template = {}, registration = {}, event = {}) {
  return buildMessagePreview(template.subject || '{{eventName}} message', registration, event)
}

export const COMMUNICATION_SEGMENTS = {
  finance: [
    ['all', 'All finance segments'],
    ['outstanding', 'Payment outstanding'],
    ['payment-follow-up', 'Payment follow-up'],
    ['data-review', 'Active data review'],
    ['pending-payment', 'Pending payment'],
    ['door-payment', 'Door expected'],
    ['paid-guests', 'Paid guests'],
    ['complimentary-guests', 'Complimentary guests'],
    ['missing-payment-reference', 'Active missing payment reference'],
    ['missing-ticket-code', 'Missing ticket code'],
    ['balance-due', 'Balance due greater than 0'],
    ['amount-paid-zero', 'Paid amount not recorded'],
  ],
  ticket: [
    ['all', 'All ticket statuses'],
    ['assigned', 'Ticket assigned'],
    ['not-assigned', 'Missing ticket code'],
    ['qr-ready', 'QR ready'],
  ],
  contact: [
    ['all', 'All contacts'],
    ['missing-email', 'Missing email'],
    ['missing-phone', 'Missing phone'],
    ['missing-email-or-phone', 'Missing email or phone'],
    ['has-buyer', 'Buyer/contact present'],
    ['has-attendees', 'Attendee names present'],
    ['has-group', 'Group name present'],
    ['imported', 'Imported batch/source rows'],
    ['school', 'School/organization noted'],
  ],
}

export function buildMessagePreview(templateContent, registration, event) {
  if (!templateContent) return ''

  const eventName = event?.eventName || 'your event'
  const eventDate = event?.eventDate ? formatEventDate(event.eventDate) : 'the event date'
  const eventTime = event?.eventDate ? formatEventDate(event.eventDate) : 'the event time'
  const location = event?.location || 'the event location'

  const guestName = registration?.fullName || 'Guest'
  const buyerName = registration?.buyerName || guestName
  const attendeeNames = Array.isArray(registration?.attendeeNames) && registration.attendeeNames.length > 0
    ? registration.attendeeNames.join(', ')
    : guestName
  const ticketCode = registration?.ticketCode || 'your ticket code'
  const paymentStatus = formatPaymentLabel(registration?.paymentStatus || 'unknown')
  const personsAttending = registration?.personsAttending || 1
  const groupName = registration?.groupName || 'your group'
  const finance = calculateRegistrationFinance(registration, event)
  const amountDue = finance.amountDue === null ? 'an amount that needs review' : formatCurrency(finance.amountDue, finance.currency)
  const amountPaid = formatCurrency(finance.amountPaid, finance.currency)
  const balanceDue = finance.balanceDue === null ? 'an amount that needs review' : formatCurrency(finance.balanceDue, finance.currency)
  const paymentMethod = formatPaymentMethod(finance.paymentMethod)
  const paymentReference = registration?.paymentReference || 'your payment reference'

  return templateContent
    .replace(/\{\{eventName\}\}/g, eventName)
    .replace(/\{\{eventDate\}\}/g, eventDate)
    .replace(/\{\{eventTime\}\}/g, eventTime)
    .replace(/\{\{location\}\}/g, location)
    .replace(/\{\{venue\}\}/g, location)
    .replace(/\{\{guestName\}\}/g, guestName)
    .replace(/\{\{buyerName\}\}/g, buyerName)
    .replace(/\{\{attendeeNames\}\}/g, attendeeNames)
    .replace(/\{\{ticketCode\}\}/g, ticketCode)
    .replace(/\{\{paymentStatus\}\}/g, paymentStatus)
    .replace(/\{\{personsAttending\}\}/g, personsAttending)
    .replace(/\{\{groupName\}\}/g, groupName)
    .replace(/\{\{amountDue\}\}/g, amountDue)
    .replace(/\{\{amountPaid\}\}/g, amountPaid)
    .replace(/\{\{balanceDue\}\}/g, balanceDue)
    .replace(/\{\{paymentMethod\}\}/g, paymentMethod)
    .replace(/\{\{paymentReference\}\}/g, paymentReference)
}

export function buildMissingDataWarnings(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  const warnings = []
  if (!registration.email) warnings.push('Missing email')
  if (!registration.phone) warnings.push('Missing phone')
  if (!registration.ticketCode) warnings.push('Missing ticket code')
  if (finance.balanceDue > 0) warnings.push('Outstanding balance')
  if (finance.paymentStatus === 'paid' && !registration.paymentReference) warnings.push('Missing payment reference')
  if (!registration.fullName && (!Array.isArray(registration.attendeeNames) || registration.attendeeNames.length === 0)) warnings.push('Missing guest name')
  return warnings
}

export function filterCommunicationsRegistrations(registrations, filters, searchQuery = '', event = {}) {
  const financeContext = buildFinanceClassificationContext(registrations, event)

  return registrations.filter((reg) => {
    // Payment Status Filter
    if (!paymentStatusMatches(reg.paymentStatus, filters.paymentStatus)) {
      return false
    }

    const finance = classifyRegistrationFinance(reg, event, financeContext)
    if (filters.financeSegment === 'outstanding' && !finance.outstandingPayment) return false
    if (filters.financeSegment === 'payment-follow-up' && !finance.paymentFollowUpRequired) return false
    if (filters.financeSegment === 'data-review' && !finance.dataReviewProminent) return false
    if (filters.financeSegment === 'pending-payment' && !['pending', 'partial', 'unknown'].includes(finance.statusGroup)) return false
    if (filters.financeSegment === 'door-payment' && finance.statusGroup !== 'door-list') return false
    if (filters.financeSegment === 'paid-guests' && !finance.isResolvedPaid) return false
    if (filters.financeSegment === 'complimentary-guests' && finance.paymentStatus !== 'complimentary') return false
    if (filters.financeSegment === 'missing-payment-reference' && !(finance.dataReviewProminent && finance.dataReviewCategoryKeys?.includes('missing-payment-reference'))) return false
    if (filters.financeSegment === 'missing-ticket-code' && reg.ticketCode) return false
    if (filters.financeSegment === 'balance-due' && !finance.outstandingPayment) return false
    if (filters.financeSegment === 'amount-paid-zero' && !finance.dataReviewCategoryKeys?.includes('paid-amount-not-recorded')) return false

    // Check-in Status Filter
    if (filters.checkInStatus === 'checked-in' && !reg.checkedIn) return false
    if (filters.checkInStatus === 'not-checked-in' && reg.checkedIn) return false

    // Ticket Status Filter
    const hasTicket = Boolean(reg.ticketCode)
    if (filters.ticketStatus === 'assigned' && !hasTicket) return false
    if (filters.ticketStatus === 'not-assigned' && hasTicket) return false
    if (filters.ticketStatus === 'qr-ready' && !hasTicket) return false

    if (filters.contactSegment === 'missing-email' && reg.email) return false
    if (filters.contactSegment === 'missing-phone' && reg.phone) return false
    if (filters.contactSegment === 'missing-email-or-phone' && reg.email && reg.phone) return false
    if (filters.contactSegment === 'has-buyer' && !reg.buyerName && !reg.email && !reg.phone) return false
    if (filters.contactSegment === 'has-attendees' && (!Array.isArray(reg.attendeeNames) || reg.attendeeNames.length === 0)) return false
    if (filters.contactSegment === 'has-group' && !reg.groupName) return false
    if (filters.contactSegment === 'imported' && !reg.sourceRowId && reg.source !== 'import') return false
    if (filters.contactSegment === 'school' && !/school|organization|organisation/i.test(`${reg.notes || ''} ${reg.groupName || ''}`)) return false

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

export function buildCommunicationsSegmentSummary(registrations = [], event = {}) {
  const finance = buildFinanceSummary(registrations, event)
  return registrations.reduce((summary, registration) => {
    const warnings = buildMissingDataWarnings(registration, event)
    summary.missingEmail += registration.email ? 0 : 1
    summary.missingPhone += registration.phone ? 0 : 1
    summary.missingEmailOrPhone += registration.email && registration.phone ? 0 : 1
    summary.missingTicket += registration.ticketCode ? 0 : 1
    summary.outstandingBalance += calculateRegistrationFinance(registration, event).balanceDue > 0 ? 1 : 0
    summary.warningCount += warnings.length
    return summary
  }, {
    totalRegistrations: registrations.length,
    totalPersons: registrations.reduce((total, registration) => total + (Number(registration.personsAttending) || 1), 0),
    missingEmail: 0,
    missingPhone: 0,
    missingEmailOrPhone: 0,
    missingTicket: 0,
    outstandingBalance: 0,
    warningCount: 0,
    finance,
  })
}

export function buildCommunicationMessages(registrations = [], templateContent = '', event = {}) {
  return registrations.map((registration) => ({
    registrationId: registration.registrationId || registration.id || '',
    name: registration.fullName || registration.buyerName || 'Unknown Name',
    buyerName: registration.buyerName || registration.fullName || 'Unknown Buyer',
    email: registration.email || '',
    phone: registration.phone || '',
    ticketCode: registration.ticketCode || '',
    message: buildMessagePreview(templateContent, registration, event),
    warnings: buildMissingDataWarnings(registration, event),
  }))
}

export function buildRecipientList(registrations = []) {
  return registrations.map((registration) => {
    const name = registration.fullName || registration.buyerName || 'Unknown Name'
    const email = registration.email || 'No Email'
    const phone = registration.phone || 'No Phone'
    return `${name} | ${email} | ${phone}`
  }).join('\n')
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function buildCommunicationsCsvPacket(registrations = [], templateContent = '', event = {}) {
  const header = ['Name', 'Buyer', 'Email', 'Phone', 'Ticket Code', 'Payment Status', 'Balance Due', 'Message']
  const rows = registrations.map((registration) => {
    const finance = calculateRegistrationFinance(registration, event)
    return [
      registration.fullName || 'Unknown Name',
      registration.buyerName || registration.fullName || 'Unknown Buyer',
      registration.email || '',
      registration.phone || '',
      registration.ticketCode || '',
      formatPaymentLabel(registration.paymentStatus || 'unknown'),
      finance.balanceDue === null ? 'Needs review' : formatCurrency(finance.balanceDue, finance.currency),
      buildMessagePreview(templateContent, registration, event),
    ].map(csvCell).join(',')
  })
  return [header.join(','), ...rows].join('\n')
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
    const buyerName = reg.buyerName || name
    const attendeeNames = Array.isArray(reg.attendeeNames) && reg.attendeeNames.length > 0 ? reg.attendeeNames.join(', ') : 'No attendee names'
    const email = reg.email || 'No Email'
    const phone = reg.phone || 'No Phone'
    
    return `---
To: ${name}
Buyer / Contact: ${buyerName}
Guests Attending: ${attendeeNames}
Email: ${email}
Phone: ${phone}

${message}`
  }).join('\n\n')
}
