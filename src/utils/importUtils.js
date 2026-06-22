import { dateFromValue, parseTimestampSafely } from './dateUtils.js'
import { findTicketCodeDuplicate, normalizeTicketCode, validateTicketCode } from './ticketUtils.js'

export const MAX_PERSONS_ATTENDING = 100

function cellToImportText(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return String(value).trim()
}

export function rowsToParsedTable(sheetRows = []) {
  const normalizedRows = sheetRows
    .map((row) => (Array.isArray(row) ? row.map(cellToImportText) : []))
    .filter((row) => row.some((cell) => cell.trim() !== ''))

  if (normalizedRows.length === 0) return { headers: [], rows: [] }

  const headerIndex = normalizedRows.findIndex((row) => row.some((cell) => cell.trim() !== ''))
  const rawHeaders = normalizedRows[headerIndex] || []
  const columnCount = Math.max(
    rawHeaders.length,
    ...normalizedRows.slice(headerIndex + 1).map((row) => row.length),
  )

  const headers = Array.from({ length: columnCount }, (_, index) => {
    const header = rawHeaders[index]?.trim()
    return header || `Column ${index + 1}`
  })

  const dataRows = normalizedRows.slice(headerIndex + 1).map((row, index) => {
    const cells = Array.from({ length: headers.length }, (_, cellIndex) => row[cellIndex]?.trim() || '')
    return {
      _sourceRowId: `row-${index + 1}`,
      data: cells,
    }
  })

  return { headers, rows: dataRows }
}

export function buildInitialFieldMap(headers = []) {
  const initialMap = {}
  headers.forEach((h, i) => {
    const lower = h.toLowerCase()
    const normalized = lower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
    const isTicketCode = [
      'ticket code',
      'ticket number',
      'ticket id',
      'ticket',
      'code',
      'admission code',
      'reference code',
    ].includes(normalized)

    if (isTicketCode) initialMap.ticketCode = i
    else if (lower.includes('name') && !lower.includes('group')) initialMap.fullName = i
    else if (lower.includes('email')) initialMap.email = i
    else if (lower.includes('phone')) initialMap.phone = i
    else if (lower.includes('group')) initialMap.groupName = i
    else if (lower.includes('person') || lower.includes('attending') || lower.includes('quantity')) initialMap.personsAttending = i
    else if (lower.includes('reference') || lower.includes('receipt') || lower.includes('transaction')) initialMap.paymentReference = i
    else if (lower.includes('pay')) initialMap.paymentStatus = i
    else if (lower.includes('timestamp') || lower.includes('submitted')) initialMap.timestamp = i
    else if (lower.includes('note') || lower.includes('comment')) initialMap.notes = i
  })
  return initialMap
}

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

  return rowsToParsedTable(cleanedRows)
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
    rowObj.ticketCode = normalizeTicketCode(fieldMap.ticketCode !== undefined ? parsedRow.data[fieldMap.ticketCode] : '')
    rowObj.ticketStatus = rowObj.ticketCode ? 'assigned' : 'no-ticket-assigned'
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
  if (row.ticketCode) {
    const ticketError = validateTicketCode(row.ticketCode, [], row.registrationId)
    if (ticketError) {
      issues.push(ticketError)
      status = 'blocked'
    }
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
    const ticketDupReason = findTicketCodeDuplicate(existingRegistrations, processed, row)
    const finalStatus = dupReason || ticketDupReason ? 'blocked' : status
    if (dupReason) issues.push(dupReason)
    if (ticketDupReason) issues.push(ticketDupReason)

    row.registrationId = await generateStableId(eventId, row)

    processed.push({
      row,
      status: finalStatus,
      issues,
    })
  }

  return processed
}
