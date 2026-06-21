import { dateFromValue, parseTimestampSafely } from './dateUtils.js'

export const MAX_PERSONS_ATTENDING = 100

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function parseCSV(text) {
  if (!text) return { headers: [], rows: [] }

  const rows = []
  let currentRow = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        currentCell += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentCell)
        currentCell = ''
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentCell)
        rows.push(currentRow)
        currentRow = []
        currentCell = ''
        if (char === '\r') i++
      } else if (char !== '\r') {
        currentCell += char
      }
    }
  }

  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  const cleanedRows = rows.filter((row) => row.some((cell) => cell.trim() !== ''))

  if (cleanedRows.length === 0) return { headers: [], rows: [] }

  const headers = cleanedRows[0].map((h) => h.trim())
  const dataRows = cleanedRows.slice(1).map((row, index) => {
    while (row.length < headers.length) row.push('')
    return {
      _sourceRowId: `row-${index + 1}`,
      data: row.slice(0, headers.length).map((c) => c.trim()),
    }
  })

  return { headers, rows: dataRows }
}

export function normalizePaymentStatus(val) {
  if (!val) return 'unknown'
  const s = val.toLowerCase().trim()
  if (s === 'paid') return 'paid'
  if (s === 'pending') return 'pending'
  if (s === 'complimentary' || s === 'comp') return 'complimentary'
  if (s === 'door-list' || s === 'door' || s === 'door list') return 'door-list'
  return 'unknown'
}

export function normalizeEmail(val) {
  if (!val) return null
  const trimmed = val.trim().toLowerCase()
  return trimmed || null
}

export function normalizePhone(val) {
  if (!val) return null
  const trimmed = val.trim()
  return trimmed || null
}

export function timestampMillis(value) {
  const date = dateFromValue(value)
  return date ? date.getTime() : null
}

export async function generateStableId(eventId, row) {
  const ts = row.timestamp ? timestampMillis(row.timestamp) : ''
  let key = ''
  if (row.email) {
    key = `${eventId}:email:${row.email}:${ts}`
  } else if (row.phone) {
    key = `${eventId}:phone:${row.phone}:${ts}`
  } else {
    key = `${eventId}:row:${row.sourceRowId}`
  }
  const hash = await sha256(key)
  return `imp_${hash.substring(0, 16)}`
}

export function mapRows(parsedRows, headers, fieldMap) {
  return parsedRows.map((parsedRow) => {
    const rowObj = {
      sourceRowId: parsedRow._sourceRowId,
      source: 'csv-import',
      checkedIn: false,
      checkInTime: null,
      ticketStatus: 'no-ticket-assigned',
    }

    rowObj.fullName = fieldMap.fullName !== undefined ? parsedRow.data[fieldMap.fullName] : ''
    rowObj.email = normalizeEmail(fieldMap.email !== undefined ? parsedRow.data[fieldMap.email] : '')
    rowObj.phone = normalizePhone(fieldMap.phone !== undefined ? parsedRow.data[fieldMap.phone] : null)
    rowObj.groupName = fieldMap.groupName !== undefined ? parsedRow.data[fieldMap.groupName]?.trim() || null : null

    const rawPersons = fieldMap.personsAttending !== undefined ? parsedRow.data[fieldMap.personsAttending] : ''
    rowObj.personsAttending = Number(rawPersons) || 1

    rowObj.paymentStatus = normalizePaymentStatus(fieldMap.paymentStatus !== undefined ? parsedRow.data[fieldMap.paymentStatus] : '')
    rowObj.paymentReference = fieldMap.paymentReference !== undefined ? parsedRow.data[fieldMap.paymentReference]?.trim() || null : null
    rowObj.notes = fieldMap.notes !== undefined ? parsedRow.data[fieldMap.notes]?.trim() || '' : ''

    const rawTimestamp = fieldMap.timestamp !== undefined ? parsedRow.data[fieldMap.timestamp] : ''
    rowObj.timestamp = parseTimestampSafely(rawTimestamp)

    return rowObj
  })
}

export function validateRow(row) {
  const issues = []
  let status = 'valid'

  if (!row.fullName?.trim()) {
    issues.push('Missing full name')
    status = 'blocked'
  }
  if (!row.email && !row.phone) {
    issues.push('Missing both email and phone')
    status = 'blocked'
  }
  if (!Number.isInteger(row.personsAttending) || row.personsAttending < 1) {
    issues.push('Invalid persons attending')
    status = 'blocked'
  } else if (row.personsAttending > MAX_PERSONS_ATTENDING) {
    issues.push(`Persons attending exceeds ${MAX_PERSONS_ATTENDING}`)
    status = 'blocked'
  }

  return { status, issues }
}

function matchesEmailTimestamp(existing, row) {
  return existing.email
    && row.email
    && existing.email === row.email
    && timestampMillis(existing.timestamp) === timestampMillis(row.timestamp)
}

function matchesPhoneTimestamp(existing, row) {
  return existing.phone
    && row.phone
    && existing.phone === row.phone
    && timestampMillis(existing.timestamp) === timestampMillis(row.timestamp)
}

function matchesSourceRowId(existing, row) {
  return existing.sourceRowId
    && row.sourceRowId
    && existing.sourceRowId === row.sourceRowId
}

export function findDuplicate(existingRegistrations, processedRows, row) {
  for (const existing of existingRegistrations) {
    if (matchesSourceRowId(existing, row)) {
      return 'Duplicate source row ID'
    }
    if (matchesEmailTimestamp(existing, row)) {
      return 'Duplicate email and timestamp'
    }
    if (matchesPhoneTimestamp(existing, row)) {
      return 'Duplicate phone and timestamp'
    }
  }

  for (const processed of processedRows) {
    if (matchesSourceRowId(processed.row, row)) {
      return 'Duplicate source row ID in import batch'
    }
    if (matchesEmailTimestamp(processed.row, row)) {
      return 'Duplicate email and timestamp in import batch'
    }
    if (matchesPhoneTimestamp(processed.row, row)) {
      return 'Duplicate phone and timestamp in import batch'
    }
  }

  return null
}

export async function processAndValidate(rows, eventId, existingRegistrations) {
  const processed = []

  for (const row of rows) {
    const { status, issues } = validateRow(row)

    const dupReason = findDuplicate(existingRegistrations, processed, row)
    const finalStatus = dupReason ? 'blocked' : status
    if (dupReason) issues.push(dupReason)

    row.registrationId = await generateStableId(eventId, row)

    processed.push({
      row,
      status: finalStatus,
      issues,
    })
  }

  return processed
}
