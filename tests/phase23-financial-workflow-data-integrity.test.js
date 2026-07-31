import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildPaymentsWorkspace,
  classifyRegistrationFinance,
} from '../src/utils/financeUtils.js'
import { buildEventReview } from '../src/utils/eventReview.js'
import {
  OPERATIONS_ENTRY_EFFECTS,
  buildOperationsSettlementSummary,
  operationsEntryEffect,
} from '../src/utils/operationsReport.js'
import { buildPaymentReconciliationPreview } from '../src/utils/paymentReconciliation.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const event = {
  eventId: 'phase23-financial-integrity',
  eventName: 'Phase 23 Financial Integrity',
  currency: 'BBD',
  capacity: 100,
}

function workbookSheet(rows) {
  return {
    headers: [
      'Ticket/Door ID',
      'Guest Name',
      'Buyer/Contact',
      'Email/Phone',
      'Price Tier',
      'Unit Price',
      'Amount Paid Confirmed',
      'Expected Total',
      'Balance/Due',
      'Payment Status',
      'Evidence Summary',
      'Confidence',
    ],
    rows: rows.map((data, index) => ({ data, sourceRowNumber: index + 2 })),
  }
}

test('registration payment truth table derives due, received, balance, and organizer status labels', () => {
  const rows = [
    { registrationId: 'paid', fullName: 'Paid Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 100, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'FP-1' },
    { registrationId: 'partial', fullName: 'Partial Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 50, paymentStatus: 'pending', paymentMethod: 'firstpay', paymentReference: 'FP-2' },
    { registrationId: 'unpaid', fullName: 'Unpaid Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 0, paymentStatus: 'pending' },
    { registrationId: 'zero', fullName: 'Zero Guest', personsAttending: 1, ticketPrice: 0, amountDue: 0, amountPaid: 0, paymentStatus: 'paid' },
    { registrationId: 'comp', fullName: 'Comp Guest', personsAttending: 1, ticketPrice: 0, amountDue: 0, amountPaid: 0, paymentStatus: 'complimentary', paymentMethod: 'complimentary' },
    { registrationId: 'overpaid', fullName: 'Overpaid Guest', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 120, paymentStatus: 'paid' },
  ]

  const workspace = buildPaymentsWorkspace(rows, event)
  const byId = Object.fromEntries(workspace.rows.map((row) => [row.registrationId, row]))
  const overpaid = classifyRegistrationFinance(rows[5], event)

  assert.equal(workspace.summary.expectedRegistrationIncome, 400)
  assert.equal(workspace.summary.recordedPayments, 270)
  assert.equal(workspace.summary.outstandingBalance, 150)
  assert.equal(byId.partial.displayStatus, 'Partially Paid')
  assert.equal(byId.unpaid.displayStatus, 'Unpaid')
  assert.equal(byId.comp.displayStatus, 'Complimentary')
  assert.equal(byId.comp.displayBalanceDue, 0)
  assert.ok(overpaid.warnings.some((warning) => warning.code === 'overpaid'))
  assert.equal(overpaid.dataReviewRequired, true)
})

test('invalid negative registration money remains a blocking finance review defect', () => {
  const invalid = classifyRegistrationFinance({
    registrationId: 'negative',
    fullName: 'Negative Amount',
    personsAttending: 1,
    ticketPrice: 100,
    amountDue: -100,
    amountPaid: -5,
    paymentStatus: 'paid',
  }, event)

  assert.ok(invalid.blockingWarnings.some((warning) => warning.code === 'negative-amountDue'))
  assert.ok(invalid.blockingWarnings.some((warning) => warning.code === 'negative-amountPaid'))
})

test('operations effect table separates cash, commitments, in-kind support, reimbursements, and adjustments', () => {
  const operations = [
    { entryType: 'income', status: 'received', amount: 250 },
    { entryType: 'income', status: 'expected', amount: 500 },
    { entryType: 'expense', status: 'paid', amount: 120 },
    { entryType: 'expense', status: 'pending', amount: 80 },
    { entryType: 'refund', status: 'paid', amount: 25 },
    { entryType: 'refund', status: 'pending', amount: 10 },
    { entryType: 'reimbursement', status: 'received', amount: 40 },
    { entryType: 'adjustment', status: 'received', adjustmentDirection: 'increase', amount: 15 },
    { entryType: 'adjustment', status: 'paid', adjustmentDirection: 'decrease', amount: 5 },
    { entryType: 'expense', status: 'cancelled', amount: 999 },
    { entryType: 'income', status: 'received', category: 'In-kind support', amount: 0 },
  ]

  const settlement = buildOperationsSettlementSummary(operations)

  assert.ok(OPERATIONS_ENTRY_EFFECTS.some((effect) => effect.entryType === 'reimbursement'))
  assert.equal(operationsEntryEffect(operations[3]).cashAmount, 0)
  assert.equal(operationsEntryEffect(operations[3]).commitmentAmount, 80)
  assert.equal(operationsEntryEffect(operations[8]).cashAmount, -5)
  assert.equal(settlement.incomeReceived, 250)
  assert.equal(settlement.incomePending, 500)
  assert.equal(settlement.paidExpenses, 120)
  assert.equal(settlement.outstandingCommitments, 80)
  assert.equal(settlement.paidRefunds, 25)
  assert.equal(settlement.pendingRefunds, 10)
  assert.equal(settlement.reimbursementsReceived, 40)
  assert.equal(settlement.adjustments, 10)
  assert.equal(settlement.operationsCashPosition, 155)
  assert.equal(settlement.inKindContributions, 1)
})

test('reports preserve financial source boundaries and use settled Operations cash movement for ledger difference', () => {
  const registrations = [
    { registrationId: 'paid', fullName: 'Paid Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 100, paymentStatus: 'paid' },
    { registrationId: 'partial', fullName: 'Partial Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 40, paymentStatus: 'pending' },
  ]
  const operations = [
    { entryType: 'income', status: 'received', amount: 200 },
    { entryType: 'income', status: 'expected', amount: 1000 },
    { entryType: 'expense', status: 'pending', amount: 500 },
    { entryType: 'reimbursement', status: 'received', amount: 20 },
  ]

  const review = buildEventReview(event, registrations, operations, { asOf: new Date('2026-01-01T00:00:00Z') })

  assert.equal(review.paymentReview.registrationRecords.collectedAmount, 140)
  assert.equal(review.paymentReview.operationsLedger.incomeReceived, 200)
  assert.equal(review.paymentReview.operationsLedger.incomePending, 1000)
  assert.equal(review.paymentReview.operationsLedger.expensesPending, 500)
  assert.equal(review.paymentReview.operationsLedger.reimbursementsReceived, 20)
  assert.equal(review.paymentReview.operationsLedger.netPosition, 220)
  assert.match(review.paymentReview.comparison.note, /Do not add them together/)
})

test('payment reconciliation remains read-only, Working Event-scoped, and distinguishes missing evidence from outstanding balance', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: workbookSheet([
      ['T-001', 'Matched Guest', 'Matched Guest', 'matched@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'FP-1', 'High'],
      ['T-002', 'Workbook Only', 'Workbook Only', 'only@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', '', 'High'],
    ]),
    registrations: [
      { registrationId: 'matched', fullName: 'Matched Guest', email: 'matched@example.com', ticketCode: 'T-001', ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', paymentReference: 'FP-1' },
      { registrationId: 'app-only', fullName: 'App Only', ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid' },
    ],
    operationsEntries: [{ entryType: 'income', status: 'received', label: 'Sponsor income', amount: 50 }],
    event,
  })

  assert.equal(preview.writesPerformed, false)
  assert.equal(preview.targetEvent.eventId, event.eventId)
  assert.equal(preview.counts['workbook-only'], 1)
  assert.equal(preview.classificationCounts.app['app-only'], 1)
  assert.equal(preview.totals.currentApp.totalOutstanding, 0)
})

test('financial workflow guardrails preserve QR payload, dependencies, and disabled access workflow', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const contract = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.equal(qrPayloadForTicketCode('FIN-001'), 'GSV:TICKET:FIN-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(contract, /No live access workflow is available/)
  assert.doesNotMatch(contract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})

test('financial workflow pages expose clear organizer wording without claiming final profit', async () => {
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(payments, /Partially Paid|Partial/)
  assert.match(payments, /Unpaid|Pending/)
  assert.match(operations, /Operations entry effect table/)
  assert.match(operations, /Reimbursements Received/)
  assert.match(reports, /Reimbursements received/)
  assert.doesNotMatch(payments, /final profit/i)
  assert.match(operations, /not final event profit/)
  assert.match(reports, /not final event profit/)
})
