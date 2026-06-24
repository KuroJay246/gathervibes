import { calculateRegistrationFinance } from './financeUtils.js'

export const EXPORT_PRESETS = [
  { id: 'basic', label: 'Basic guest list' },
  { id: 'door', label: 'Door / check-in list' },
  { id: 'finance', label: 'Finance report' },
  { id: 'communications', label: 'Communications list' },
  { id: 'admin', label: 'Full admin export' },
  { id: 'reimport', label: 'Google Forms re-import template' },
]

export const ALL_EXPORT_COLUMNS = [
  'eventId',
  'eventName',
  'registrationId',
  'fullName',
  'buyerName',
  'attendeeNames',
  'groupName',
  'email',
  'phone',
  'personsAttending',
  'paymentStatus',
  'paymentMethod',
  'paymentReference',
  'priceTier',
  'ticketPrice',
  'amountDue',
  'amountPaid',
  'balanceDue',
  'ticketCode',
  'checkedIn',
  'checkedInAt',
  'dietaryNotes',
  'preferredSchool',
  'notes',
  'createdAt',
  'updatedAt',
]

function formatList(arr) {
  if (!Array.isArray(arr)) return ''
  return arr.join(', ')
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  if (timestamp.toDate) return timestamp.toDate().toISOString()
  if (timestamp instanceof Date) return timestamp.toISOString()
  if (typeof timestamp === 'string') return timestamp
  if (typeof timestamp === 'number') return new Date(timestamp).toISOString()
  return ''
}

export function buildExportRows(registrations, event, presetId = 'admin') {
  return registrations.map((reg) => {
    const finance = calculateRegistrationFinance(reg, event)

    const fullRow = {
      eventId: reg.eventId || '',
      eventName: event?.eventName || '',
      registrationId: reg.registrationId || '',
      fullName: reg.fullName || '',
      buyerName: reg.buyerName || '',
      attendeeNames: formatList(reg.attendeeNames),
      groupName: reg.groupName || '',
      email: reg.email || '',
      phone: reg.phone || '',
      personsAttending: reg.personsAttending || 1,
      paymentStatus: finance.paymentStatus || '',
      paymentMethod: finance.paymentMethod || '',
      paymentReference: reg.paymentReference || '',
      priceTier: finance.priceTier || '',
      ticketPrice: finance.ticketPrice !== null ? finance.ticketPrice : '',
      amountDue: finance.amountDue !== null ? finance.amountDue : '',
      amountPaid: finance.amountPaid !== null ? finance.amountPaid : '',
      balanceDue: finance.balanceDue !== null ? finance.balanceDue : '',
      ticketCode: reg.ticketCode || '',
      checkedIn: reg.checkedIn ? 'Yes' : 'No',
      checkedInAt: formatDate(reg.checkedInAt),
      dietaryNotes: reg.dietaryNotes || '',
      preferredSchool: reg.preferredSchool || '',
      notes: reg.notes || '',
      createdAt: formatDate(reg.createdAt),
      updatedAt: formatDate(reg.updatedAt),
    }

    if (presetId === 'basic') {
      return {
        fullName: fullRow.fullName,
        buyerName: fullRow.buyerName,
        attendeeNames: fullRow.attendeeNames,
        groupName: fullRow.groupName,
        email: fullRow.email,
        phone: fullRow.phone,
        personsAttending: fullRow.personsAttending,
        paymentStatus: fullRow.paymentStatus,
        ticketCode: fullRow.ticketCode,
        checkedIn: fullRow.checkedIn,
      }
    }

    if (presetId === 'door') {
      return {
        fullName: fullRow.fullName,
        buyerName: fullRow.buyerName,
        attendeeNames: fullRow.attendeeNames,
        personsAttending: fullRow.personsAttending,
        paymentStatus: fullRow.paymentStatus,
        balanceDue: fullRow.balanceDue,
        ticketCode: fullRow.ticketCode,
        checkedIn: fullRow.checkedIn,
        dietaryNotes: fullRow.dietaryNotes,
        notes: fullRow.notes,
      }
    }

    if (presetId === 'finance') {
      return {
        fullName: fullRow.fullName,
        buyerName: fullRow.buyerName,
        email: fullRow.email,
        paymentStatus: fullRow.paymentStatus,
        paymentMethod: fullRow.paymentMethod,
        paymentReference: fullRow.paymentReference,
        priceTier: fullRow.priceTier,
        ticketPrice: fullRow.ticketPrice,
        amountDue: fullRow.amountDue,
        amountPaid: fullRow.amountPaid,
        balanceDue: fullRow.balanceDue,
      }
    }

    if (presetId === 'communications') {
      return {
        fullName: fullRow.fullName,
        buyerName: fullRow.buyerName,
        email: fullRow.email,
        phone: fullRow.phone,
        paymentStatus: fullRow.paymentStatus,
        balanceDue: fullRow.balanceDue,
        ticketCode: fullRow.ticketCode,
      }
    }

    if (presetId === 'reimport') {
      return {
        'Full Name': fullRow.fullName,
        'Buyer Name': fullRow.buyerName,
        'Guest Names': fullRow.attendeeNames,
        'Group Name': fullRow.groupName,
        'Email Address': fullRow.email,
        'Phone Number': fullRow.phone,
        'Persons Attending': fullRow.personsAttending,
        'Payment Status': fullRow.paymentStatus,
        'Payment Method': fullRow.paymentMethod,
        'Payment Reference': fullRow.paymentReference,
        'Price Tier': fullRow.priceTier,
        'Ticket Price': fullRow.ticketPrice,
        'Amount Due': fullRow.amountDue,
        'Amount Paid': fullRow.amountPaid,
        'Balance Due': fullRow.balanceDue,
        'Ticket Code': fullRow.ticketCode,
        'Dietary Notes': fullRow.dietaryNotes,
        'Preferred School': fullRow.preferredSchool,
        Notes: fullRow.notes,
      }
    }

    return fullRow
  })
}

export function escapeCsv(val) {
  if (val === null || val === undefined) return '""'
  let str = String(val)
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export function convertToCsv(dataRows) {
  if (!dataRows || dataRows.length === 0) return ''
  const headers = Object.keys(dataRows[0])

  const csvRows = []
  csvRows.push(headers.map(escapeCsv).join(','))

  for (const row of dataRows) {
    csvRows.push(headers.map((header) => escapeCsv(row[header])).join(','))
  }

  return csvRows.join('\n')
}

export function downloadCsv(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
