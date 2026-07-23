import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEventReadiness } from '../src/utils/eventReadiness.js'

const baseEvent = {
  eventId: 'event-21',
  eventName: 'CODEX_TEST Live Verification Event',
  capacity: 10,
  status: 'planning',
  currency: 'BBD',
}

test('event readiness helper handles no selected event safely', () => {
  const readiness = buildEventReadiness(null, [], [])

  assert.equal(readiness.hasEvent, false)
  assert.equal(readiness.categories.length, 0)
  assert.equal(readiness.actionItems.length, 0)
  assert.equal(readiness.readinessLabel, 'Review')
})

test('event readiness helper keeps an empty event review-only without inventing data', () => {
  const readiness = buildEventReadiness(baseEvent, [], [])

  assert.equal(readiness.hasEvent, true)
  assert.equal(readiness.categories.length, 6)
  assert.equal(readiness.counts.pendingPayments, 0)
  assert.equal(readiness.counts.missingTicket, 0)
  assert.match(readiness.categories.find((category) => category.key === 'registration').summary, /Registration and ticket setup look usable/i)
  assert.equal(readiness.operationsSummary.openEntries, 0)
})

test('event readiness helper flags pending payments as needs attention', () => {
  const readiness = buildEventReadiness(baseEvent, [
    {
      registrationId: 'reg-1',
      fullName: 'Pending Guest',
      personsAttending: 1,
      paymentStatus: 'pending',
      ticketPrice: 100,
      amountDue: 100,
      amountPaid: 0,
      balanceDue: 100,
      ticketStatus: 'no-ticket-assigned',
      ticketCode: null,
    },
  ], [])

  assert.equal(readiness.counts.pendingPayments, 1)
  assert.equal(readiness.categories.find((category) => category.key === 'registration').status, 'needs-attention')
  assert.match(readiness.actionItems.find((item) => item.key === 'pending-payments').summary, /still need payment follow-up/i)
})

test('event readiness helper flags paid registrations missing ticket codes', () => {
  const readiness = buildEventReadiness(baseEvent, [
    {
      registrationId: 'reg-2',
      fullName: 'Paid Guest',
      personsAttending: 1,
      paymentStatus: 'paid',
      ticketPrice: 100,
      amountDue: 100,
      amountPaid: 100,
      balanceDue: 0,
      ticketStatus: 'no-ticket-assigned',
      ticketCode: null,
      email: 'paid@example.com',
    },
  ], [])

  assert.equal(readiness.counts.paidMissingTicket, 1)
  assert.equal(readiness.categories.find((category) => category.key === 'registration').status, 'needs-attention')
  assert.equal(readiness.actionItems.find((item) => item.key === 'missing-tickets').to, '/tickets')
})

test('event readiness helper marks complete ticket assignment as ready', () => {
  const readiness = buildEventReadiness(baseEvent, [
    {
      registrationId: 'reg-3',
      fullName: 'Ready Guest',
      personsAttending: 2,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentEvidenceClass: 'Payment Organizer Confirmed',
      paymentReference: '1stPay-123',
      ticketPrice: 100,
      amountDue: 200,
      amountPaid: 200,
      balanceDue: 0,
      ticketStatus: 'assigned',
      ticketCode: 'GSV-READY1',
      email: 'ready@example.com',
    },
  ], [])

  assert.equal(readiness.counts.missingTicket, 0)
  assert.equal(readiness.categories.find((category) => category.key === 'registration').status, 'ready')
})

test('event readiness helper surfaces operations warnings from existing ledger entries only', () => {
  const readiness = buildEventReadiness(baseEvent, [], [
    { entryType: 'income', status: 'expected', amount: 300, label: 'Sponsor pledge' },
    { entryType: 'expense', status: 'pending', amount: 120, label: 'Decor deposit' },
  ])

  assert.equal(readiness.operationsSummary.openEntries, 2)
  assert.equal(readiness.categories.find((category) => category.key === 'money').status, 'review')
  assert.equal(readiness.actionItems.find((item) => item.key === 'operations-summary').to, '/operations')
})
