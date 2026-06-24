import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildInitialFieldMap,
  mapRows,
  parseCSV,
  processAndValidate,
} from '../src/utils/importUtils.js'
import { normalizePaymentStatus } from '../src/utils/paymentStatus.js'
import { normalizeTicketCode, validateTicketCode } from '../src/utils/ticketUtils.js'

test('door payment values normalize to door and unknown payment status requires review', async () => {
  for (const value of ['door', 'Door Payment', 'pay at door', 'Door Sale', 'walk-in', 'Unpaid']) {
    const expected = value === 'Unpaid' ? 'pending' : value === 'pay at door' ? 'door-list' : 'door'
    assert.equal(normalizePaymentStatus(value), expected)
  }

  const parsed = parseCSV('Full Name,Payment Status\nJane Guest,Barter')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'unknown-payment' })
  const processed = await processAndValidate(rows, 'codex-test', [])

  assert.equal(processed[0].status, 'needs-review')
  assert.ok(processed[0].issues.some((issue) => /Payment status "Barter" needs review/.test(issue)))
})

test('organizer ticket codes are accepted but duplicates stay blocked', async () => {
  for (const code of ['CPB-TEST-001', 'CPB-001', 'CPB DOOR 001', 'DOOR-001', '001', 'A001', 'VIP-001']) {
    assert.equal(validateTicketCode(code), '')
  }
  assert.equal(normalizeTicketCode(' CPB DOOR   001 '), 'CPB DOOR 001')
  assert.match(validateTicketCode('CPB<script>'), /letters/)

  const parsed = parseCSV('Full Name,Ticket Code\nJane,VIP-001\nJohn,VIP-001')
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'ticket-dupe' })
  const processed = await processAndValidate(rows, 'codex-test', [])
  assert.equal(processed[1].status, 'blocked')
})

test('preferred school maps safely and is preserved in import notes only', async () => {
  const parsed = parseCSV('Full Name,Preferred School,Notes\nJane Guest,North School,No nuts')
  const fieldMap = buildInitialFieldMap(parsed.headers)
  const rows = mapRows(parsed.rows, parsed.headers, fieldMap, { importBatchId: 'school' })
  const service = await readFile('src/services/importService.js', 'utf8')

  assert.equal(fieldMap.preferredSchool, 1)
  assert.equal(rows[0].preferredSchool, 'North School')
  assert.match(service, /Preferred school:/)
  assert.doesNotMatch(service, /preferredSchool:\s*row\.preferredSchool/)
})

test('Import Center exposes editable preview, bulk actions, and ticket handling without writing before confirm', async () => {
  const page = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const preview = await readFile('src/components/imports/ImportPreviewTable.jsx', 'utf8')
  const service = await readFile('src/services/importService.js', 'utf8')

  assert.match(preview, /Edit row/)
  assert.match(preview, /Save changes/)
  assert.match(preview, /Select warnings/)
  assert.match(preview, /Select blocked/)
  assert.match(preview, /Skip selected/)
  assert.match(preview, /Generate missing tickets/)
  assert.match(preview, /Revalidate all/)
  assert.match(page, /Use imported ticket codes/)
  assert.match(page, /Auto-generate missing ticket codes/)
  assert.match(page, /Leave missing ticket codes blank for now/)
  assert.match(page, /setStep\(5\)/)
  assert.match(page, /commitImport\(validRows/)
  assert.doesNotMatch(service, /edited:/)
})

test('Registrations page has count bars and current-event bulk actions', async () => {
  const page = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const service = await readFile('src/services/registrationService.js', 'utf8')

  assert.match(page, /Select all visible rows/)
  assert.match(page, /Select all filtered rows/)
  assert.match(page, /Delete selected/)
  assert.match(page, /Door/)
  assert.match(page, /Missing ticket/)
  assert.match(page, /Selected rows/)
  assert.match(service, /registration\.eventId === eventId/)
  assert.match(service, /bulkDeleteRegistrations/)
  assert.match(service, /registration\.delete/)
  assert.doesNotMatch(service, /collection\(firestore, 'events'\).*delete/s)
  assert.doesNotMatch(service, /auditLogs.*delete/s)
})

test('Settings, QA, and Communications pages expose practical admin polish', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const communications = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  const templates = await readFile('src/utils/communicationsUtils.js', 'utf8')

  assert.match(settings, /My Admin Profile/)
  assert.match(settings, /photoURL/)
  assert.match(settings, /Approved admin allowlist/)
  assert.match(settings, /Danger Zone/)
  assert.match(qa, /Run QA checks/)
  assert.match(qa, /Copy QA report/)
  assert.match(qa, /QR payload privacy/)
  assert.match(communications, /Door/)
  assert.match(templates, /Door Payment Instructions/)
  assert.match(templates, /\{\{venue\}\}/)
})

test('old internal labels are removed while roadmap backlog remains visible', async () => {
  const files = [
    'src/App.jsx',
    'src/layout/AppShell.jsx',
    'src/pages/DashboardPage.jsx',
    'src/pages/EventsPage.jsx',
    'src/pages/TicketsPage.jsx',
    'src/pages/CommunicationsPage.jsx',
    'src/pages/SettingsPage.jsx',
  ]

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    assert.doesNotMatch(content, /Door List/)
  }

  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  assert.match(settings, /AI writing/)
  assert.match(settings, /Finance tracker/)
  assert.match(settings, /Phase 9 active/)
})
