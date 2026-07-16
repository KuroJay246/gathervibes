/* global process, console, fetch */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { TextDecoder } from 'node:util'
import { unzipSync } from 'fflate'
import {
  CPB_RECONCILIATION_EVENT_ID,
  buildPaymentReconciliationPreview,
} from '../../src/utils/paymentReconciliation.js'

const projectId = 'gathervibeshub'
const workbookPath = 'C:\\Users\\Jaylan\\Documents\\gathetr\\Cake_Piknik_Payment_Audit.xlsx'
const outputRoot = 'C:\\Users\\Jaylan\\Desktop\\GSV_New_CPB_Manifest'
const expectedWorkbookHash = '77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96'
const parser = 'worksheet-xml-cached-values'
const parserContract = 'cpb-reconciliation-parser-v1'
const financeContract = 'phase-23d0-registration-finance-v1'
const firebaseToolsLib = 'C:\\Users\\Jaylan\\AppData\\Roaming\\npm\\node_modules\\firebase-tools\\lib'

function sha256(data) {
  return createHash('sha256').update(data).digest('hex').toUpperCase()
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function stableStringify(value) {
  return JSON.stringify(stable(value), null, 2)
}

function xmlDecode(value = '') {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function elements(xml = '', tag = '') {
  const re = new RegExp(`<(?:[^:>]+:)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:[^:>]+:)?${tag}>`, 'g')
  return [...xml.matchAll(re)].map((match) => match[0])
}

function attr(xml = '', name = '') {
  return xml.match(new RegExp(`${name}="([^"]*)"`))?.[1] || ''
}

function columnIndex(ref = '') {
  const column = String(ref).replace(/\d+/g, '').toUpperCase()
  return column.split('').reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function sharedStrings(entries) {
  const xml = entries['xl/sharedStrings.xml']
  if (!xml) return []
  return elements(xml, 'si').map((si) => [...si.matchAll(/<(?:[^:>]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?t>/g)].map((match) => xmlDecode(match[1])).join(''))
}

function cellValue(cell, strings) {
  const type = attr(cell, 't')
  const raw = cell.match(/<(?:[^:>]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?v>/)?.[1]
  if (type === 's') return strings[Number(raw)] || ''
  if (type === 'inlineStr') return [...cell.matchAll(/<(?:[^:>]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[^:>]+:)?t>/g)].map((match) => xmlDecode(match[1])).join('')
  if (raw === undefined) return ''
  const number = Number(raw)
  return Number.isFinite(number) && String(raw).trim() !== '' ? number : xmlDecode(raw)
}

function normalizeRows(rows = []) {
  const [headers = [], ...dataRows] = rows
  return {
    headers: headers.map((header) => String(header ?? '').trim()),
    rows: dataRows.map((row, index) => ({
      data: Array.isArray(row) ? row.map((cell) => cell ?? '') : [],
      sourceRowNumber: index + 2,
    })),
    rawRowCount: rows.length,
  }
}

function parseWorkbook(buffer) {
  const archive = unzipSync(new Uint8Array(buffer))
  const decoder = new TextDecoder('utf-8')
  const entries = Object.fromEntries(Object.entries(archive)
    .filter(([path]) => path.endsWith('.xml') || path.endsWith('.rels'))
    .map(([path, value]) => [path, decoder.decode(value)]))
  const strings = sharedStrings(entries)
  const workbook = entries['xl/workbook.xml'] || ''
  const rels = entries['xl/_rels/workbook.xml.rels'] || ''
  const relTargets = new Map([...rels.matchAll(/<(?:[^:>]+:)?Relationship\b[^>]*>/g)].map((match) => {
    const node = match[0]
    const target = attr(node, 'Target')
    return [attr(node, 'Id'), target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^xl\//, '')}`]
  }))

  return [...workbook.matchAll(/<(?:[^:>]+:)?sheet\b[^>]*>/g)].map((match, index) => {
    const node = match[0]
    const rid = attr(node, 'r:id') || attr(node, 'id')
    const path = relTargets.get(rid) || `xl/worksheets/sheet${index + 1}.xml`
    const xml = entries[path] || ''
    const rows = elements(xml, 'row').map((row) => {
      const values = []
      ;[...row.matchAll(/<(?:[^:>]+:)?c\b[^>]*>[\s\S]*?<\/(?:[^:>]+:)?c>/g)].forEach((cellMatch) => {
        const cell = cellMatch[0]
        values[columnIndex(attr(cell, 'r'))] = cellValue(cell, strings)
      })
      return values.map((value) => value ?? '')
    })
    return {
      id: `sheet-${index + 1}`,
      name: attr(node, 'name') || `Sheet ${index + 1}`,
      parser,
      ...normalizeRows(rows),
      formulasDetected: (xml.match(/<f\b/g) || []).length,
      mergedCellsDetected: (xml.match(/<mergeCell\b/g) || []).length,
    }
  })
}

function maskId(value = '') {
  const text = String(value || '')
  return text.length <= 8 ? text : `${text.slice(0, 4)}...${text.slice(-4)}`
}

function classificationTable(counts = {}) {
  return Object.fromEntries(Object.entries(counts).filter(([key]) => key !== 'all'))
}

function proposalFromRow(row, index) {
  const proposalId = `CPB-P23E-${String(index + 1).padStart(4, '0')}`
  const changes = [...(row.proposedChanges || [])].sort((a, b) => a.field.localeCompare(b.field))
  return {
    proposalId,
    registrationId: row.registrationRecord.registrationId,
    registrationIdMasked: maskId(row.registrationRecord.registrationId),
    workbookRecordId: row.workbookRecord.workbookRecordId,
    sourceRowNumber: row.workbookRecord.sourceRowNumber,
    match: {
      basis: row.matchBasis,
      key: row.matchKey,
      uniqueness: {
        workbookRowsForKey: 1,
        registrationRowsForKey: 1,
        oneWorkbookRowToOneRegistration: true,
      },
    },
    currentValues: Object.fromEntries(changes.map((change) => [change.field, change.current])),
    proposedValues: Object.fromEntries(changes.map((change) => [change.field, change.proposed])),
    changedFields: changes.map((change) => change.field),
    warnings: row.proposalWarnings || [],
  }
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')
}

async function firebaseCliAccessToken() {
  const require = createRequire(import.meta.url)
  const auth = require(join(firebaseToolsLib, 'auth.js'))
  const account = auth.getAllAccounts().find((item) => item?.user?.email)
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login was not available for manifest generation.')
  const token = await auth.getAccessToken(account.tokens.refresh_token, [])
  if (!token?.access_token) throw new Error('Firebase CLI access token could not be refreshed.')
  return token.access_token
}

function firestoreValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return Boolean(value.booleanValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValue)
  if ('mapValue' in value) return firestoreDocument({ fields: value.mapValue.fields || {} })
  return null
}

function firestoreDocument(document = {}) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, firestoreValue(value)]))
}

async function firestoreGet(path, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error(`Firestore get failed for ${path}: ${response.status}`)
  return response.json()
}

async function firestoreQuery(collectionId, eventId, token) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'eventId' },
            op: 'EQUAL',
            value: { stringValue: eventId },
          },
        },
      },
    }),
  })
  if (!response.ok) throw new Error(`Firestore query failed for ${collectionId}: ${response.status}`)
  const rows = await response.json()
  return rows.filter((row) => row.document).map((row) => {
    const id = row.document.name.split('/').pop()
    return { id, ...firestoreDocument(row.document) }
  })
}

async function loadFirestore() {
  const token = await firebaseCliAccessToken()
  const [eventDoc, registrationsSnap, operationsSnap] = await Promise.all([
    firestoreGet(`events/${CPB_RECONCILIATION_EVENT_ID}`, token),
    firestoreQuery('registrations', CPB_RECONCILIATION_EVENT_ID, token),
    firestoreQuery('operationsLedger', CPB_RECONCILIATION_EVENT_ID, token),
  ])
  if (!eventDoc.fields) throw new Error('CPB event was not found.')
  return {
    event: { eventId: CPB_RECONCILIATION_EVENT_ID, ...firestoreDocument(eventDoc) },
    registrations: registrationsSnap.map((doc) => ({ registrationId: doc.id, ...doc })),
    operationsEntries: operationsSnap.map((doc) => ({ ledgerEntryId: doc.id, ...doc })),
  }
}

async function main() {
  const workbookBuffer = await readFile(workbookPath)
  const workbookHash = sha256(workbookBuffer)
  if (workbookHash !== expectedWorkbookHash) {
    throw new Error(`Workbook hash mismatch. Expected ${expectedWorkbookHash}, got ${workbookHash}`)
  }

  const workbookSheets = parseWorkbook(workbookBuffer)
  const workbookSheet = workbookSheets.find((sheet) => sheet.headers.length && sheet.rows.length)
  if (!workbookSheet) throw new Error('No usable workbook sheet found.')

  const { event, registrations, operationsEntries } = await loadFirestore()
  const preview = buildPaymentReconciliationPreview({ workbookSheet, registrations, operationsEntries, event })
  const proposalRows = preview.workbookClassifications
    .filter((row) => row.filterKey === 'proposed-update')
    .sort((a, b) => (
      String(a.registrationRecord?.ticketCode || '').localeCompare(String(b.registrationRecord?.ticketCode || ''))
      || Number(a.workbookRecord?.sourceRowNumber || 0) - Number(b.workbookRecord?.sourceRowNumber || 0)
    ))
  const proposals = proposalRows.map(proposalFromRow)
  const fieldChangeCount = proposals.reduce((sum, proposal) => sum + proposal.changedFields.length, 0)
  const generatedAt = new Date().toISOString()
  const manifest = {
    manifestType: 'CPB_PAYMENT_RECONCILIATION_PROPOSAL',
    eventId: CPB_RECONCILIATION_EVENT_ID,
    eventName: event.eventName || 'CPB',
    generatedAt,
    workbookSha256: workbookHash,
    parser,
    parserContract,
    financeContract,
    workbookSheet: {
      name: workbookSheet.name,
      normalizedRowCount: preview.recordSets.workbookRecords.length,
      formulasDetected: workbookSheet.formulasDetected || 0,
      mergedCellsDetected: workbookSheet.mergedCellsDetected || 0,
    },
    counts: {
      proposalCount: proposals.length,
      fieldChangeCount,
      cpbRegistrationCount: registrations.length,
      cpbGuestCount: preview.totals.currentApp.totalPersons || registrations.reduce((sum, row) => sum + (Number(row.personsAttending) || 1), 0),
    },
    classifications: {
      workbook: classificationTable(preview.classificationCounts.workbook),
      app: classificationTable(preview.classificationCounts.app),
    },
    totals: preview.totals,
    proposedFields: preview.proposedFields,
    proposals,
    writesPerformed: false,
  }
  const manifestPayload = stableStringify(manifest)
  const manifestHash = sha256(manifestPayload)
  const manifestWithHash = { ...manifest, manifestSha256: manifestHash }
  const finalPayload = stableStringify(manifestWithHash)

  await mkdir(outputRoot, { recursive: true })
  await writeFile(join(outputRoot, 'CPB_Proposal_Manifest_New_Private.json'), finalPayload)
  await writeFile(join(outputRoot, 'CPB_Proposal_Manifest_New_Masked.csv'), toCsv(proposals.map((proposal) => ({
    proposalId: proposal.proposalId,
    registrationIdMasked: proposal.registrationIdMasked,
    sourceRowNumber: proposal.sourceRowNumber,
    matchBasis: proposal.match.basis,
    changedFields: proposal.changedFields.join('|'),
    warningCount: proposal.warnings.length,
  }))))
  await writeFile(join(outputRoot, 'CPB_Manifest_Comparison_To_Invalid_Masked.csv'), toCsv([{
    invalidOldManifestSha256: '2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409',
    newManifestSha256: manifestHash,
    reusedOldManifest: false,
    note: 'Old manifest invalidated by Phase 23D-0 finance contract.',
  }]))
  await writeFile(join(outputRoot, 'CPB_Reconciliation_Summary_Masked.json'), stableStringify({
    eventId: CPB_RECONCILIATION_EVENT_ID,
    workbookSha256: workbookHash,
    parser,
    parserContract,
    financeContract,
    manifestSha256: manifestHash,
    proposalCount: proposals.length,
    fieldChangeCount,
    workbookClassificationCounts: manifest.classifications.workbook,
    appClassificationCounts: manifest.classifications.app,
    totals: preview.totals,
    writesPerformed: false,
  }))

  console.log(JSON.stringify({
    outputRoot,
    workbookSha256: workbookHash,
    parser,
    parserContract,
    financeContract,
    normalizedRowCount: preview.recordSets.workbookRecords.length,
    proposalCount: proposals.length,
    fieldChangeCount,
    manifestSha256: manifestHash,
    cpbRegistrationCount: registrations.length,
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
