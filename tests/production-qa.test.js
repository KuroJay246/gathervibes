import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  CODEX_DEMO_EVENT_ID,
  CODEX_DEMO_EVENT_NAME,
  buildQaSampleCsv,
  buildQaTestPrefix,
  isCodexDemoWorkingEvent,
  qaChecklist,
} from '../src/utils/qaHelper.js'

test('QA helper creates stable CODEX_DEMO prefixes and fake sample CSV rows', () => {
  const prefix = buildQaTestPrefix(new Date(2026, 5, 22, 9, 5))
  const csv = buildQaSampleCsv(prefix)

  assert.equal(prefix, 'QA_DEMO_20260622_0905')
  assert.match(csv, /^Buyer Name,Attendee Names,Email,Phone,Group Name,Persons Attending,Payment Status,Payment Reference,Dietary Notes,Ticket Code,Preferred School/)
  assert.match(csv, /QA_DEMO_20260622_0905 Guest One/)
  assert.match(csv, /qa_demo_20260622_0905_guest1@example\.com/)
  assert.match(csv, /QATEST-001/)
  assert.match(csv, /Door Payment/)
  assert.match(csv, /Preferred School/)
  assert.match(csv, /complimentary/)
  assert.doesNotMatch(csv, /CPB/)
})

test('QA helper recognizes only the CODEX_DEMO Working Event', () => {
  assert.equal(isCodexDemoWorkingEvent({ eventId: CODEX_DEMO_EVENT_ID, eventName: 'Anything' }), true)
  assert.equal(isCodexDemoWorkingEvent({ eventId: 'other', eventName: CODEX_DEMO_EVENT_NAME }), true)
  assert.equal(isCodexDemoWorkingEvent({ eventId: 'real-event-id', eventName: 'Cake Piknik Barbados' }), false)
})

test('System QA route and text keep production QA scoped to CODEX_DEMO', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const page = await readFile('src/pages/QaPage.jsx', 'utf8')

  assert.match(app, /path="\/qa"/)
  assert.match(shell, /System QA/)
  assert.match(page, /System status and event checks/)
  assert.match(page, /Real events use the same standard safeguards/)
  assert.match(page, /Use CODEX_DEMO/)
  assert.match(page, /Readiness checklist/)
  assert.match(page, /do not create or change event records/)
  assert.match(page, /Copy/)
  assert.doesNotMatch(page, /Prototype Status|Run Demo Checks|Open Demo Event/)
  assert.ok(qaChecklist.length >= 7)
})

test('production fixture verification script is read-only and strict', async () => {
  const script = await readFile('scripts/admin/verifyProductionFixtures.mjs', 'utf8')
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.scripts['admin:verify-production-fixtures'], 'node scripts/admin/verifyProductionFixtures.mjs')
  assert.equal(pkg.scripts['admin:replace-codex-test-with-demo'], 'node scripts/admin/replaceCodexTestWithDemoEvent.mjs')
  assert.match(script, /const projectId = 'gathervibeshub'/)
  assert.match(script, /demoMatches\.length !== 1/)
  assert.match(script, /isTestEvent/)
  assert.match(script, /auditLogs/)
  assert.doesNotMatch(script, /cpb|CPB|Cake Piknik/)
  assert.doesNotMatch(script, /\.set\(/)
  assert.doesNotMatch(script, /\.update\(/)
  assert.doesNotMatch(script, /\.delete\(/)
  assert.doesNotMatch(script, /batch\(/)
})
