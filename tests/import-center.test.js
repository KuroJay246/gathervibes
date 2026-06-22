import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { IMPORT_SOURCES, getImportSource } from '../src/utils/importSources.js'
import { mapRows, parseCSV } from '../src/utils/importUtils.js'

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

test('Import Center keeps Google Sheets OAuth and XLSX parsing deferred', () => {
  const sheets = getImportSource('google-sheets-csv')
  const xlsx = getImportSource('xlsx')

  assert.match(sheets.helperText, /Download your sheet as CSV/)
  assert.equal(xlsx.mode, 'deferred')
  assert.match(xlsx.helperText, /Excel workbook/)
})

test('Import Center page labels source selector and XLSX as coming next', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(page, /Import Center/)
  assert.match(page, /Choose source/)
  assert.match(page, /Coming next/)
  assert.match(page, /XLSX upload is deferred/)
  assert.doesNotMatch(page, /Google Sheets API/)
})

test('existing CSV parsing and mapping still works for registration imports', () => {
  const parsed = parseCSV('Full name,Email,Payment reference,Notes\nJane,jane@example.com,TEST123,Window seat')
  const rows = mapRows(parsed.rows, parsed.headers, {
    fullName: 0,
    email: 1,
    paymentReference: 2,
    notes: 3,
  })

  assert.equal(rows[0].fullName, 'Jane')
  assert.equal(rows[0].email, 'jane@example.com')
  assert.equal(rows[0].paymentReference, 'TEST123')
  assert.equal(rows[0].notes, 'Window seat')
})
