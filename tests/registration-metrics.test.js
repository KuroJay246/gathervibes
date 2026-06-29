import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildEventMetrics,
  buildRegistrationMetrics,
  countRegistrationRecords,
  countTotalGuests,
  formatRegistrationGuestSummary,
  getRegistrationGuestSummary,
  normalizePersonsAttending,
} from '../src/utils/registrationMetrics.js'
import { mapRows, parseCSV } from '../src/utils/importUtils.js'

test('shared registration metrics separate registrations from persons attending', () => {
  const metrics = buildRegistrationMetrics([
    { personsAttending: 2, checkedIn: true, paymentStatus: 'paid' },
    { personsAttending: 1, checkedIn: false, paymentStatus: 'pending' },
    { personsAttending: '3', checkedIn: true, paymentStatus: 'complimentary' },
  ], { capacity: 10 })

  assert.equal(metrics.totalRegistrations, 3)
  assert.equal(metrics.totalPersons, 6)
  assert.equal(metrics.checkedInRegistrations, 2)
  assert.equal(metrics.checkedInPersons, 5)
  assert.equal(metrics.remainingRegistrations, 1)
  assert.equal(metrics.remainingPersons, 1)
  assert.equal(metrics.capacityUsed, 6)
  assert.equal(metrics.capacityPercent, 60)
  assert.equal(metrics.paidRegistrations, 1)
  assert.equal(metrics.pendingRegistrations, 1)
  assert.equal(metrics.complimentaryRegistrations, 1)
  assert.equal(metrics.paidPersons, 2)
  assert.equal(metrics.pendingPersons, 1)
  assert.equal(metrics.complimentaryPersons, 3)
})

test('registration and guest count helpers handle empty and missing persons safely', () => {
  const rows = [
    { personsAttending: 2 },
    { personsAttending: null },
    { personsAttending: undefined },
    { personsAttending: '3' },
  ]

  assert.equal(countRegistrationRecords(rows), 4)
  assert.equal(countTotalGuests(rows), 7)
  assert.equal(getRegistrationGuestSummary(rows), '4 registrations / 7 guests')
  assert.equal(getRegistrationGuestSummary([]), '0 registrations / 0 guests')
  assert.equal(formatRegistrationGuestSummary(1, 1), '1 registration / 1 guest')
  assert.equal(formatRegistrationGuestSummary(2, 5), '2 registrations / 5 guests')
  assert.equal(buildEventMetrics(null, rows).eventId, null)
  assert.equal(buildEventMetrics({ eventId: 'event-1', eventName: 'CODEX_TEST' }, rows).totalPersons, 7)
})

test('persons attending normalization defaults blanks and blocks invalid imports', () => {
  assert.equal(normalizePersonsAttending(''), 1)
  assert.equal(normalizePersonsAttending('2'), 2)
  assert.equal(Number.isNaN(normalizePersonsAttending('abc')), true)

  const parsed = parseCSV('Full name,Email,Persons attending\nBad,bad@example.com,abc')
  const rows = mapRows(parsed.rows, parsed.headers, { fullName: 0, email: 1, personsAttending: 2 })

  assert.equal(Number.isNaN(rows[0].personsAttending), true)
})

test('Dashboard and Check-In use shared count wording and helpers', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')

  assert.match(dashboard, /buildRegistrationMetrics/)
  assert.match(checkIn, /formatRegistrationGuestSummary/)
  assert.match(dashboard, /Registrations/)
  assert.match(dashboard, /Persons/)
  assert.match(dashboard, /capacity uses persons attending/)
  assert.match(checkIn, /Total Registrations/)
  assert.match(checkIn, /Total Guests/)
  assert.match(checkIn, /Remaining Guests/)
  assert.match(checkIn, /Some registrations include multiple guests/)
})

test('Check-In page waits for Firestore success and avoids false success on permission denied', async () => {
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const completeIndex = checkIn.indexOf('await completeCheckIn')
  const successIndex = checkIn.indexOf('setMessage(`${registrationDisplayName(selectedRegistration)} checked in successfully.`)')

  assert.ok(completeIndex > -1)
  assert.ok(successIndex > completeIndex)
  assert.match(checkIn, /Check-in was not saved because Firestore denied the write/)
  assert.doesNotMatch(checkIn.slice(completeIndex, successIndex), /set[A-Z][A-Za-z]*\([^)]*checkedIn/)
})

test('Check-In page labels undo and clear actions truthfully', async () => {
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const undoIndex = checkIn.indexOf('await undoCheckIn')
  const undoSuccessIndex = checkIn.indexOf('setMessage(`Check-in undone for ${registrationDisplayName(selectedRegistration)}.`)')

  assert.match(checkIn, /Undo Check-In/)
  assert.match(checkIn, /Clear Selected Guest/)
  assert.doesNotMatch(checkIn, />\\s*Reset\\s*</)
  assert.match(checkIn, /Undo check-in for this guest\? This should only be used if the check-in was accidental\./)
  assert.match(checkIn, /Undo check-in was not saved because Firestore denied the write/)
  assert.ok(undoIndex > -1)
  assert.ok(undoSuccessIndex > undoIndex)
})

test('production count diagnostic is read-only and uses shared metrics', async () => {
  const script = await readFile('scripts/admin/verifyProductionCounts.mjs', 'utf8')
  const pkg = JSON.parse(await readFile('package.json', 'utf8'))

  assert.equal(pkg.scripts['admin:verify-production-counts'], 'node scripts/admin/verifyProductionCounts.mjs')
  assert.match(script, /buildRegistrationMetrics/)
  assert.match(script, /totalRegistrations/)
  assert.match(script, /totalPersons/)
  assert.match(script, /capacityPercent/)
  assert.doesNotMatch(script, /\.set\(/)
  assert.doesNotMatch(script, /\.update\(/)
  assert.doesNotMatch(script, /\.delete\(/)
})
