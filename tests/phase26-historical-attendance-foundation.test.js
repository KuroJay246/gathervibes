import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  attendanceRecordHelp,
  attendanceRecordLabel,
  deriveAttendanceRecordType,
  historicalAttendancePayload,
} from '../src/utils/attendanceUtils.js'
import { buildRegistrationMetrics } from '../src/utils/registrationMetrics.js'
import { validateRegistration } from '../src/utils/validators.js'

test('historical attendance is distinct from scanner-confirmed check-in', () => {
  const scannerRow = { checkedIn: true, checkInTime: new Date(), checkedInBy: 'scanner@example.com' }
  const historicalRow = {
    checkedIn: false,
    attendanceRecordType: 'organizer-confirmed-historical',
    attendanceEvidenceNote: 'Organizer reviewed door sheet after event.',
  }

  assert.equal(deriveAttendanceRecordType(scannerRow), 'scanner-confirmed')
  assert.equal(attendanceRecordLabel(scannerRow), 'Scanner-confirmed check-in')
  assert.equal(deriveAttendanceRecordType(historicalRow), 'organizer-confirmed-historical')
  assert.equal(attendanceRecordLabel(historicalRow), 'Organizer-confirmed historical attendance')
  assert.match(attendanceRecordHelp(historicalRow), /not a QR scan or live system check-in/)
})

test('historical attendance does not inflate checked-in totals', () => {
  const metrics = buildRegistrationMetrics([
    { registrationId: 'live', checkedIn: true, personsAttending: 2 },
    {
      registrationId: 'historical',
      checkedIn: false,
      personsAttending: 3,
      attendanceRecordType: 'organizer-confirmed-historical',
      attendanceEvidenceNote: 'Organizer evidence only.',
    },
  ])

  assert.equal(metrics.totalRegistrations, 2)
  assert.equal(metrics.totalPersons, 5)
  assert.equal(metrics.checkedInRegistrations, 1)
  assert.equal(metrics.checkedInPersons, 2)
  assert.equal(metrics.remainingRegistrations, 1)
  assert.equal(metrics.remainingPersons, 3)
})

test('registration validation blocks ambiguous historical attendance records', () => {
  assert.equal(validateRegistration({
    fullName: 'Historical Guest',
    personsAttending: 1,
    paymentStatus: 'paid',
    attendanceRecordType: 'organizer-confirmed-historical',
    attendanceEvidenceNote: 'Organizer confirmed from written attendance sheet.',
    checkedIn: false,
  }).attendanceRecordType, undefined)

  assert.match(validateRegistration({
    fullName: 'Bad Historical Guest',
    personsAttending: 1,
    paymentStatus: 'paid',
    attendanceRecordType: 'organizer-confirmed-historical',
    checkedIn: false,
  }).attendanceEvidenceNote, /requires an evidence note/)

  assert.match(validateRegistration({
    fullName: 'Confused Guest',
    personsAttending: 1,
    paymentStatus: 'paid',
    attendanceRecordType: 'organizer-confirmed-historical',
    attendanceEvidenceNote: 'Organizer evidence.',
    checkedIn: true,
  }).attendanceRecordType, /separate from live check-in/)
})

test('historical attendance service is audited and never changes checkedIn', async () => {
  const service = await readFile('src/services/registrationService.js', 'utf8')
  const card = await readFile('src/components/registrations/RegistrationCard.jsx', 'utf8')

  assert.match(service, /export async function recordHistoricalAttendance/)
  assert.match(service, /action:\s+'registration\.attendance-update'/)
  assert.match(service, /if \(registration\.checkedIn\) throw new Error/)
  assert.doesNotMatch(service.slice(service.indexOf('export async function recordHistoricalAttendance')), /checkedIn:\s+true/)
  assert.match(card, /attendanceRecordLabel/)
})

test('Firestore rules validate event capabilities and isolate scanner attendance permissions', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(rules, /function validEventCapabilities/)
  assert.match(rules, /'birthday', 'bridal-shower', 'wedding', 'workshop'/)
  assert.match(rules, /'eventCapabilities'/)
  assert.match(rules, /function isHistoricalAttendanceUpdate/)
  assert.match(rules, /registration\.attendance-update/)
  assert.match(rules, /request\.resource\.data\.attendanceRecordType == 'organizer-confirmed-historical'/)
  assert.match(rules, /resource\.data\.checkedIn == false/)

  const scannerAllow = rules.slice(rules.indexOf('isAssignedScanner(resource.data.eventId)'), rules.indexOf('match /auditLogs/{logId}'))
  assert.doesNotMatch(scannerAllow, /isHistoricalAttendanceUpdate/)
  assert.doesNotMatch(scannerAllow, /attendanceRecordType/)
})

test('historical attendance payload records evidence without inventing scan data', () => {
  assert.deepEqual(historicalAttendancePayload('Confirmed from door sheet.', 'organizer@example.com'), {
    attendanceRecordType: 'organizer-confirmed-historical',
    attendanceConfirmedBy: 'organizer@example.com',
    attendanceEvidenceNote: 'Confirmed from door sheet.',
  })
})
