import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  canCompleteCheckIn,
  canTransitionTicketStatus,
  checkInWarnings,
  buildTicketPrefix,
  findTicketCodeDuplicate,
  generateSequentialTicketCode,
  generateTicketCode,
  getTicketPrefix,
  normalizeTicketPrefix,
  normalizeTicketCode,
  searchableRegistrationText,
  validateTicketCode,
} from '../src/utils/ticketUtils.js'
import { buildCheckInSummary, filterCheckInRegistrations } from '../src/utils/checkInUtils.js'
import {
  getSafePriceTiers,
  getSafeTicketPrice,
  getWorkingEventDisplayName,
  hasSelectedWorkingEvent,
} from '../src/utils/eventDefaults.js'

test('ticket code generation is readable, unique, and privacy-safe', () => {
  const code = generateTicketCode(new Set(), () => 0)

  assert.equal(code, 'GSV-AAAAAA')
  assert.doesNotMatch(code, /@|555|test/i)
})

test('ticket code generation avoids existing event codes', () => {
  let calls = 0
  const code = generateTicketCode(new Set(['GSV-AAAAAA']), () => {
    calls += 1
    return calls <= 6 ? 0 : 0.5
  })

  assert.notEqual(code, 'GSV-AAAAAA')
  assert.match(code, /^GSV-[A-HJ-NP-Z2-9]{6}$/)
})

test('ticket assignment validation rejects invalid and duplicate codes', () => {
  const existing = [
    { registrationId: 'reg-a', ticketCode: 'GSV-ABC234' },
    { registrationId: 'reg-b', ticketCode: null },
  ]

  assert.equal(normalizeTicketCode(' gsv-abc234 '), 'GSV-ABC234')
  assert.equal(validateTicketCode('bad', existing, 'reg-b'), '')
  assert.equal(validateTicketCode('001', existing, 'reg-b'), '')
  assert.equal(validateTicketCode('CPB DOOR 001', existing, 'reg-b'), '')
  assert.match(validateTicketCode('bad<script>', existing, 'reg-b'), /letters/)
  assert.match(validateTicketCode('GSV-ABC234', existing, 'reg-b'), /already assigned/)
  assert.equal(validateTicketCode('CPB-001', existing, 'reg-b'), '')
  assert.equal(validateTicketCode('GSV-ABC234', existing, 'reg-a'), '')
})

test('event-style ticket prefix and sequential generation use selected event context', () => {
  assert.equal(buildTicketPrefix({ eventName: 'CPB' }), 'CPB')
  assert.equal(buildTicketPrefix({ eventName: 'Cake Picnic Barbados' }), 'CPB')
  assert.equal(generateSequentialTicketCode(['CPB-001', 'CPB-003'], { eventName: 'CPB' }), 'CPB-004')
  assert.equal(generateSequentialTicketCode(['CPB-001', 'CPB-002'], { eventName: 'Cake Picnic Barbados' }), 'CPB-003')
})

test('ticket prefix helpers fall back safely for null clean-browser state', () => {
  assert.equal(normalizeTicketPrefix(null), 'GSV')
  assert.equal(normalizeTicketPrefix(undefined), 'GSV')
  assert.equal(normalizeTicketPrefix(''), 'GSV')
  assert.equal(normalizeTicketPrefix('cake picnic barbados'), 'CPB')
  assert.equal(getTicketPrefix(null), 'GSV')
  assert.equal(getTicketPrefix({ ticketPrefix: null, eventName: null }), 'GSV')
  assert.equal(buildTicketPrefix(null), 'GSV')
  assert.equal(generateSequentialTicketCode([], null), 'GSV-001')
})

test('event default helpers return clean selected-event fallbacks', () => {
  assert.deepEqual(getSafePriceTiers(null), [])
  assert.deepEqual(getSafePriceTiers({ priceTiers: null }), [])
  assert.deepEqual(getSafePriceTiers({ priceTiers: [{ name: 'General', price: 75 }] }), [{ name: 'General', price: 75 }])
  assert.equal(getSafeTicketPrice(null), null)
  assert.equal(getSafeTicketPrice({ ticketPrice: null }), null)
  assert.equal(getSafeTicketPrice({ ticketPrice: '75.50' }), 75.5)
  assert.equal(hasSelectedWorkingEvent(null), false)
  assert.equal(hasSelectedWorkingEvent({ eventId: 'event-1' }), true)
  assert.equal(getWorkingEventDisplayName(null), 'No selected Working Event')
})

test('ticket status transitions stay controlled', () => {
  assert.equal(canTransitionTicketStatus('no-ticket-assigned', 'assigned'), true)
  assert.equal(canTransitionTicketStatus('assigned', 'no-ticket-assigned'), true)
  assert.equal(canTransitionTicketStatus('assigned', 'partially-assigned'), false)
})

test('check-in transition allows false to true and blocks duplicates', () => {
  assert.deepEqual(canCompleteCheckIn({ checkedIn: false }), { allowed: true, reason: '' })
  assert.equal(canCompleteCheckIn({ checkedIn: true }).allowed, false)
})

test('checked-in summary counts registrations and persons attending', () => {
  const summary = buildCheckInSummary([
    { checkedIn: true, personsAttending: 2, paymentStatus: 'paid' },
    { checkedIn: true, personsAttending: 1, paymentStatus: 'complimentary' },
    { checkedIn: false, personsAttending: 3, paymentStatus: 'pending' },
  ])

  assert.equal(summary.totalRegistrations, 3)
  assert.equal(summary.totalPersons, 6)
  assert.equal(summary.checkedInRegistrations, 2)
  assert.equal(summary.checkedInPersons, 3)
  assert.equal(summary.notCheckedInRegistrations, 1)
  assert.equal(summary.notCheckedInPersons, 3)
  assert.equal(summary.paidCheckedIn, 1)
  assert.equal(summary.complimentaryCheckedIn, 1)
  assert.equal(filterCheckInRegistrations([{ checkedIn: true }, { checkedIn: false }], 'checked-in').length, 1)
})

test('undo check-in moves guest back to not checked in counts and tabs', () => {
  const before = buildCheckInSummary([
    { checkedIn: true, personsAttending: 2, paymentStatus: 'complimentary' },
    { checkedIn: false, personsAttending: 1, paymentStatus: 'pending' },
  ])
  const after = buildCheckInSummary([
    { checkedIn: false, personsAttending: 2, paymentStatus: 'complimentary' },
    { checkedIn: false, personsAttending: 1, paymentStatus: 'pending' },
  ])
  const rows = [
    { registrationId: 'reg-1', checkedIn: false },
    { registrationId: 'reg-2', checkedIn: true },
  ]

  assert.equal(before.checkedInRegistrations, 1)
  assert.equal(before.checkedInPersons, 2)
  assert.equal(after.checkedInRegistrations, 0)
  assert.equal(after.checkedInPersons, 0)
  assert.equal(after.remainingRegistrations, 2)
  assert.equal(after.remainingPersons, 3)
  assert.deepEqual(filterCheckInRegistrations(rows, 'checked-in').map((row) => row.registrationId), ['reg-2'])
  assert.deepEqual(filterCheckInRegistrations([{ registrationId: 'reg-1', checkedIn: false }], 'not-checked-in').map((row) => row.registrationId), ['reg-1'])
})

test('ticket code duplicate helper blocks existing and imported batch duplicates', () => {
  assert.match(
    findTicketCodeDuplicate([{ ticketCode: 'CPB-001' }], [], { ticketCode: 'cpb-001' }),
    /Duplicate ticket code/,
  )
  assert.match(
    findTicketCodeDuplicate([], [{ row: { ticketCode: 'CPB-002' } }], { ticketCode: 'CPB-002' }),
    /Duplicate ticket code in import batch/,
  )
  assert.equal(findTicketCodeDuplicate([], [], { ticketCode: 'CPB-003' }), null)
})

test('check-in warnings flag pending payments and missing ticket codes', () => {
  const warnings = checkInWarnings({ paymentStatus: 'pending', ticketCode: null })

  assert.ok(warnings.includes('No ticket code is assigned.'))
  assert.ok(warnings.includes('Payment is not marked paid.'))
})

test('ticket code search includes name, email, phone, and ticket code', () => {
  const text = searchableRegistrationText({
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '2465550100',
    ticketCode: 'GSV-ABC123',
  })

  assert.ok(text.includes('jane doe'))
  assert.ok(text.includes('jane@example.com'))
  assert.ok(text.includes('2465550100'))
  assert.ok(text.includes('gsv-abc123'))
})

test('ticket and check-in services create registration audit actions', async () => {
  const service = await readFile('src/services/ticketService.js', 'utf8')

  assert.match(service, /action = 'ticket\.assign'/)
  assert.match(service, /action: 'ticket\.unassign'/)
  assert.match(service, /action,\s+targetType: 'registration'/)
  assert.match(service, /action: 'checkin\.complete'/)
  assert.match(service, /action: 'checkin\.undo'/)
  assert.match(service, /action: 'checkin\.duplicate-attempt'/)
  assert.match(service, /checkedIn:\s+true/)
  assert.match(service, /checkInTime:\s+serverTimestamp\(\)/)
  assert.match(service, /checkedInBy:\s+performedBy\(user\)/)
  assert.doesNotMatch(service, /preserveRegistrationForCheckIn/)
  assert.doesNotMatch(service, /personsAttending:\s+Number\(registration\.personsAttending\)/)
})

test('Tickets and Check-In pages keep selected-event empty states ahead of event-specific fields', async () => {
  const ticketsPage = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const checkInPage = await readFile('src/pages/CheckInPage.jsx', 'utf8')

  assert.match(ticketsPage, /if \(!activeEvent\?\.eventId\)/)
  assert.match(ticketsPage, /Select a Working Event before assigning ticket codes/)
  assert.match(ticketsPage, /getTicketPrefix\(activeEvent\)/)
  assert.doesNotMatch(ticketsPage, /buildTicketPrefix\(activeEvent\)/)
  assert.match(checkInPage, /if \(!activeEvent\?\.eventId\)/)
  assert.match(checkInPage, /Select a Working Event before opening the door check-in screen/)
})

test('Firestore rules include ticket and check-in fields and actions', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  for (const field of ['ticketCode', 'ticketAssignedAt', 'ticketAssignedBy', 'checkedInBy']) {
    assert.match(rules, new RegExp(field))
  }

  for (const action of ['ticket.assign', 'ticket.unassign', 'ticket.regenerate', 'checkin.complete', 'checkin.undo', 'checkin.duplicate-attempt']) {
    assert.match(rules, new RegExp(action.replace('.', '\\.')))
  }

  assert.match(rules, /allow update, delete: if false/)
  assert.match(rules, /hasImportedTicketCode/)
  assert.match(rules, /isCheckInCompletionUpdate\(registrationId\)/)
  assert.match(rules, /isCheckInUndoUpdate\(registrationId\)/)
  assert.match(rules, /checkInCompletionChangedKeysOnly/)
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[/)
  assert.match(rules, /'checkedIn', 'checkInTime', 'checkedInBy', 'updatedAt'/)
  assert.ok(rules.includes('match /communications/{documentId}'))
  assert.ok(rules.includes('match /aiDrafts/{documentId}'))
})
