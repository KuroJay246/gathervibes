import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildEventDaySummary,
  formatDoorStatus,
  formatEventDayCsv,
  formatPaymentLabel,
  formatTicketStatus,
  getDoorListRegistrations,
  getMissingTicketRegistrations,
  getPendingPaymentRegistrations,
} from '../src/utils/eventDayUtils.js'

const sampleRegistrations = [
  {
    registrationId: 'reg-b',
    fullName: 'Beta Guest',
    groupName: 'Group B',
    personsAttending: 2,
    paymentStatus: 'pending',
    ticketCode: '',
    checkedIn: false,
  },
  {
    registrationId: 'reg-a',
    fullName: 'Alpha Guest',
    groupName: 'Group A',
    personsAttending: 1,
    paymentStatus: 'paid',
    ticketCode: 'CT-001',
    checkedIn: true,
  },
  {
    registrationId: 'reg-c',
    fullName: 'Comp Guest',
    groupName: '',
    personsAttending: 1,
    paymentStatus: 'complimentary',
    ticketCode: 'CT-002',
    checkedIn: false,
  },
]

test('event-day summary includes registrations, persons, payments, and ticket coverage', () => {
  const summary = buildEventDaySummary(sampleRegistrations)

  assert.equal(summary.totalRegistrations, 3)
  assert.equal(summary.totalPersons, 4)
  assert.equal(summary.checkedInRegistrations, 1)
  assert.equal(summary.checkedInPersons, 1)
  assert.equal(summary.remainingRegistrations, 2)
  assert.equal(summary.remainingPersons, 3)
  assert.equal(summary.paidRegistrations, 1)
  assert.equal(summary.pendingRegistrations, 1)
  assert.equal(summary.complimentaryRegistrations, 1)
  assert.equal(summary.ticketAssignedRegistrations, 2)
  assert.equal(summary.missingTicketRegistrations, 1)
  assert.equal(summary.qrLookupReady, true)
  assert.equal(summary.manualLookupReady, true)
})

test('event-day helper lists isolate missing tickets and pending payments', () => {
  assert.deepEqual(getMissingTicketRegistrations(sampleRegistrations).map((row) => row.registrationId), ['reg-b'])
  assert.deepEqual(getPendingPaymentRegistrations(sampleRegistrations).map((row) => row.registrationId), ['reg-b'])
  assert.deepEqual(getDoorListRegistrations(sampleRegistrations).map((row) => row.fullName), ['Alpha Guest', 'Beta Guest', 'Comp Guest'])
})

test('event-day labels are plain and operator-friendly', () => {
  assert.equal(formatTicketStatus(sampleRegistrations[0]), 'No ticket assigned')
  assert.equal(formatTicketStatus(sampleRegistrations[1]), 'Ticket assigned')
  assert.equal(formatDoorStatus(sampleRegistrations[0]), 'Not checked in')
  assert.equal(formatDoorStatus(sampleRegistrations[1]), 'Checked in')
  assert.equal(formatPaymentLabel('pending'), 'Pending payment')
  assert.equal(formatPaymentLabel('paid'), 'Paid')
  assert.equal(formatPaymentLabel('complimentary'), 'Complimentary')
})

test('event-day CSV export is client-side text and includes status labels', () => {
  const csv = formatEventDayCsv(sampleRegistrations, { eventName: 'CODEX_TEST Live Verification Event' })

  assert.match(csv, /Event,Full name,Group name,Persons attending,Payment status,Ticket code,Ticket status,Check-in status/)
  assert.match(csv, /CODEX_TEST Live Verification Event,Beta Guest,Group B,2,Pending payment,,No ticket assigned,Not checked in/)
  assert.match(csv, /CODEX_TEST Live Verification Event,Alpha Guest,Group A,1,Paid,CT-001,Ticket assigned,Checked in/)
  assert.doesNotMatch(csv, /upload|storage|cloud functions/i)
})

test('Check-In page exposes event-day mode, helper lists, and clear QR feedback states', async () => {
  const checkInPage = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const scanner = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')

  assert.match(checkInPage, /Event-Day Mode/)
  assert.match(checkInPage, /Door Check-In \/ QR Scan/)
  assert.match(checkInPage, /Print and export door lists/)
  assert.match(checkInPage, /Copy CSV text/)
  assert.match(checkInPage, /Missing tickets/)
  assert.match(checkInPage, /Pending payment/)
  assert.match(checkInPage, /checked in successfully/)
  assert.match(scanner, /Scanning\.\.\./)
  assert.match(scanner, /No matching ticket code/)
  assert.match(scanner, /already checked in/)
  assert.match(scanner, /Camera unavailable or permission denied/)
  assert.match(scanner, /manual ticket lookup/)
})

test('Dashboard includes event-day command links without enabling deferred integrations', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')

  assert.match(dashboard, /Event-day command center/)
  assert.match(dashboard, /Check-In \/ QR Scan/)
  assert.match(dashboard, /Tickets \/ QR Print List/)
  assert.match(dashboard, /Communications/)
  assert.match(dashboard, /Import Center/)
  assert.match(dashboard, /QA Center/)
  assert.doesNotMatch(dashboard, /Gmail|Outlook|Google Sheets|Cloud Functions|Storage/)
})
