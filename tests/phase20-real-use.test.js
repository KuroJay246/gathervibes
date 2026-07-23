import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 20 dashboard and events preserve approved layout while clarifying working-event pricing context', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const events = await readFile('src/pages/EventsPage.jsx', 'utf8')

  assert.match(dashboard, /Event Summary/)
  assert.match(dashboard, /Payments received/)
  assert.match(dashboard, /Capacity used/)
  assert.match(dashboard, /Projected cash position/)
  assert.match(events, /function pricingModeLabel\(event = \{\}\)/)
  assert.match(events, /Default base ticket price only/)
  assert.match(events, /No pricing configured/)
  assert.match(events, /Plan a New Event/)
})

test('Phase 20 keeps registration audit wording and ticket QR guardrails intact', async () => {
  const registrationService = await readFile('src/services/registrationService.js', 'utf8')

  assert.match(registrationService, /action: 'registration\.update'/)
  assert.match(registrationService, /action: 'registration\.finance-update'/)
  assert.equal(qrPayloadForTicketCode('PH20-001'), 'GSV:TICKET:PH20-001')
})

test('Phase 20 keeps import preview-first, xlsx absent, read-excel-file active, and access workflow disabled', async () => {
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const packageLock = await readFile('package-lock.json', 'utf8')
  const xlsxImport = await readFile('src/utils/xlsxImport.js', 'utf8')

  assert.match(imports, /preview before saving/i)
  assert.match(imports, /No event records are saved until you confirm valid rows on the preview screen\./)
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.doesNotMatch(packageLock, /node_modules\/xlsx/)
  assert.match(xlsxImport, /read-excel-file\/browser/)
  assert.match(settings, /Access is controlled outside this page/)
  assert.match(settings, /cannot add, remove, disable, or change anyone's role/)
})

test('Phase 20 operational handoff guide stays practical and preserves CPB and CODEX_TEST guardrails', async () => {
  const guide = await readFile('PHASE_20_DASHBOARD_OPERATIONS_REAL_USE.md', 'utf8')

  assert.match(guide, /What is ready now/)
  assert.match(guide, /How to choose a Working Event/)
  assert.match(guide, /How to use Dashboard/)
  assert.match(guide, /How to use Operations/)
  assert.match(guide, /CPB is protected production data/)
  assert.match(guide, /CODEX_TEST Live Verification Event/)
  assert.match(guide, /Access request workflow is still not live/)
  assert.match(guide, /Scanner is secondary in this phase/)
})
