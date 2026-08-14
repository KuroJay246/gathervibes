import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 5 Tickets is summary-first and keeps QR plus check-in actions explicit', async () => {
  const page = await readFile('src/pages/TicketsPage.jsx', 'utf8')

  assert.match(page, /aria-label="Ticket summary"/)
  assert.match(page, /Tickets Issued/)
  assert.match(page, /Tickets Not Yet Issued/)
  assert.match(page, /Ticket Records Needing Review/)
  assert.match(page, /Ticket details/)
  assert.match(page, /View ticket QR/)
  assert.match(page, /Open Check-In/)
  assert.match(page, /View Ticket/)
  assert.equal(qrPayloadForTicketCode('PH5-001'), 'GSV:TICKET:PH5-001')
})

test('Phase 5 Check-In adds manual-check-in framing and recent activity without broadening permissions', async () => {
  const page = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')

  assert.match(page, /Manual check-in/)
  assert.match(page, /Find the next guest fast/)
  assert.match(page, /Recent check-ins/)
  assert.match(page, /Latest activity/)
  assert.match(page, /Open Scanner Mode/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/event-review'|scanner:[\s\S]*'\/payments'|scanner:[\s\S]*'\/settings'/)
})

test('Phase 5 Reports adds event summary and administrative closeout framing while staying read-only', async () => {
  const page = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(page, /Event Summary/)
  assert.match(page, /Administrative review/)
  assert.match(page, /Event closeout review/)
  assert.match(page, /Completed events remain editable elsewhere/)
  assert.match(page, /Attendance and read-only reporting boundaries/)
  assert.doesNotMatch(page, /setDoc|updateDoc|addDoc|writeBatch|runTransaction/)
})

test('Phase 5 Reconciliation distinguishes payment balance from evidence discrepancy and adds details review', async () => {
  const page = await readFile('src/pages/PaymentReconciliationPage.jsx', 'utf8')

  assert.match(page, /Compare registration, payment, ticket, attendance, and Operations-related evidence/)
  assert.match(page, /Nothing is changed until you review an available action in the normal audited workflow/)
  assert.match(page, /Selected comparison item/)
  assert.match(page, /Comparison status/)
  assert.match(page, /Payment status stays separate from workbook evidence status/)
  assert.doesNotMatch(page, /setDoc|updateDoc|addDoc|writeBatch|runTransaction/)
})
