import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 23V adds reusable summary/detail layout primitives without new dependencies', async () => {
  const styles = await readFile('src/styles.css', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

  for (const className of ['phase23v-panel', 'phase23v-summary', 'phase23v-body', 'phase23v-metric-grid']) {
    assert.match(styles, new RegExp(`\\.${className}`))
  }

  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
})

test('Phase 23V Overview is summary-first and moves secondary detail behind disclosure panels', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')

  assert.match(dashboard, /aria-label="Key event numbers"/)
  assert.match(dashboard, /Registration records/)
  assert.match(dashboard, /Guests/)
  assert.match(dashboard, /Payments received/)
  assert.match(dashboard, /Capacity used/)
  assert.match(dashboard, /Needs Attention/)
  assert.match(dashboard, /Quick Actions/)
  assert.match(dashboard, /Event details, money snapshot, and readiness progress/)
  assert.match(dashboard, /Planning progress and upcoming events/)
  assert.doesNotMatch(dashboard, /Phase \d+|roadmap|deferred/i)
})

test('Phase 23V dense organizer pages keep primary work visible and collapse secondary review detail', async () => {
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const tickets = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(registrations, /registrationMetricCards\.slice\(0, 6\)/)
  assert.match(registrations, /More registration metrics and review filters/)
  assert.match(registrations, /Registration evidence reconciliation/)

  assert.match(payments, /Payment status and review detail/)
  assert.match(payments, /Payment evidence detail/)
  assert.match(payments, /Historical and informational review/)

  assert.match(tickets, /Advanced ticket filters/)
  assert.match(tickets, /Show QR code/)
  assert.doesNotMatch(tickets, /GSV:TICKET:\{ticketCode\}/)

  assert.match(checkIn, /More attendance and readiness counts/)
  assert.match(checkIn, /Event-day helper lists and exports/)
  assert.match(checkIn, /Advanced check-in filters/)

  assert.match(operations, /Partner commitments, sponsors, and supplier contacts/)
  assert.match(operations, /Financial audit and closeout history/)
  assert.match(reports, /Show full report metrics/)
})

test('Phase 23V guardrails preserve routes, QR payload, rules, indexes, access, and workflow boundaries', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')
  const accessRequestContract = await readFile('src/services/accessRequestContract.js', 'utf8')

  for (const route of ['/dashboard', '/events', '/registrations', '/payments', '/tickets', '/check-in', '/operations', '/event-review', '/communications', '/imports', '/settings', '/qa']) {
    assert.match(app, new RegExp(`path="${route.replace('/', '\\/')}"`))
  }

  assert.match(shell, /Message Builder/)
  assert.match(shell, /Reports/)
  assert.match(shell, /System QA/)
  assert.equal(qrPayloadForTicketCode('QA23V-001'), 'GSV:TICKET:QA23V-001')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(access, /scanner:[\s\S]*'\/scanner'/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/event-review'|scanner:[\s\S]*'\/qa'/)
  assert.match(accessRequestContract, /No live access workflow is available/)
  assert.doesNotMatch(accessRequestContract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})
