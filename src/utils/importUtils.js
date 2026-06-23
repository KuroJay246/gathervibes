import { dateFromValue, parseTimestampSafely } from './dateUtils.js'
import { normalizePersonsAttending } from './registrationMetrics.js'
import { findTicketCodeDuplicate, normalizeTicketCode, validateTicketCode } from './ticketUtils.js'

export const MAX_PERSONS_ATTENDING = 100

function cellToImportText(value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return String(value).trim()
}

export function rowsToParsedTable(sheetRows = [], options = {}) {
  const sourceKey = options.sourceKey ? `${options.sourceKey}:` : ''
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
      _sourceRowIndex: index + 1,
      _sourceKey: sourceKey,
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
    const detected = detectHeaderField(normalized, lower)
    if (detected?.field && initialMap[detected.field] === undefined) initialMap[detected.field] = i
  })
  return initialMap
}

export function detectHeaderField(normalizedHeader = '', lowerHeader = normalizedHeader) {
  const normalized = normalizedHeader.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = lowerHeader.toLowerCase()
  const exact = {
    timestamp: 'timestamp',
    submitted: 'timestamp',
    'submission time': 'timestamp',
    'full name': 'fullName',
    name: 'fullName',
    'first name last name': 'fullName',
    'email address': 'email',
    email: 'email',
    'phone number': 'phone',
    'contact number': 'phone',
    'whatsapp number': 'phone',
    'whats app number': 'phone',
    phone: 'phone',
    mobile: 'phone',
    'group name': 'groupName',
    group: 'groupName',
    school: 'groupName',
    organization: 'groupName',
    organisation: 'groupName',
    'persons attending': 'personsAttending',
    'number attending': 'personsAttending',
    guests: 'personsAttending',
    quantity: 'personsAttending',
    attendees: 'personsAttending',
    'payment status': 'paymentStatus',
    status: 'paymentStatus',
    'payment reference': 'paymentReference',
    reference: 'paymentReference',
    receipt: 'paymentReference',
    transaction: 'paymentReference',
    'ticket code': 'ticketCode',
    'ticket number': 'ticketCode',
    'ticket id': 'ticketCode',
    ticket: 'ticketCode',
    code: 'ticketCode',
    'admission code': 'ticketCode',
    notes: 'notes',
    note: 'notes',
    comments: 'notes',
    comment: 'notes',
  }

  if (exact[normalized]) return { field: exact[normalized], confidence: 'high' }
  if (normalized.includes('ticket') && (normalized.includes('code') || normalized.includes('number') || normalized.includes('id'))) return { field: 'ticketCode', confidence: 'high' }
  if (normalized.includes('email')) return { field: 'email', confidence: 'high' }
  if (normalized.includes('phone') || normalized.includes('contact') || normalized.includes('whatsapp')) return { field: 'phone', confidence: 'medium' }
  if (normalized.includes('group') || normalized.includes('school') || normalized.includes('organi')) return { field: 'groupName', confidence: 'medium' }
  if ((normalized.includes('name') || lower.includes('student')) && !normalized.includes('group')) return { field: 'fullName', confidence: 'medium' }
  if (normalized.includes('person') || normalized.includes('attending') || normalized.includes('guest') || normalized.includes('quantity')) return { field: 'personsAttending', confidence: 'medium' }
  if (normalized.includes('reference') || normalized.includes('receipt') || normalized.includes('transaction')) return { field: 'paymentReference', confidence: 'medium' }
  if (normalized.includes('pay')) return { field: 'paymentStatus', confidence: 'medium' }
  if (normalized.includes('timestamp') || normalized.includes('submitted') || normalized.includes('date')) return { field: 'timestamp', confidence: 'medium' }
  if (normalized.includes('note') || normalized.includes('comment')) return { field: 'notes', confidence: 'medium' }
  return { field: '', confidence: 'none' }
}

export function buildHeaderMappingPreview(headers = [], fieldMap = buildInitialFieldMap(headers)) {
  return headers.map((header, index) => {
    const mappedField = Object.keys(fieldMap).find((field) => fieldMap[field] === index) || ''
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
    const detected = detectHeaderField(normalized, header.toLowerCase())
    return {
      index,
      header,
      detectedField: mappedField || detected.field,
      confidence: mappedField ? detected.confidence : detected.confidence,
      mapped: Boolean(mappedField),
      ignored: !mappedField,
    }
  })
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

function sourceIdentityPart(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120)
}

function buildSourceRowId(parsedRow, context = {}) {
  const rowPart = `${parsedRow._sourceKey || ''}${parsedRow._sourceRowId || `row-${parsedRow._sourceRowIndex || 'unknown'}`}`
  const scope = [
    context.importBatchId,
    context.sourceFileName,
    context.sourceSheetName,
  ].map(sourceIdentityPart).filter(Boolean).join(':')

  return scope ? `${scope}:${rowPart}` : rowPart
}

export async function generateStableId(eventId, row) {
  const ts = row.timestamp ? timestampMillis(row.timestamp) : ''
  const rowIdentity = [
    row.importBatchId || 'manual-import',
    row.sourceFileName || '',
    row.sourceSheetName || '',
    row.sourceRowId || '',
    row.sourceRowIndex || '',
  ].join(':')
  const secondary = [
    row.fullName || '',
    row.email || '',
    row.phone || '',
    row.groupName || '',
    ts,
  ].join(':')
  const key = `${eventId}:row:${rowIdentity}:secondary:${secondary}`
  const hash = await sha256(key)
  return `imp_${hash.substring(0, 16)}`
}

export function mapRows(parsedRows, headers, fieldMap, context = {}) {
  return parsedRows.map((parsedRow) => {
    const rowObj = {
      sourceRowId: buildSourceRowId(parsedRow, context),
      sourceRowIndex: parsedRow._sourceRowIndex,
      sourceFileName: context.sourceFileName || null,
      sourceSheetName: context.sourceSheetName || null,
      importBatchId: context.importBatchId || null,
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
    rowObj.personsAttending = normalizePersonsAttending(rawPersons)

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
    issues.push('This row is blocked because Full Name is missing.')
    status = 'blocked'
  }
  if (!row.email && !row.phone) {
    issues.push('This row is blocked because email and phone are both missing.')
    status = 'blocked'
  }
  if (!Number.isInteger(row.personsAttending) || row.personsAttending < 1) {
    issues.push('This row is blocked because Persons Attending is invalid.')
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

function matchesSourceRowId(existing, row) {
  return existing.sourceRowId
    && row.sourceRowId
    && existing.sourceRowId === row.sourceRowId
}

export function findDuplicate(existingRegistrations, processedRows, row) {
  for (const existing of existingRegistrations) {
    if (matchesSourceRowId(existing, row)) {
      return 'This source row was already imported for the selected Working Event.'
    }
  }

  for (const processed of processedRows) {
    if (matchesSourceRowId(processed.row, row)) {
      return 'This source row appears twice in the import batch.'
    }
  }

  return null
}

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

function sameName(a, b) {
  return Boolean(a.fullName && b.fullName && sameText(a.fullName, b.fullName))
}

function sameContact(a, b) {
  return Boolean((a.email && b.email && a.email === b.email) || (a.phone && b.phone && a.phone === b.phone))
}

function duplicateGroupKey(row) {
  return [
    String(row.fullName || '').trim().toLowerCase(),
    row.email || row.phone || String(row.groupName || '').trim().toLowerCase(),
  ].join('|')
}

function sharedContactWarnings(existingRegistrations, processedRows, row) {
  const warnings = []
  const allRows = [...existingRegistrations, ...processedRows.map((processed) => processed.row)]
  const sharedPhone = row.phone && allRows.some((candidate) => candidate.phone === row.phone && !sameName(candidate, row))
  const sharedEmail = row.email && allRows.some((candidate) => candidate.email === row.email && !sameName(candidate, row))
  const sharedGroup = row.groupName && allRows.some((candidate) => sameText(candidate.groupName, row.groupName) && !sameName(candidate, row))

  if (sharedPhone) warnings.push('Same phone number appears on multiple rows. This may be a group/shared contact.')
  if (sharedEmail) warnings.push('Same email appears on multiple rows. You can keep these as separate guests.')
  if (sharedGroup) warnings.push('Same group name appears on multiple rows. This can be normal for family, school, or organization rows.')
  return warnings
}

function trueDuplicateReasons(existingRegistrations, processedRows, row) {
  const reasons = []
  const allRows = [...existingRegistrations, ...processedRows.map((processed) => processed.row)]

  for (const candidate of allRows) {
    if (!sameName(candidate, row)) continue
    if (sameContact(candidate, row)) reasons.push('This row appears to be the same guest already in this event.')
    else if (candidate.groupName && row.groupName && sameText(candidate.groupName, row.groupName)) reasons.push('Same full name and group name needs organizer review.')
  }

  return [...new Set(reasons)]
}

export function mergeRowsIntoGroupRegistration(rows = []) {
  const candidates = rows.filter((item) => item?.row ? item.status !== 'blocked' : true).map((item) => item.row || item)
  const ticketCodes = [...new Set(candidates.map((row) => normalizeTicketCode(row.ticketCode)).filter(Boolean))]
  if (ticketCodes.length > 1) {
    return {
      status: 'blocked',
      issues: ['Multiple ticket codes exist in rows selected for merge. Choose one ticket code before importing.'],
      row: null,
    }
  }

  const primary = candidates.find((row) => row.email || row.phone) || candidates[0]
  const guestNames = candidates.map((row) => row.fullName?.trim()).filter(Boolean)
  const mergedNotes = [
    primary?.notes,
    `Merged guest names: ${guestNames.join('; ')}`,
  ].filter(Boolean).join('\n')

  return {
    status: 'valid',
    issues: ['Merged into one group registration. Review before import.'],
    row: {
      ...primary,
      fullName: primary?.groupName || primary?.fullName || guestNames[0] || 'Merged group',
      personsAttending: candidates.reduce((total, row) => total + (Number.isInteger(row.personsAttending) ? row.personsAttending : 1), 0),
      groupName: primary?.groupName || candidates.find((row) => row.groupName)?.groupName || null,
      ticketCode: ticketCodes[0] || '',
      ticketStatus: ticketCodes[0] ? 'assigned' : 'no-ticket-assigned',
      notes: mergedNotes,
      sourceRowId: candidates.map((row) => row.sourceRowId).filter(Boolean).join('+'),
    },
  }
}

export async function processAndValidate(rows, eventId, existingRegistrations) {
  const processed = []

  for (const row of rows) {
    const { status, issues } = validateRow(row)

    const dupReason = findDuplicate(existingRegistrations, processed, row)
    const ticketDupReason = findTicketCodeDuplicate(existingRegistrations, processed, row)
    const reviewReasons = status === 'blocked' ? [] : trueDuplicateReasons(existingRegistrations, processed, row)
    const warnings = status === 'blocked' ? [] : sharedContactWarnings(existingRegistrations, processed, row)
    const finalStatus = dupReason || ticketDupReason
      ? 'blocked'
      : reviewReasons.length > 0
        ? 'needs-review'
        : warnings.length > 0
          ? 'warning'
          : status
    if (dupReason) issues.push(dupReason)
    if (ticketDupReason) issues.push(ticketDupReason.includes('selected event')
      ? 'This ticket code is already used and must be changed.'
      : 'This ticket code appears more than once in this import and must be changed.')
    issues.push(...reviewReasons, ...warnings)

    row.registrationId = await generateStableId(eventId, row)

    processed.push({
      row,
      status: finalStatus,
      issues,
      defaultAction: finalStatus === 'blocked' ? 'blocked' : finalStatus === 'needs-review' ? 'needs-review' : 'keep',
      recommendedAction: finalStatus === 'blocked'
        ? 'Blocked until the row is fixed.'
        : finalStatus === 'needs-review'
          ? 'Review and choose Keep Separate, Merge, or Skip Row.'
          : warnings.length > 0
            ? 'Usually safe to Keep Separate for shared family, school, or organization contacts.'
            : 'Ready to import.',
      duplicateGroupKey: duplicateGroupKey(row),
    })
  }

  return processed
}
