import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { IMPORT_SOURCES, getImportSource } from '../src/utils/importSources.js'
import { buildInitialFieldMap, mapRows, parseCSV, processAndValidate, rowsToParsedTable } from '../src/utils/importUtils.js'

test('Import Center source selector covers supported source types', () => {
  assert.deepEqual(
    IMPORT_SOURCES.map((source) => source.value),
    [
      'google-forms-csv',
      'google-sheets-csv',
      'xlsx',
      'pasted-table',
      'bank-payment-csv',
      'custom',
    ],
  )
})

test('Import Center excludes completed CPB recovery tools from organizer sources', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const templates = await readFile('src/components/imports/ImportTemplatesPanel.jsx', 'utf8')

  assert.doesNotMatch(page, /PaymentAuditBackfillPanel|cpb-audit-preview|CPB Payment Audit Backfill/)
  assert.doesNotMatch(templates, /CPB Payment Audit Backfill|Christina Morris|Cole also has/)
})

test('Import Center keeps Google Sheets OAuth deferred and enables XLSX parsing', () => {
  const sheets = getImportSource('google-sheets-csv')
  const xlsx = getImportSource('xlsx')

  assert.match(sheets.helperText, /Download your sheet as CSV/)
  assert.equal(xlsx.mode, 'xlsx')
  assert.match(xlsx.helperText, /Excel workbook/)
})

test('Import Center page labels source selector and XLSX upload as preview-first', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(page, /Import Center/)
  assert.match(page, /Choose source/)
  assert.match(page, /Click or drag to upload XLSX/)
  assert.match(page, /No Firestore write happens until you confirm valid rows/)
  assert.doesNotMatch(page, /Google Sheets API/)
})

test('existing CSV parsing and mapping still works for registration imports', () => {
  const parsed = parseCSV('Full name,Email,Payment reference,Ticket Code,Notes\nJane,jane@example.com,TEST123,CPB-001,Window seat')
  const rows = mapRows(parsed.rows, parsed.headers, {
    fullName: 0,
    email: 1,
    paymentReference: 2,
    ticketCode: 3,
    notes: 4,
  })

  assert.equal(rows[0].fullName, 'Jane')
  assert.equal(rows[0].email, 'jane@example.com')
  assert.equal(rows[0].paymentReference, 'TEST123')
  assert.equal(rows[0].ticketCode, 'CPB-001')
  assert.equal(rows[0].ticketStatus, 'assigned')
  assert.equal(rows[0].notes, 'Window seat')
})

test('Import Center detects ticket code headers and blocks duplicate imported ticket codes', async () => {
  const parsed = parseCSV('Full name,Email,Ticket Number\nJane,jane@example.com,CPB-001\nJohn,john@example.com,CPB-001')
  const fieldMap = buildInitialFieldMap(parsed.headers)
  const rows = mapRows(parsed.rows, parsed.headers, fieldMap)
  const processed = await processAndValidate(rows, 'event-1', [])

  assert.equal(fieldMap.ticketCode, 2)
  assert.equal(processed[0].row.ticketCode, 'CPB-001')
  assert.equal(processed[0].status, 'valid')
  assert.equal(processed[1].status, 'blocked')
  assert.ok(processed[1].issues.some((issue) => /ticket code appears more than once/.test(issue)))
})

test('XLSX row normalization detects headers and preserves existing mapping flow', () => {
  const parsed = rowsToParsedTable([
    ['', '', ''],
    ['Full name', 'Email', 'Persons attending'],
    ['Test Guest', 'TEST@example.com', 2],
  ])
  const fieldMap = buildInitialFieldMap(parsed.headers)
  const rows = mapRows(parsed.rows, parsed.headers, fieldMap)

  assert.deepEqual(parsed.headers, ['Full name', 'Email', 'Persons attending'])
  assert.equal(fieldMap.fullName, 0)
  assert.equal(fieldMap.email, 1)
  assert.equal(fieldMap.personsAttending, 2)
  assert.equal(rows[0].fullName, 'Test Guest')
  assert.equal(rows[0].email, 'test@example.com')
  assert.equal(rows[0].personsAttending, 2)
})

test('pasted table import still uses the same CSV parser and preview path', () => {
  const pasted = parseCSV('Full name\tEmail\nPaste Guest\tpaste@example.com'.replaceAll('\t', ','))

  assert.deepEqual(pasted.headers, ['Full name', 'Email'])
  assert.equal(pasted.rows[0].data[0], 'Paste Guest')
})
