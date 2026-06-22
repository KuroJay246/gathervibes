import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  canCompleteCheckIn,
  canTransitionTicketStatus,
  checkInWarnings,
  generateTicketCode,
  normalizeTicketCode,
  searchableRegistrationText,
  validateTicketCode,
} from '../src/utils/ticketUtils.js'

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
  assert.match(validateTicketCode('bad', existing, 'reg-b'), /format/)
  assert.match(validateTicketCode('GSV-ABC234', existing, 'reg-b'), /already assigned/)
  assert.equal(validateTicketCode('GSV-ABC234', existing, 'reg-a'), '')
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
  assert.match(service, /action: 'checkin\.duplicate-attempt'/)
})

test('Firestore rules include ticket and check-in fields and actions', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  for (const field of ['ticketCode', 'ticketAssignedAt', 'ticketAssignedBy', 'checkedInBy']) {
    assert.match(rules, new RegExp(field))
  }

  for (const action of ['ticket.assign', 'ticket.unassign', 'ticket.regenerate', 'checkin.complete', 'checkin.duplicate-attempt']) {
    assert.match(rules, new RegExp(action.replace('.', '\\.')))
  }

  assert.match(rules, /allow update, delete: if false/)
  assert.ok(rules.includes('match /communications/{documentId}'))
  assert.ok(rules.includes('match /aiDrafts/{documentId}'))
})
