import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildFinanceSummary,
  buildPaymentsWorkspace,
  calculateRegistrationFinance,
  classifyRegistrationFinance,
  paymentFilterMatches,
} from '../src/utils/financeUtils.js'
import { buildEventReview } from '../src/utils/eventReview.js'
import { buildInitialFieldMap, mapRows, parseCSV } from '../src/utils/importUtils.js'
import { formatPaymentLabel, normalizePaymentStatus, PAYMENT_STATUSES } from '../src/utils/paymentStatus.js'
import { validateRegistration } from '../src/utils/validators.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const event = {
  eventId: 'xPfa0b3KZyLSDnAD2uGI',
  eventName: 'CODEX_TEST Live Verification Event',
  currency: 'BBD',
  capacity: 100,
}

function syntheticRegistrations() {
  return [
    { registrationId: 'paid', fullName: 'QA_PAYMENT_STATUS_AUDIT_Paid', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', paymentMethod: 'bank-transfer', paymentReference: 'QA-PAID' },
    { registrationId: 'pending', fullName: 'QA_PAYMENT_STATUS_AUDIT_Pending', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentMethod: 'unknown' },
    { registrationId: 'partial', fullName: 'QA_PAYMENT_STATUS_AUDIT_Partial', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 40, balanceDue: 60, paymentStatus: 'pending', paymentMethod: 'firstpay', paymentReference: 'QA-PARTIAL' },
    { registrationId: 'door-list', fullName: 'QA_PAYMENT_STATUS_AUDIT_ToPayAtDoor', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'door-list', paymentMethod: 'door' },
    { registrationId: 'door-list-deposit', fullName: 'QA_PAYMENT_STATUS_AUDIT_ToPayAtDoorDeposit', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 40, balanceDue: 60, paymentStatus: 'door-list', paymentMethod: 'door', paymentReference: 'QA-DOOR-DEPOSIT' },
    { registrationId: 'door-paid', fullName: 'QA_PAYMENT_STATUS_AUDIT_DoorPaid', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'door', paymentMethod: 'cash', paymentReference: 'QA-DOOR-PAID' },
    { registrationId: 'complimentary', fullName: 'QA_PAYMENT_STATUS_AUDIT_Complimentary', personsAttending: 1, ticketPrice: 0, amountDue: 0, amountPaid: 0, balanceDue: 0, paymentStatus: 'complimentary', paymentMethod: 'complimentary' },
    { registrationId: 'unknown', fullName: 'QA_PAYMENT_STATUS_AUDIT_Unknown', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'unknown', paymentMethod: 'unknown' },
  ]
}

test('Phase 23D-0 stored status and display label contract distinguishes derived partial and door states', () => {
  assert.deepEqual(PAYMENT_STATUSES, ['paid', 'pending', 'complimentary', 'door', 'door-list', 'unknown'])
  assert.equal(normalizePaymentStatus('Partial'), 'pending')
  assert.equal(normalizePaymentStatus('Partially paid'), 'pending')
  assert.equal(normalizePaymentStatus('Door Paid'), 'door')
  assert.equal(normalizePaymentStatus('To Pay at Door'), 'door-list')
  assert.equal(formatPaymentLabel('door'), 'Door Paid')
  assert.equal(formatPaymentLabel('door-list'), 'To Pay at Door')
  assert.deepEqual(validateRegistration({ fullName: 'QA', personsAttending: 1, paymentStatus: 'pending', ticketPrice: 100, amountPaid: 40, balanceDue: 60 }), {})
})

test('Phase 23D-0 payment status behavior preserves money evidence and method separation', () => {
  const paid = calculateRegistrationFinance({ paymentStatus: 'paid', paymentMethod: 'bank-transfer', ticketPrice: 100, amountPaid: 100, personsAttending: 1 }, event)
  const partial = calculateRegistrationFinance({ paymentStatus: 'pending', paymentMethod: 'firstpay', ticketPrice: 100, amountPaid: 40, personsAttending: 1 }, event)
  const doorListDeposit = calculateRegistrationFinance({ paymentStatus: 'door-list', paymentMethod: 'door', ticketPrice: 100, amountPaid: 40, personsAttending: 1 }, event)
  const doorPaid = calculateRegistrationFinance({ paymentStatus: 'door', paymentMethod: 'cash', ticketPrice: 100, amountPaid: 100, balanceDue: 0, personsAttending: 1 }, event)

  assert.equal(paid.amountPaid, 100)
  assert.equal(paid.paymentMethod, 'bank-transfer')
  assert.equal(partial.amountPaid, 40)
  assert.equal(partial.balanceDue, 60)
  assert.equal(doorListDeposit.paymentStatus, 'door-list')
  assert.equal(doorListDeposit.amountPaid, 40)
  assert.equal(doorListDeposit.balanceDue, 60)
  assert.equal(doorPaid.paymentStatus, 'door')
  assert.equal(doorPaid.paymentMethod, 'cash')
  assert.equal(doorPaid.amountPaid, 100)
  assert.equal(doorPaid.balanceDue, 0)
})

test('Phase 23D-0 Payments filters and follow-up handle Door Paid versus To Pay at Door', () => {
  const workspace = buildPaymentsWorkspace(syntheticRegistrations(), event)
  const byId = Object.fromEntries(workspace.rows.map((row) => [row.registrationId, row]))

  assert.equal(byId['door-paid'].displayStatus, 'Door Paid')
  assert.equal(byId['door-paid'].needsFollowUp, false)
  assert.equal(byId['door-paid'].dataReviewRequired, false)
  assert.equal(paymentFilterMatches(byId['door-paid'], 'door'), true)
  assert.equal(paymentFilterMatches(byId['door-paid'], 'paid'), true)
  assert.equal(paymentFilterMatches(byId['door-paid'], 'payment-follow-up'), false)

  assert.equal(byId['door-list'].displayStatus, 'To Pay at Door')
  assert.equal(byId['door-list'].needsFollowUp, true)
  assert.equal(paymentFilterMatches(byId['door-list'], 'door'), true)
  assert.equal(paymentFilterMatches(byId['door-list'], 'paid'), false)

  assert.equal(byId['door-list-deposit'].amountPaid, 40)
  assert.equal(byId['door-list-deposit'].balanceDue, 60)
  assert.equal(byId['door-list-deposit'].needsFollowUp, true)
  assert.equal(paymentFilterMatches(byId.partial, 'partial'), true)
  assert.equal(byId.complimentary.displayStatus, 'Complimentary')
  assert.equal(byId.complimentary.needsFollowUp, false)
  assert.equal(paymentFilterMatches(byId.complimentary, 'payment-follow-up'), false)

  assert.equal(workspace.summary.registrationCount, 8)
  assert.equal(workspace.summary.recordedPayments, 280)
  assert.equal(workspace.summary.outstandingBalance, 420)
  assert.equal(workspace.summary.paidRegistrations, 2)
  assert.equal(workspace.summary.partialPaymentRegistrations, 1)
  assert.equal(workspace.summary.doorPaidRegistrations, 1)
  assert.equal(workspace.summary.doorListRegistrations, 2)
  assert.equal(workspace.filterCounts.paid, 2)
  assert.equal(workspace.filterCounts.door, 3)
  assert.equal(workspace.filterCounts['data-review'], 0)
  assert.equal(workspace.filterCounts['needs-follow-up'], 5)
})

test('Phase 23D-0 Overview and Reports finance totals align with Payments workspace', () => {
  const registrations = syntheticRegistrations()
  const workspace = buildPaymentsWorkspace(registrations, event)
  const overview = buildFinanceSummary(registrations, event)
  const report = buildEventReview(event, registrations, [])

  assert.equal(overview.totalExpected, workspace.summary.expectedRegistrationIncome)
  assert.equal(overview.totalCollected, workspace.summary.recordedPayments)
  assert.equal(overview.totalOutstanding, workspace.summary.outstandingBalance)
  assert.equal(report.paymentReview.registrationRecords.expectedIncome, workspace.summary.expectedRegistrationIncome)
  assert.equal(report.paymentReview.registrationRecords.collectedAmount, workspace.summary.recordedPayments)
  assert.equal(report.paymentReview.registrationRecords.outstandingAmount, workspace.summary.outstandingBalance)
  assert.equal(report.paymentReview.registrationRecords.partialPaymentCount, 1)
  assert.equal(report.paymentReview.registrationRecords.doorPaidCount, 1)
  assert.equal(report.paymentReview.registrationRecords.doorListCount, 2)
  assert.ok(report.followUp.items.some((item) => item.key === 'payment-review'))
})

test('Phase 23D-0 import normalization matches manual editor status contract', () => {
  const parsed = parseCSV([
    'Full Name,Payment Status,Ticket Price,Amount Paid,Persons Attending',
    'Paid Guest,Paid – Confirmed,100,100,1',
    'Pending Guest,Pending,100,0,1',
    'Partial Guest,Partial,100,40,1',
    'Door List Guest,To Pay at Door,100,0,1',
    'Door Paid Guest,Door Paid,100,100,1',
    'Comp Guest,Complimentary,0,0,1',
    'Unknown Guest,Unknown,100,0,1',
  ].join('\n'))
  const rows = mapRows(parsed.rows, parsed.headers, buildInitialFieldMap(parsed.headers), { importBatchId: 'phase23d0', event })

  assert.deepEqual(rows.map((row) => row.paymentStatus), ['paid', 'pending', 'pending', 'door-list', 'door', 'complimentary', 'unknown'])
})

test('Phase 23D-0 registration update writes remain registration plus audit only', async () => {
  const service = await readFile('src/services/registrationService.js', 'utf8')
  const form = await readFile('src/components/registrations/RegistrationFormModal.jsx', 'utf8')
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')

  assert.match(service, /batch\.update\(regRef/)
  assert.match(service, /batch\.set\(audit\.ref, audit\.data\)/)
  assert.doesNotMatch(service, /operationsLedger|createLedgerEntry|collection\(firestore, 'operations'/)
  assert.match(form, /validPaymentStatuses\.map/)
  assert.match(paymentsPage, /Payment Follow-Up/)
  assert.match(paymentsPage, /Data Review/)
  assert.equal(qrPayloadForTicketCode('PH23D0-001'), 'GSV:TICKET:PH23D0-001')
})

test('Phase 23D-0 classification flags invalid Door Paid and derives Partial rows from amounts', () => {
  const badDoor = classifyRegistrationFinance({ paymentStatus: 'door', ticketPrice: 100, amountPaid: 0, balanceDue: 100, personsAttending: 1 }, event)
  const derivedPartial = classifyRegistrationFinance({ paymentStatus: 'pending', ticketPrice: 100, amountPaid: 40, balanceDue: 60, personsAttending: 1 }, event)

  assert.equal(badDoor.needsFollowUp, true)
  assert.ok(badDoor.warnings.some((warning) => warning.code === 'door-missing-paid-amount'))
  assert.equal(derivedPartial.statusGroup, 'partial')
  assert.equal(derivedPartial.displayStatus, 'Partial payment')
  assert.equal(derivedPartial.needsFollowUp, true)
})
