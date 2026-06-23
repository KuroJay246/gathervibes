import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildHeaderMappingPreview,
  buildInitialFieldMap,
  generateStableId,
  mapRows,
  mergeRowsIntoGroupRegistration,
  normalizeAttendeeNames,
  parseCSV,
  processAndValidate,
  rowsToParsedTable,
} from '../src/utils/importUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'
import { searchableRegistrationText, validateTicketCode } from '../src/utils/ticketUtils.js'

test('XLSX sheet selection requires explicit confirmation before mapping or preview', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(page, /Select the worksheet to import/)
  assert.match(page, /Choose the sheet you want to import, review the sample rows, then confirm before continuing/)
  assert.match(page, /Confirm Sheet Selection/)
  assert.match(page, /handleSheetSelection\(sheet\.id\)/)
  assert.doesNotMatch(page, /onChange=\{\(event\) => handleSheetSelection\(event\.target\.value\)\}[\s\S]*loadParsedData/)
  assert.match(page, /setStep\(2\)/)
  assert.match(page, /confirmSheetSelection/)
})

test('changing a confirmed sheet resets stale mapping and preview safely', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(page, /Changing sheets will reset mapping, duplicate review, and preview/)
  assert.match(page, /setFieldMap\(\{\}\)/)
  assert.match(page, /setProcessedRows\(\[\]\)/)
  assert.match(page, /setFinalRows\(\[\]\)/)
  assert.match(page, /setStep\(2\)/)
})

test('empty sheet cannot be confirmed and single-sheet workbooks still use confirmation UI', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const xlsx = await readFile('src/utils/xlsxImport.js', 'utf8')

  assert.match(page, /This sheet does not appear to contain importable rows/)
  assert.match(page, /disabled=\{!canConfirmSheet\}/)
  assert.doesNotMatch(page, /usableSheets\.length === 1/)
  assert.match(xlsx, /importable: parsed\.headers\.length > 0 && parsed\.rows\.length > 0/)
  assert.match(xlsx, /sampleRows/)
})

test('Google Forms-style headers map correctly and extra columns remain ignored', () => {
  const headers = [
    'Timestamp',
    'Full Name',
    'Email Address',
    'WhatsApp Number',
    'School',
    'Number Attending',
    'Payment Reference',
    'Ticket ID',
    'Random Extra Column',
  ]
  const fieldMap = buildInitialFieldMap(headers)
  const preview = buildHeaderMappingPreview(headers, fieldMap)

  assert.equal(fieldMap.timestamp, 0)
  assert.equal(fieldMap.fullName, 1)
  assert.equal(fieldMap.email, 2)
  assert.equal(fieldMap.phone, 3)
  assert.equal(fieldMap.groupName, 4)
  assert.equal(fieldMap.personsAttending, 5)
  assert.equal(fieldMap.paymentReference, 6)
  assert.equal(fieldMap.ticketCode, 7)
  assert.equal(preview[8].ignored, true)
})

test('buyer and purchaser headers map separately from attendee names', () => {
  const headers = [
    'Buyer Name',
    'Purchaser Name',
    'Contact Name',
    'Guest Names',
    'Dietary Requirements',
  ]
  const buyerMap = buildInitialFieldMap(headers)

  assert.equal(buyerMap.buyerName, 0)
  assert.deepEqual(buyerMap.attendeeNames, [3])
  assert.equal(buyerMap.notes, 4)
})

test('attendee names normalize from one multi-name column', () => {
  assert.deepEqual(
    normalizeAttendeeNames('Jayla Maynard, Corey Bob; Carl Griffith\nDana Bell / Erin May and Faith Lee'),
    ['Jayla Maynard', 'Corey Bob', 'Carl Griffith', 'Dana Bell', 'Erin May', 'Faith Lee'],
  )
})

test('attendee names map from Guest 1, Guest 2, and Guest 3 columns', () => {
  const parsed = parseCSV('Buyer Name,Guest 1,Guest 2,Guest 3,Persons Attending\nJane Buyer,Jayla Maynard,Corey Bob,Carl Griffith,3')
  const fieldMap = buildInitialFieldMap(parsed.headers)
  const rows = mapRows(parsed.rows, parsed.headers, fieldMap)

  assert.equal(fieldMap.buyerName, 0)
  assert.deepEqual(fieldMap.attendeeNames, [1, 2, 3])
  assert.equal(rows[0].buyerName, 'Jane Buyer')
  assert.deepEqual(rows[0].attendeeNames, ['Jayla Maynard', 'Corey Bob', 'Carl Griffith'])
  assert.equal(rows[0].personsAttending, 3)
  assert.equal(rows[0].fullName, 'Jayla Maynard')
})

test('buyerName alone does not replace attending guest name', async () => {
  const parsed = parseCSV('Buyer Name,Email,Persons Attending\nJane Buyer,jane@example.com,1')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'buyer-only' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(rows[0].buyerName, 'Jane Buyer')
  assert.equal(rows[0].fullName, '')
  assert.equal(processed[0].status, 'blocked')
  assert.ok(processed[0].issues.some((issue) => /required name information/.test(issue)))
})

test('missing fullName uses first attendee name with soft warning', async () => {
  const parsed = parseCSV('Buyer Name,Attendee Names,Email,Persons Attending\nJane Buyer,"Jayla Maynard, Corey Bob",jane@example.com,2')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'attendee-display' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(rows[0].fullName, 'Jayla Maynard')
  assert.equal(processed[0].status, 'warning')
  assert.ok(processed[0].issues.some((issue) => /Display name was set from the first attendee name/.test(issue)))
})

test('persons attending matches attendee names count without warning', async () => {
  const parsed = parseCSV('Full Name,Buyer Name,Attendee Names,Persons Attending,Email\nMaynard Group,Jane Buyer,"Jayla Maynard, Corey Bob, Carl Griffith",3,jane@example.com')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'attendee-match' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[0].status, 'valid')
  assert.equal(processed[0].issues.length, 0)
})

test('persons attending mismatch creates warning or review', async () => {
  const fewerNames = parseCSV('Buyer Name,Attendee Names,Persons Attending,Email\nJane Buyer,"Jayla Maynard, Corey Bob",3,jane@example.com')
  const fewerRows = mapRows(fewerNames.rows, fewerNames.headers, buildInitialFieldMap(fewerNames.headers), { importBatchId: 'attendee-warn' })
  const fewerProcessed = await processAndValidate(fewerRows, 'codex-test', [])
  assert.equal(fewerProcessed[0].status, 'warning')
  assert.ok(fewerProcessed[0].issues.some((issue) => /Persons attending is 3, but only 2 attendee names were found/.test(issue)))

  const moreNames = parseCSV('Buyer Name,Attendee Names,Persons Attending,Email\nJane Buyer,"Jayla Maynard, Corey Bob, Carl Griffith",2,jane@example.com')
  const moreRows = mapRows(moreNames.rows, moreNames.headers, buildInitialFieldMap(moreNames.headers), { importBatchId: 'attendee-review' })
  const moreProcessed = await processAndValidate(moreRows, 'codex-test', [])
  assert.equal(moreProcessed[0].status, 'needs-review')
  assert.ok(moreProcessed[0].issues.some((issue) => /3 attendee names were found, but Persons attending is 2/.test(issue)))
})

test('blank persons attending suggests attendee count and requires review', async () => {
  const parsed = parseCSV('Buyer Name,Attendee Names,Email\nJane Buyer,"Jayla Maynard, Corey Bob",jane@example.com')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'attendee-suggest' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(rows[0].personsAttending, 2)
  assert.equal(processed[0].status, 'needs-review')
  assert.ok(processed[0].issues.some((issue) => /suggested count is 2/.test(issue)))
})

test('shared phone and email across different names are warnings, not hard errors', async () => {
  const parsed = parseCSV('Full Name,Email,Phone,Group Name,Persons Attending\nJane,family@example.com,2465550000,Family,1\nJohn,family@example.com,2465550000,Family,2')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'batch-a' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[0].status, 'valid')
  assert.equal(processed[1].status, 'warning')
  assert.ok(processed[1].issues.some((issue) => /Same phone number/.test(issue)))
  assert.ok(processed[1].issues.some((issue) => /Same email/.test(issue)))
  assert.equal(processed[1].defaultAction, 'keep')
})

test('same buyer with multiple attendee names is not a hard duplicate', async () => {
  const parsed = parseCSV('Buyer Name,Attendee Names,Email,Persons Attending\nJane Buyer,Jayla Maynard,buyer@example.com,1\nJane Buyer,Corey Bob,buyer@example.com,1')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'buyer-group' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[1].status, 'warning')
  assert.ok(processed[1].issues.some((issue) => /Same buyer\/contact name/.test(issue)))
})

test('possible duplicate attendee with same buyer requires review', async () => {
  const parsed = parseCSV('Buyer Name,Attendee Names,Email,Persons Attending\nJane Buyer,Jayla Maynard,buyer@example.com,1\nJane Buyer,Jayla Maynard,buyer@example.com,1')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'attendee-duplicate' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[1].status, 'needs-review')
  assert.ok(processed[1].issues.some((issue) => /same attendee list and buyer\/contact/.test(issue)))
})

test('same fullName and same contact becomes needs-review, not silent import', async () => {
  const parsed = parseCSV('Full Name,Email,Phone,Persons Attending\nJane,jane@example.com,2465550000,1\nJane,jane@example.com,2465550000,1')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'batch-b' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[1].status, 'needs-review')
  assert.equal(processed[1].defaultAction, 'needs-review')
  assert.ok(processed[1].issues.some((issue) => /same guest/.test(issue)))
})

test('ticket code duplicates remain hard errors for batch and existing event scope', async () => {
  const parsed = parseCSV('Full Name,Email,Ticket Code\nJane,jane@example.com,CT-001\nJohn,john@example.com,CT-001')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'batch-c' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[1].status, 'blocked')
  assert.ok(processed[1].issues.some((issue) => /appears more than once/.test(issue)))

  const existingProcessed = await processAndValidate([rows[0]], 'codex-test', [{ eventId: 'codex-test', ticketCode: 'CT-001' }])
  assert.equal(existingProcessed[0].status, 'blocked')
  assert.ok(existingProcessed[0].issues.some((issue) => /already used/.test(issue)))
})

test('event-style multi-part ticket codes are valid for imports and QR lookup', async () => {
  const parsed = parseCSV('Full Name,Email,Ticket Code\nJane,jane@example.com,CPB-TEST-001')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'batch-ticket-format' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(validateTicketCode('CPB-TEST-001'), '')
  assert.equal(rows[0].ticketCode, 'CPB-TEST-001')
  assert.equal(processed[0].status, 'valid')
  assert.equal(qrPayloadForTicketCode('CPB-TEST-001'), 'GSV:TICKET:CPB-TEST-001')
  assert.match(validateTicketCode('CPB-TOO-LONG-TICKET-CODE-123456789'), /letters/)
})

test('sourceRowId and registration IDs do not collide just because contact is shared', async () => {
  const rowA = { fullName: 'Jane', email: 'family@example.com', phone: '2465550000', sourceRowId: 'row-1', importBatchId: 'batch-a' }
  const rowB = { fullName: 'John', email: 'family@example.com', phone: '2465550000', sourceRowId: 'row-2', importBatchId: 'batch-a' }

  assert.notEqual(await generateStableId('codex-test', rowA), await generateStableId('codex-test', rowB))

  const parsed = parseCSV('Full Name,Email\nJane,family@example.com')
  const rowsFromFirstFile = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'first-file.csv' })
  const rowsFromSecondFile = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'second-file.csv' })

  assert.notEqual(rowsFromFirstFile[0].sourceRowId, rowsFromSecondFile[0].sourceRowId)
})

test('manual merge sums persons and preserves original names in notes', () => {
  const merged = mergeRowsIntoGroupRegistration([
    { status: 'warning', row: { fullName: 'Jane Guest', groupName: 'Family', personsAttending: 1, email: 'family@example.com', notes: 'Window seat', sourceRowId: 'row-1' } },
    { status: 'warning', row: { fullName: 'John Guest', groupName: 'Family', personsAttending: 2, phone: '2465550000', sourceRowId: 'row-2' } },
  ])

  assert.equal(merged.status, 'valid')
  assert.equal(merged.row.fullName, 'Family')
  assert.equal(merged.row.personsAttending, 3)
  assert.match(merged.row.notes, /Jane Guest/)
  assert.match(merged.row.notes, /John Guest/)
})

test('manual merge keeps sourceRowId within Firestore rule limit', () => {
  const longId = 'long-file-name-for-import:long-sheet-name-for-import:row-with-extra-metadata-'
  const merged = mergeRowsIntoGroupRegistration(Array.from({ length: 5 }, (_, index) => ({
    status: 'warning',
    row: {
      fullName: `Guest ${index + 1}`,
      groupName: 'Large Family',
      personsAttending: 1,
      sourceRowId: `${longId}${index + 1}`.repeat(2),
    },
  })))

  assert.equal(merged.status, 'valid')
  assert.ok(merged.row.sourceRowId.length <= 128)
  assert.match(merged.row.sourceRowId, /^merged:5:/)
})

test('manual merge preserves buyerName and attendeeNames', () => {
  const merged = mergeRowsIntoGroupRegistration([
    { status: 'warning', row: { fullName: 'Jayla Maynard', buyerName: 'Jane Buyer', attendeeNames: ['Jayla Maynard'], groupName: 'Buyer Group', personsAttending: 1, email: 'buyer@example.com', notes: 'No nuts' } },
    { status: 'warning', row: { fullName: 'Corey Bob', buyerName: 'Jane Buyer', attendeeNames: ['Corey Bob'], groupName: 'Buyer Group', personsAttending: 1, phone: '2465550000', notes: 'Aisle seat' } },
  ])

  assert.equal(merged.status, 'valid')
  assert.equal(merged.row.buyerName, 'Jane Buyer')
  assert.deepEqual(merged.row.attendeeNames, ['Jayla Maynard', 'Corey Bob'])
  assert.equal(merged.row.personsAttending, 2)
  assert.match(merged.row.notes, /Jayla Maynard/)
  assert.match(merged.row.notes, /Corey Bob/)
})

test('manual merge blocks conflicting buyer names', () => {
  const merged = mergeRowsIntoGroupRegistration([
    { status: 'warning', row: { fullName: 'Jayla Maynard', buyerName: 'Jane Buyer', attendeeNames: ['Jayla Maynard'], personsAttending: 1 } },
    { status: 'warning', row: { fullName: 'Corey Bob', buyerName: 'Other Buyer', attendeeNames: ['Corey Bob'], personsAttending: 1 } },
  ])

  assert.equal(merged.status, 'blocked')
  assert.ok(merged.issues.some((issue) => /Conflicting buyer names/.test(issue)))
})

test('manual merge blocks multiple ticket codes instead of losing data', () => {
  const merged = mergeRowsIntoGroupRegistration([
    { status: 'warning', row: { fullName: 'Jane Guest', groupName: 'Family', personsAttending: 1, ticketCode: 'CT-001' } },
    { status: 'warning', row: { fullName: 'John Guest', groupName: 'Family', personsAttending: 1, ticketCode: 'CT-002' } },
  ])

  assert.equal(merged.status, 'blocked')
  assert.ok(merged.issues.some((issue) => /Multiple ticket codes/.test(issue)))
})

test('row table identity includes sheet source data', () => {
  const parsed = rowsToParsedTable([
    ['Full Name', 'Email'],
    ['Jane', 'jane@example.com'],
  ], { sourceKey: 'sheet-2' })

  assert.equal(parsed.rows[0]._sourceKey, 'sheet-2:')
  assert.equal(parsed.rows[0]._sourceRowIndex, 1)
})

test('Import Center keeps preview before writes and skip rows excluded from final import', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const preview = await readFile('src/components/imports/ImportPreviewTable.jsx', 'utf8')

  assert.match(preview, /Continue to Final Import Preview/)
  assert.match(page, /setStep\(5\)/)
  assert.match(page, /setStep\(6\)/)
  assert.match(preview, /Skip Row/)
  assert.match(preview, /row\.status !== 'blocked' && row\.status !== 'skipped'/)
  assert.match(page, /commitImport\(validRows/)
})

test('confirmed import write strips UI-only review fields', async () => {
  const service = await readFile('src/services/importService.js', 'utf8')

  assert.match(service, /batch\.set\(regRef, \{/)
  assert.match(service, /const chunkSize = 5/)
  assert.match(service, /buyerName/)
  assert.match(service, /attendeeNames/)
  assert.doesNotMatch(service, /personsAttendingWasBlank/)
  assert.doesNotMatch(service, /displayNameFromFirstAttendee/)
  assert.doesNotMatch(service, /reviewActions/)
  assert.doesNotMatch(service, /sourceFileName/)
  assert.doesNotMatch(service, /sourceSheetName/)
  assert.doesNotMatch(service, /importBatchId/)
})

test('Import Center shows clear Firestore permission-denied diagnostics without guest rows', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(page, /Import failed because Firestore denied the write/)
  assert.match(page, /No rows were imported/)
  assert.match(page, /confirmed-import-batch/)
  assert.match(page, /Copy Error Details/)
  assert.match(page, /Guest row values are not included/)
})

test('duplicate checks stay scoped to the selected Working Event data passed to processing', async () => {
  const parsed = parseCSV('Full Name,Email,Ticket Code\nCODEX Guest,codex@example.com,CT-009')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'batch-scope' })
  const cpbExisting = [{ eventId: 'cpb', fullName: 'CODEX Guest', email: 'codex@example.com', ticketCode: 'CPB-009' }]
  const processed = await processAndValidate(rows, 'codex-test', cpbExisting.filter((row) => row.eventId === 'codex-test'))

  assert.equal(processed[0].status, 'valid')
})

test('search can match buyerName and attendeeNames', () => {
  const text = searchableRegistrationText({
    fullName: 'Jayla Maynard',
    buyerName: 'Jane Buyer',
    attendeeNames: ['Corey Bob', 'Carl Griffith'],
    email: 'buyer@example.com',
    ticketCode: 'CT-010',
  })

  assert.match(text, /jane buyer/)
  assert.match(text, /corey bob/)
  assert.match(text, /carl griffith/)
})

test('QR output remains ticket-code only without personal data', () => {
  const payload = qrPayloadForTicketCode('CT-010')

  assert.equal(payload, 'GSV:TICKET:CT-010')
  assert.doesNotMatch(payload, /jane|buyer|corey|griffith|@|246/i)
})

test('Firestore registration rules allow only narrow buyer and attendee fields', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(rules, /buyerName/)
  assert.match(rules, /attendeeNames/)
  assert.match(rules, /validOptionalAttendeeNames/)
  assert.match(rules, /isApprovedAdmin\(\)/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
})
