import { buildFinanceSummary, calculateRegistrationFinance, normalizePaymentMethod, parseMoney } from './financeUtils.js'
import { findPossibleRegistrationPaymentOverlap } from './operationsReport.js'
import { normalizePaymentStatus } from './paymentStatus.js'
import { normalizePersonsAttending } from './registrationMetrics.js'
import { normalizeTicketCode } from './ticketUtils.js'

export const CPB_RECONCILIATION_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
export const CPB_RECONCILIATION_EVENT_NAME = 'Cake Piknik Barbados'
export const CPB_DRY_RUN_CONFIRMATION_TEXT = 'CPB DRY RUN'

export const RECONCILIATION_CLASSIFICATIONS = {
  noChange: 'Exact Match - No Change',
  proposedUpdate: 'Exact Match - Proposed Update',
  manualReview: 'Possible Match - Manual Review',
  workbookOnly: 'Workbook-Only Record',
  appOnly: 'App-Only Registration',
  duplicate: 'Duplicate',
  conflict: 'Conflicting Data',
  blocked: 'Blocked',
}

export const RECONCILIATION_FILTERS = [
  ['all', 'All'],
  ['no-change', 'No Change'],
  ['proposed-update', 'Proposed Update'],
  ['manual-review', 'Manual Review'],
  ['workbook-only', 'Workbook Only'],
  ['app-only', 'App Only'],
  ['duplicate', 'Duplicate'],
  ['conflict', 'Conflict'],
  ['blocked', 'Blocked'],
]

const PROPOSED_FIELDS = [
  'ticketPrice',
  'amountDue',
  'amountPaid',
  'balanceDue',
  'paymentStatus',
  'paymentMethod',
  'paymentReference',
  'priceTier',
]

const HEADER_ALIASES = {
  ticketDoorId: ['ticket/door id', 'ticket door id', 'ticket id', 'door id', 'ticket code'],
  guestName: ['guest name', 'full name', 'name'],
  buyerContact: ['buyer/contact', 'buyer contact', 'buyer name', 'contact name'],
  emailPhone: ['email/phone', 'email phone', 'contact', 'email', 'phone'],
  priceTier: ['price tier', 'tier'],
  ticketPrice: ['unit price', 'ticket price', 'price'],
  amountPaid: ['amount paid confirmed', 'amount paid', 'paid'],
  amountDue: ['expected total', 'amount due', 'total due'],
  balanceDue: ['balance/due', 'balance due', 'balance'],
  paymentStatus: ['payment status', 'status'],
  paymentReference: ['payment reference', 'reference', 'evidence summary'],
  paymentMethod: ['payment method', 'method'],
  confidence: ['confidence'],
  notes: ['notes'],
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

export function normalizeReconciliationName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeReconciliationEmail(value) {
  const text = cleanText(value).toLowerCase()
  const match = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)
  return match?.[0] || ''
}

export function phoneKeys(value) {
  const digits = cleanText(value).replace(/\D/g, '')
  const keys = new Set()
  if (digits) keys.add(digits)
  if (digits.length === 11 && digits.startsWith('1')) keys.add(digits.slice(1))
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (ten.length === 10 && ten.startsWith('246')) keys.add(ten.slice(3))
  if (digits.length === 7) keys.add(digits)
  return [...keys].filter((key) => key.length >= 7)
}

function normalizeReference(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, ' ').slice(0, 180)
}

function normalizeHeader(value) {
  return cleanText(value).toLowerCase().replace(/[_-]+/g, ' ')
}

function valueFrom(row, index) {
  if (index < 0) return ''
  if (Array.isArray(row)) return row[index] ?? ''
  if (Array.isArray(row?.data)) return row.data[index] ?? ''
  return ''
}

function buildHeaderMap(headers = []) {
  const normalized = headers.map(normalizeHeader)
  return Object.fromEntries(Object.entries(HEADER_ALIASES).map(([field, aliases]) => {
    const index = normalized.findIndex((header) => aliases.includes(header))
    return [field, index]
  }))
}

function reconciliationMoney(value) {
  return parseMoney(value)
}

function mapWorkbookStatus(value = '', priceTier = '') {
  const status = cleanText(value).toLowerCase()
  const tier = cleanText(priceTier).toLowerCase()
  if (status.includes('complimentary') || status.includes('comp')) return 'complimentary'
  if (status.includes('to pay at door')) return 'door-list'
  if (status.includes('door') && status.includes('paid')) return 'door'
  if (tier.includes('door') && status.includes('paid')) return 'door'
  if (status.includes('partial') || status.includes('balance due')) return 'pending'
  if (status.includes('paid') || status.includes('confirmed')) return 'paid'
  if (status.includes('pending')) return 'pending'
  return 'unknown'
}

function mapWorkbookMethod(value = '', status = '', priceTier = '') {
  const direct = normalizePaymentMethod(value)
  if (direct !== 'unknown') return direct
  const combined = `${status} ${priceTier}`.toLowerCase()
  if (combined.includes('door')) return 'door'
  if (combined.includes('cash')) return 'cash'
  if (combined.includes('bank')) return 'bank-transfer'
  if (combined.includes('firstpay')) return 'firstpay'
  return 'unknown'
}

export function parsePaymentWorkbookSheet(sheet = {}) {
  const headers = Array.isArray(sheet.headers) ? sheet.headers : []
  const rows = Array.isArray(sheet.rows) ? sheet.rows : []
  const map = buildHeaderMap(headers)

  return rows
    .map((row, index) => {
      const sourceRowNumber = Number(row?.sourceRowNumber) || index + 2
      const priceTier = cleanText(valueFrom(row, map.priceTier))
      const paymentStatusText = cleanText(valueFrom(row, map.paymentStatus))
      const rawPaymentReference = cleanText(valueFrom(row, map.paymentReference))
      const paymentReference = normalizeReference(rawPaymentReference)
      const emailPhone = cleanText(valueFrom(row, map.emailPhone))
      const ticketCode = normalizeTicketCode(cleanText(valueFrom(row, map.ticketDoorId)))
      const amountDue = reconciliationMoney(valueFrom(row, map.amountDue))
      const amountPaid = reconciliationMoney(valueFrom(row, map.amountPaid))
      const balanceDue = reconciliationMoney(valueFrom(row, map.balanceDue))
      const ticketPrice = reconciliationMoney(valueFrom(row, map.ticketPrice))
      const record = {
        source: 'workbook',
        sourceRowNumber,
        workbookRecordId: `workbook-row-${sourceRowNumber}`,
        guestName: cleanText(valueFrom(row, map.guestName)),
        buyerContact: cleanText(valueFrom(row, map.buyerContact)),
        emailPhone,
        email: normalizeReconciliationEmail(emailPhone),
        phoneKeys: phoneKeys(emailPhone),
        ticketCode,
        priceTier,
        ticketPrice,
        amountDue,
        amountPaid,
        balanceDue,
        paymentStatus: mapWorkbookStatus(paymentStatusText, priceTier),
        paymentMethod: mapWorkbookMethod(valueFrom(row, map.paymentMethod), paymentStatusText, priceTier),
        paymentReference: paymentReference || '',
        paymentReferenceSource: map.paymentReference >= 0 ? 'workbook' : 'missing',
        paymentStatusText,
        confidence: cleanText(valueFrom(row, map.confidence)),
        notes: cleanText(valueFrom(row, map.notes)),
      }

      record.nameKey = normalizeReconciliationName(record.guestName || record.buyerContact)
      record.buyerKey = normalizeReconciliationName(record.buyerContact)
      record.identifierKeys = buildRecordKeys(record)
      record.proposedUpdates = buildWorkbookProposedUpdates(record)
      record.warnings = workbookWarnings(record)
      return record
    })
    .filter((row) => row.guestName || row.buyerContact || row.email || row.ticketCode || row.amountPaid !== null || row.amountDue !== null)
}

function workbookWarnings(record) {
  const warnings = []
  if (!record.ticketCode && !record.email && record.phoneKeys.length === 0 && !record.paymentReference && !record.nameKey) warnings.push('No safe ticket, contact, reference, or name identifier.')
  if (record.amountDue === null && record.amountPaid === null && record.balanceDue === null) warnings.push('No usable money values found.')
  if (record.paymentStatus === 'unknown' && record.paymentStatusText) warnings.push('Workbook payment status needs manual review.')
  return warnings
}

function buildWorkbookProposedUpdates(record) {
  return {
    ticketPrice: record.ticketPrice,
    amountDue: record.amountDue,
    amountPaid: record.amountPaid ?? 0,
    balanceDue: record.balanceDue,
    paymentStatus: record.paymentStatus,
    paymentMethod: record.paymentMethod,
    paymentReference: null,
    priceTier: record.priceTier || null,
  }
}

function comparableRegistration(registration = {}) {
  const finance = calculateRegistrationFinance(registration)
  const email = normalizeReconciliationEmail(registration.email)
  const phones = phoneKeys(registration.phone)
  const record = {
    source: 'registration',
    registrationId: registration.registrationId,
    fullName: cleanText(registration.fullName),
    buyerName: cleanText(registration.buyerName),
    attendeeNames: Array.isArray(registration.attendeeNames) ? registration.attendeeNames.map(cleanText) : [],
    email,
    phoneKeys: phones,
    ticketCode: normalizeTicketCode(registration.ticketCode),
    paymentReference: normalizeReference(registration.paymentReference),
    nameKey: normalizeReconciliationName(registration.fullName),
    buyerKey: normalizeReconciliationName(registration.buyerName),
    registration,
    finance,
  }
  record.identifierKeys = buildRecordKeys(record)
  return record
}

function buildRecordKeys(record = {}) {
  const keys = []
  if (record.ticketCode) keys.push(`ticket:${record.ticketCode}`)
  if (record.paymentReference) keys.push(`reference:${record.paymentReference}`)
  if (record.email && record.nameKey) keys.push(`email-name:${record.email}|${record.nameKey}`)
  record.phoneKeys?.forEach((phone) => {
    if (record.nameKey) keys.push(`phone-name:${phone}|${record.nameKey}`)
    if (record.email) keys.push(`email-phone:${record.email}|${phone}`)
  })
  return [...new Set(keys)]
}

function indexByKeys(records = []) {
  const index = new Map()
  records.forEach((record) => {
    record.identifierKeys.forEach((key) => {
      if (!index.has(key)) index.set(key, [])
      index.get(key).push(record)
    })
  })
  return index
}

function duplicateKeys(records = []) {
  const index = indexByKeys(records)
  return new Set([...index.entries()].filter(([, rows]) => rows.length > 1).map(([key]) => key))
}

function duplicateGroupsFor(records = [], source = 'unknown') {
  const index = indexByKeys(records)
  return [...index.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      source,
      key,
      keyType: key.split(':')[0],
      label: keyLabel(key),
      count: rows.length,
      recordIds: rows.map((row) => row.workbookRecordId || row.registrationId).filter(Boolean),
      blocking: isBlockingDuplicateKey(key),
    }))
}

function isBlockingDuplicateKey(key = '') {
  return key.startsWith('ticket:') || key.startsWith('reference:')
}

function keyLabel(key = '') {
  if (key.startsWith('ticket:')) return 'ticket code'
  if (key.startsWith('reference:')) return 'payment reference'
  if (key.startsWith('email-name:')) return 'email and name'
  if (key.startsWith('phone-name:')) return 'phone and name'
  if (key.startsWith('email-phone:')) return 'email and phone'
  return 'identifier'
}

function findExactMatch(workbookRecord, registrationIndex, workbookDuplicateKeys, registrationDuplicateKeys) {
  const candidates = []
  workbookRecord.identifierKeys.forEach((key) => {
    const rows = registrationIndex.get(key) || []
    if (rows.length === 1 && !workbookDuplicateKeys.has(key) && !registrationDuplicateKeys.has(key)) {
      candidates.push({ key, registrationRecord: rows[0] })
    }
  })

  candidates.sort((a, b) => keyStrength(b.key) - keyStrength(a.key))
  const uniqueRegistrations = new Map()
  candidates.forEach((candidate) => {
    if (!uniqueRegistrations.has(candidate.registrationRecord.registrationId)) {
      uniqueRegistrations.set(candidate.registrationRecord.registrationId, candidate)
    }
  })
  if (uniqueRegistrations.size === 1) return uniqueRegistrations.values().next().value
  if (uniqueRegistrations.size > 1) return { conflict: true, candidates }
  return null
}

function keyStrength(key = '') {
  if (key.startsWith('ticket:')) return 5
  if (key.startsWith('reference:')) return 4
  if (key.startsWith('email-phone:')) return 3
  if (key.startsWith('email-name:')) return 2
  if (key.startsWith('phone-name:')) return 2
  return 1
}

function duplicateBlockingKeys(record = {}, workbookDuplicateKeys = new Set(), registrationDuplicateKeys = new Set()) {
  return record.identifierKeys.filter((key) => isBlockingDuplicateKey(key) && (workbookDuplicateKeys.has(key) || registrationDuplicateKeys.has(key)))
}

function findPossibleMatches(workbookRecord, registrations = []) {
  if (!workbookRecord.nameKey || workbookRecord.nameKey.length < 5) return []
  return registrations
    .filter((record) => record.nameKey && (record.nameKey.includes(workbookRecord.nameKey) || workbookRecord.nameKey.includes(record.nameKey)))
    .slice(0, 5)
}

function moneyEqual(a, b) {
  const left = a === null || a === undefined ? null : Number(a)
  const right = b === null || b === undefined ? null : Number(b)
  if (left === null && right === null) return true
  if (left === null || right === null) return false
  return Math.abs(left - right) < 0.01
}

function proposedChanges(workbookRecord, registrationRecord) {
  const registration = registrationRecord.registration || {}
  const current = {
    ticketPrice: registrationRecord.finance.ticketPrice,
    amountDue: registrationRecord.finance.amountDue,
    amountPaid: registrationRecord.finance.amountPaid,
    balanceDue: registrationRecord.finance.balanceDue,
    paymentStatus: normalizePaymentStatus(registration.paymentStatus),
    paymentMethod: normalizePaymentMethod(registration.paymentMethod),
    paymentReference: normalizeReference(registration.paymentReference) || null,
    priceTier: registration.priceTier || null,
  }
  const proposed = workbookRecord.proposedUpdates
  return PROPOSED_FIELDS
    .filter((field) => proposed[field] !== null && proposed[field] !== undefined && proposed[field] !== '')
    .filter((field) => (
      ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue'].includes(field)
        ? !moneyEqual(current[field], proposed[field])
        : String(current[field] ?? '') !== String(proposed[field] ?? '')
    ))
    .map((field) => ({ field, current: current[field], proposed: proposed[field] }))
}

function proposalWarnings(workbookRecord, registrationRecord, changes = []) {
  const warnings = []
  const changeFields = new Set(changes.map((change) => change.field))
  if (!registrationRecord?.registrationId) warnings.push('No matched registration id.')
  if (!workbookRecord?.matchKey && !workbookRecord?.ticketCode && !workbookRecord?.email) warnings.push('No strong match evidence.')
  if (changeFields.has('paymentStatus') && workbookRecord.paymentStatus === 'unknown') warnings.push('Ambiguous workbook status.')
  ;['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue'].forEach((field) => {
    if (changeFields.has(field) && workbookRecord.proposedUpdates[field] === null) warnings.push(`Workbook ${field} is not explicit.`)
  })
  return warnings
}

function applyProposed(registration = {}, changes = []) {
  const patch = Object.fromEntries(changes.map((change) => [change.field, change.proposed]))
  return { ...registration, ...patch }
}

function item(status, filterKey, payload = {}) {
  return {
    status,
    filterKey,
    ...payload,
  }
}

export function buildPaymentReconciliationPreview({ workbookSheet, registrations = [], operationsEntries = [], event = {} } = {}) {
  const workbookRecords = parsePaymentWorkbookSheet(workbookSheet)
  const registrationRecords = registrations.map(comparableRegistration)
  const registrationIndex = indexByKeys(registrationRecords)
  const workbookDuplicateKeys = duplicateKeys(workbookRecords)
  const registrationDuplicateKeys = duplicateKeys(registrationRecords)
  const matchedRegistrationIds = new Set()
  const possibleRegistrationIds = new Set()
  const rows = []
  const workbookClassifications = []

  workbookRecords.forEach((workbookRecord) => {
    if (workbookRecord.warnings.length > 0) {
      const blocked = item(RECONCILIATION_CLASSIFICATIONS.blocked, 'blocked', {
        workbookRecord,
        reason: workbookRecord.warnings.join(' '),
      })
      rows.push(blocked)
      workbookClassifications.push(blocked)
      return
    }

    const exact = findExactMatch(workbookRecord, registrationIndex, workbookDuplicateKeys, registrationDuplicateKeys)
    if (exact?.conflict) {
      const conflict = item(RECONCILIATION_CLASSIFICATIONS.conflict, 'conflict', {
        workbookRecord,
        possibleMatches: exact.candidates.map((candidate) => candidate.registrationRecord),
        reason: 'Multiple registrations match strong identifiers.',
      })
      rows.push(conflict)
      workbookClassifications.push(conflict)
      return
    }

    if (exact?.registrationRecord) {
      matchedRegistrationIds.add(exact.registrationRecord.registrationId)
      const changes = proposedChanges(workbookRecord, exact.registrationRecord)
      const exactItem = item(
        changes.length ? RECONCILIATION_CLASSIFICATIONS.proposedUpdate : RECONCILIATION_CLASSIFICATIONS.noChange,
        changes.length ? 'proposed-update' : 'no-change',
        {
          workbookRecord,
          registrationRecord: exact.registrationRecord,
          matchKey: exact.key,
          matchBasis: keyLabel(exact.key),
          proposedChanges: changes,
          proposalWarnings: proposalWarnings({ ...workbookRecord, matchKey: exact.key }, exact.registrationRecord, changes),
          reason: changes.length ? `${changes.length} supported registration payment field(s) differ.` : 'Supported payment fields already match.',
        },
      )
      rows.push(exactItem)
      workbookClassifications.push(exactItem)
      return
    }

    const blockingKeys = duplicateBlockingKeys(workbookRecord, workbookDuplicateKeys, registrationDuplicateKeys)
    if (blockingKeys.length > 0) {
      const duplicate = item(RECONCILIATION_CLASSIFICATIONS.duplicate, 'duplicate', {
        workbookRecord,
        duplicateKeys: blockingKeys,
        reason: `Non-unique ${blockingKeys.map(keyLabel).join(', ')} blocks automatic matching.`,
      })
      rows.push(duplicate)
      workbookClassifications.push(duplicate)
      return
    }

    const possibleMatches = findPossibleMatches(workbookRecord, registrationRecords)
    if (possibleMatches.length) {
      possibleMatches.forEach((match) => possibleRegistrationIds.add(match.registrationId))
      const manual = item(RECONCILIATION_CLASSIFICATIONS.manualReview, 'manual-review', {
        workbookRecord,
        possibleMatches,
        reason: 'Name-only or fuzzy similarity is not safe enough for an automatic match.',
      })
      rows.push(manual)
      workbookClassifications.push(manual)
      return
    }

    const workbookOnly = item(RECONCILIATION_CLASSIFICATIONS.workbookOnly, 'workbook-only', {
      workbookRecord,
      reason: 'Workbook record has no exact app registration match.',
    })
    rows.push(workbookOnly)
    workbookClassifications.push(workbookOnly)
  })

  const exactRowsByRegistrationId = new Map(rows
    .filter((row) => row.registrationRecord?.registrationId)
    .map((row) => [row.registrationRecord.registrationId, row]))
  const appClassifications = registrationRecords.map((registrationRecord) => {
    const exact = exactRowsByRegistrationId.get(registrationRecord.registrationId)
    if (exact) {
      return item(exact.status, exact.filterKey, {
        registrationRecord,
        workbookRecord: exact.workbookRecord,
        matchBasis: exact.matchBasis,
        proposedChanges: exact.proposedChanges || [],
        reason: exact.reason,
      })
    }
    const blockingKeys = duplicateBlockingKeys(registrationRecord, workbookDuplicateKeys, registrationDuplicateKeys)
    if (blockingKeys.length > 0) {
      return item(RECONCILIATION_CLASSIFICATIONS.duplicate, 'duplicate', {
        registrationRecord,
        duplicateKeys: blockingKeys,
        reason: `Non-unique ${blockingKeys.map(keyLabel).join(', ')} blocks automatic matching.`,
      })
    }
    if (possibleRegistrationIds.has(registrationRecord.registrationId)) {
      return item(RECONCILIATION_CLASSIFICATIONS.manualReview, 'manual-review', {
        registrationRecord,
        reason: 'Registration is a possible name-only/fuzzy match for a workbook row.',
      })
    }
    return item(RECONCILIATION_CLASSIFICATIONS.appOnly, 'app-only', {
      registrationRecord,
      reason: 'App registration has no exact workbook match.',
    })
  })

  registrationRecords.forEach((registrationRecord) => {
    if (!matchedRegistrationIds.has(registrationRecord.registrationId)) {
      rows.push(item(RECONCILIATION_CLASSIFICATIONS.appOnly, 'app-only', {
        registrationRecord,
        reason: 'App registration has no exact workbook match.',
      }))
    }
  })

  const safeUpdateRows = rows.filter((row) => row.filterKey === 'proposed-update')
  const hypotheticalRegistrations = registrations.map((registration) => {
    const updateRow = safeUpdateRows.find((row) => row.registrationRecord?.registrationId === registration.registrationId)
    return updateRow ? applyProposed(registration, updateRow.proposedChanges) : registration
  })
  const operationOverlaps = findPossibleRegistrationPaymentOverlap(operationsEntries)
  const duplicateGroups = [
    ...duplicateGroupsFor(workbookRecords, 'workbook'),
    ...duplicateGroupsFor(registrationRecords, 'registration'),
  ]

  return {
    targetEvent: {
      eventId: event.eventId || CPB_RECONCILIATION_EVENT_ID,
      eventName: event.eventName || CPB_RECONCILIATION_EVENT_NAME,
      currency: event.currency || 'BBD',
    },
    recordSets: {
      workbookRecords,
      registrationRecords,
      operationsRecords: operationsEntries,
    },
    rows,
    workbookClassifications,
    appClassifications,
    counts: countClassifications(rows),
    classificationCounts: {
      workbook: countClassifications(workbookClassifications),
      app: countClassifications(appClassifications),
    },
    warningCounts: buildWarningCounts(workbookRecords, registrationRecords, duplicateGroups),
    duplicateGroups,
    totals: {
      workbook: totalWorkbook(workbookRecords),
      currentApp: buildFinanceSummary(registrations, event),
      hypotheticalApp: buildFinanceSummary(hypotheticalRegistrations, event),
      operationsExcluded: {
        count: operationsEntries.length,
        possibleOverlapCount: operationOverlaps.length,
        possibleOverlapAmount: operationOverlaps.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
      },
    },
    proposedFields: PROPOSED_FIELDS,
    writesPerformed: false,
  }
}

function countClassifications(rows = []) {
  return RECONCILIATION_FILTERS.reduce((counts, [key]) => {
    counts[key] = key === 'all' ? rows.length : rows.filter((row) => row.filterKey === key).length
    return counts
  }, {})
}

function buildWarningCounts(workbookRecords = [], registrationRecords = [], duplicateGroups = []) {
  return {
    workbookWarnings: workbookRecords.reduce((sum, record) => sum + record.warnings.length, 0),
    duplicateWorkbookKeys: duplicateGroups.filter((group) => group.source === 'workbook').length,
    duplicateRegistrationKeys: duplicateGroups.filter((group) => group.source === 'registration').length,
    duplicateBlockingKeys: duplicateGroups.filter((group) => group.blocking).length,
    duplicateContactKeys: duplicateGroups.filter((group) => !group.blocking && ['email-name', 'phone-name', 'email-phone'].includes(group.keyType)).length,
    registrationsMissingTicketCode: registrationRecords.filter((record) => !record.ticketCode).length,
    registrationsMissingPaymentReference: registrationRecords.filter((record) => !record.paymentReference).length,
    registrationsMissingEmail: registrationRecords.filter((record) => !record.email).length,
    registrationsMissingPhone: registrationRecords.filter((record) => record.phoneKeys.length === 0).length,
  }
}

function totalWorkbook(records = []) {
  return records.reduce((totals, record) => {
    totals.count += 1
    totals.amountDue += record.amountDue ?? 0
    totals.amountPaid += record.amountPaid ?? 0
    totals.balanceDue += record.balanceDue ?? 0
    return totals
  }, { count: 0, amountDue: 0, amountPaid: 0, balanceDue: 0 })
}

export function registrationGuests(registration = {}) {
  return normalizePersonsAttending(registration.personsAttending, 1)
}
