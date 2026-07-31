import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  IMPORT_RECORD_TYPES,
  IMPORT_SOURCES,
  IMPORT_WORKFLOW_STEPS,
  getImportRecordType,
  getImportSource,
} from '../src/utils/importSources.js'
import { buildHeaderMappingPreview, buildInitialFieldMap, parseCSV } from '../src/utils/importUtils.js'
import { FORM_INBOX_COLUMNS, buildManualFormConnection } from '../src/utils/formResponseInbox.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Import Center exposes the approved step workflow and source taxonomy', () => {
  assert.deepEqual(IMPORT_WORKFLOW_STEPS, [
    'Source',
    'Record Type',
    'Upload/Paste',
    'Template',
    'Headers',
    'Mapping',
    'Validation',
    'Review',
    'Confirm',
    'Result',
  ])

  assert.deepEqual(IMPORT_SOURCES.map((source) => source.label), [
    'Google Forms CSV',
    'Google Sheets Export',
    'Excel Workbook',
    'Custom CSV',
    'Paste Table',
    'Copy Rows From Spreadsheet',
    'PDF Table Downloaded From Email',
    'Google Forms Response Inbox',
  ])
  assert.equal(getImportSource('google-sheets-csv').value, 'google-sheets-export')
  assert.equal(getImportSource('bank-payment-csv').value, 'custom-csv')
})

test('record types are explicit and only guest-registration writes from Import Center', () => {
  assert.equal(IMPORT_RECORD_TYPES.length, 9)
  assert.equal(getImportRecordType('guest-registration').writeSupport, 'supported')
  assert.equal(getImportRecordType('payment-update').writeSupport, 'review-only')
  assert.equal(getImportRecordType('operations-entry').writeSupport, 'review-only')
  assert.ok(IMPORT_RECORD_TYPES.every((recordType) => /supported|review-only/.test(recordType.writeSupport)))
})

test('parser accepts CSV, pasted tab tables, and semicolon exports', () => {
  const tabbed = parseCSV('Full Name\tEmail Address\tPersons Attending\nTab Guest\ttab@example.com\t2')
  const semicolon = parseCSV('Full Name;Email Address;Payment Status\nSemi Guest;semi@example.com;paid')

  assert.deepEqual(tabbed.headers, ['Full Name', 'Email Address', 'Persons Attending'])
  assert.equal(tabbed.rows[0].data[1], 'tab@example.com')
  assert.deepEqual(semicolon.headers, ['Full Name', 'Email Address', 'Payment Status'])
  assert.equal(semicolon.rows[0].data[2], 'paid')
})

test('header mapping preview shows examples, statuses, duplicate headers, and unmapped columns', () => {
  const parsed = parseCSV('Full Name,Full Name,Unknown Column\nJane,Duplicate,Extra')
  const preview = buildHeaderMappingPreview(parsed.headers, buildInitialFieldMap(parsed.headers), parsed.rows)

  assert.equal(preview[0].exampleValue, 'Jane')
  assert.equal(preview[0].status, 'Duplicate Header')
  assert.equal(preview[1].duplicateHeader, true)
  assert.equal(preview[2].status, 'Not Yet Mapped')
  assert.equal(preview[2].ignored, true)
})

test('Import Center page labels PDF fallback and Response Inbox honestly', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const mapping = await readFile('src/components/imports/FieldMappingForm.jsx', 'utf8')
  const templates = await readFile('src/components/imports/ImportTemplatesPanel.jsx', 'utf8')

  assert.match(page, /PDF table import needs a safer source format/)
  assert.match(page, /No automatic receiver is deployed from this screen/)
  assert.match(page, /Nothing becomes a registration automatically/)
  assert.match(page, /Only Guest Registration writes are enabled here/)
  assert.match(mapping, /Example Value/)
  assert.match(mapping, /Not Yet Mapped/)
  assert.match(mapping, /Preserve in Notes/)
  assert.match(templates, /Response Inbox Review Template/)
  assert.match(templates, /Live Google Sheets sync is not connected|Google Sheets is not connected live/)
})

test('Response Inbox remains manual review unless an authorized receiver is separately active', () => {
  const connection = buildManualFormConnection({ eventId: 'event-1' })

  assert.equal(connection.status, 'draft')
  assert.equal(connection.connectionName, 'Manual Google Forms response review')
  assert.ok(FORM_INBOX_COLUMNS.includes('Sync History'))
  assert.ok(FORM_INBOX_COLUMNS.includes('Mapping Templates'))
})

test('Import upgrade preserves package and ticket guardrails', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')

  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.equal(qrPayloadForTicketCode('QA-IMPORT-001'), 'GSV:TICKET:QA-IMPORT-001')
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(indexes, /formResponses|formConnections/)
})
