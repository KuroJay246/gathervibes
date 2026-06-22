import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  CODEX_TEST_EVENT_ID,
  CODEX_TEST_EVENT_NAME,
  CPB_EVENT_ID,
  buildQaSampleCsv,
  buildQaTestPrefix,
  isCodexTestWorkingEvent,
  qaChecklist,
} from '../src/utils/qaHelper.js'

test('QA helper creates stable CODEX_TEST prefixes and fake sample CSV rows', () => {
  const prefix = buildQaTestPrefix(new Date(2026, 5, 22, 9, 5))
  const csv = buildQaSampleCsv(prefix)

  assert.equal(prefix, 'CODEX_TEST_20260622_0905')
  assert.match(csv, /^Full name,Email,Phone,Group name,Persons attending,Payment status,Payment reference,Ticket Code,Notes/)
  assert.match(csv, /CODEX_TEST_20260622_0905 Guest One/)
  assert.match(csv, /codex_test_20260622_0905_guest1@example\.com/)
  assert.match(csv, /QATEST-001/)
  assert.match(csv, /complimentary/)
  assert.doesNotMatch(csv, /CPB/)
})

test('QA helper recognizes only the CODEX_TEST Working Event', () => {
  assert.equal(isCodexTestWorkingEvent({ eventId: CODEX_TEST_EVENT_ID, eventName: 'Anything' }), true)
  assert.equal(isCodexTestWorkingEvent({ eventId: 'other', eventName: CODEX_TEST_EVENT_NAME }), true)
  assert.equal(isCodexTestWorkingEvent({ eventId: CPB_EVENT_ID, eventName: 'CPB' }), false)
})

test('QA Center route and text keep production QA scoped to CODEX_TEST', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const page = await readFile('src/pages/QaPage.jsx', 'utf8')

  assert.match(app, /path="\/qa"/)
  assert.match(shell, /QA Center/)
  assert.match(page, /CODEX_TEST smoke testing/)
  assert.match(page, /Do not use CPB for QA/)
  assert.match(page, /does not create registrations/)
  assert.match(page, /Copy/)
  assert.ok(qaChecklist.length >= 7)
})

test('production fixture verification script is read-only and strict', async () => {
  const script = await readFile('scripts/admin/verifyProductionFixtures.mjs', 'utf8')
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.scripts['admin:verify-production-fixtures'], 'node scripts/admin/verifyProductionFixtures.mjs')
  assert.match(script, /const projectId = 'gathervibeshub'/)
  assert.match(script, /codexMatches\.length !== 1/)
  assert.match(script, /CPB/)
  assert.match(script, /auditLogs/)
  assert.doesNotMatch(script, /\.set\(/)
  assert.doesNotMatch(script, /\.update\(/)
  assert.doesNotMatch(script, /\.delete\(/)
  assert.doesNotMatch(script, /batch\(/)
})
