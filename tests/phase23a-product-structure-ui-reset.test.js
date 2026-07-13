import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('organizer navigation uses product labels while preserving route paths', async () => {
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')

  for (const label of ['Overview', 'Guests & Registrations', 'Tickets', 'Check-In', 'Operations', 'Message Builder', 'Reports', 'Settings', 'System QA']) {
    assert.match(shell, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(shell, /to: '\/communications', label: 'Message Builder'/)
  assert.match(shell, /to: '\/event-review', label: 'Reports'/)
  assert.match(shell, /to: '\/qa', label: 'System QA'/)
  assert.match(shell, /Overview[\s\S]*Guests[\s\S]*Tickets[\s\S]*Check-In[\s\S]*More/)
  const mobileMoreGroups = shell.slice(shell.indexOf('const mobileMoreGroups'), shell.indexOf('const pageTitles'))
  assert.match(mobileMoreGroups, /More workspace[\s\S]*\/events[\s\S]*\/operations[\s\S]*\/communications[\s\S]*\/event-review[\s\S]*Admin[\s\S]*\/settings[\s\S]*\/qa/)
  assert.doesNotMatch(mobileMoreGroups, /\/dashboard|\/registrations|\/tickets|\/check-in|\/imports/)
  assert.match(app, /path="\/communications"/)
  assert.match(app, /path="\/event-review"/)
  assert.match(app, /path="\/qa"/)
  assert.match(access, /scanner:[\s\S]*'\/scanner'/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/qa'/)
})

test('Overview removes phase clutter and keeps event-scoped decision sections', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')

  for (const text of ['Working Event', 'Registration records', 'Guests', 'Registration money collected', 'Capacity used', 'Needs Attention', 'Quick Actions', 'Event Progress', 'Upcoming Events']) {
    assert.match(dashboard, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(dashboard, /Open Reports/)
  assert.match(dashboard, /id="clear-selected-event"/)
  assert.doesNotMatch(dashboard, /Phase \d+/)
  assert.doesNotMatch(dashboard, /roadmap|deferred|command center|Quick navigation/i)
})

test('Message Builder is copy-only and does not claim automatic sending or real AI', async () => {
  const page = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')

  assert.match(page, /Message Builder/)
  assert.match(page, /Messages are not sent automatically/)
  assert.match(page, /Prompt Builder/)
  assert.match(page, /Copy & Use/)
  assert.doesNotMatch(page, /Communications Pro|Copy-only Command Center|Phase 11|Phase 13A|AI Draft Lab/)
  assert.match(page, /does not send email or WhatsApp messages/)
  assert.doesNotMatch(page, /delivery status is tracked/i)
})

test('Settings contains practical settings and not a roadmap archive', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  for (const text of ['Current defaults', 'Default currency', 'Default ticket prefix', 'Price tiers fallback', 'Access Summary', 'Scanner & Tickets', 'Finance & Operations', 'Security']) {
    assert.match(settings, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(settings, /Access request actions disabled/)
  assert.match(settings, /Role editing is not exposed/)
  assert.doesNotMatch(settings, /Phase \d+|roadmap|backlog|closed \/ shipped|Current active phase|Submit request \(not live\)/i)
})

test('Reports remains read-only and separates registration payments from Operations', async () => {
  const page = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(page, /Event Report & Review/)
  assert.match(page, /read-only report/i)
  assert.match(page, /Needs Follow-Up/)
  assert.match(page, /Registration payments and Operations Summary/)
  assert.match(page, /Registration Payments/)
  assert.match(page, /Operations Ledger/)
  assert.match(page, /review\.summary\.title/)
  assert.match(page, /attendanceNote/)
  assert.doesNotMatch(page, /Command Center/)
})

test('Phase 23A guardrails keep QR, dependencies, rules, and access boundaries unchanged', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')
  const contract = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.equal(qrPayloadForTicketCode('PH23A-001'), 'GSV:TICKET:PH23A-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(access, /scanner:[\s\S]*\/scanner/)
  assert.match(contract, /No live access workflow is available/)
  assert.doesNotMatch(contract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})
