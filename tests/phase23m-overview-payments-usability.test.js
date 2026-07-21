import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildEventReview } from '../src/utils/eventReview.js'
import {
  buildFinanceSummary,
  buildPaymentsWorkspace,
  paymentFilterMatches,
  paymentSearchMatches,
} from '../src/utils/financeUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const event = {
  eventId: 'phase23m-event',
  eventName: 'QA_PHASE23M_PAYMENT_UI_Event',
  currency: 'BBD',
  ticketPrice: 999,
}

const rows = [
  { registrationId: 'paid-early', fullName: 'QA_PHASE23M_PAYMENT_UI Early Bird Guest', personsAttending: 1, ticketPrice: 85, amountDue: 85, amountPaid: 85, balanceDue: 0, paymentStatus: 'paid', priceTier: 'Early Bird', paymentMethod: 'firstpay', paymentReference: 'QA-EB' },
  { registrationId: 'paid-general', fullName: 'QA_PHASE23M_PAYMENT_UI General Guest With A Very Long Name That Must Wrap Safely', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', priceTier: 'General', paymentMethod: 'bank-transfer', paymentReference: 'QA-GEN' },
  { registrationId: 'partial', fullName: 'QA_PHASE23M_PAYMENT_UI Partial Guest', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 50, balanceDue: 50, paymentStatus: 'pending', priceTier: 'General', paymentMethod: 'firstpay', paymentReference: 'QA-PART' },
  { registrationId: 'door-paid', fullName: 'QA_PHASE23M_PAYMENT_UI Door Paid Guest', personsAttending: 1, ticketPrice: 110, amountDue: 110, amountPaid: 110, balanceDue: 0, paymentStatus: 'door', priceTier: 'Door/Late', paymentMethod: 'door' },
  { registrationId: 'door-list', fullName: 'QA_PHASE23M_PAYMENT_UI To Pay At Door Guest', personsAttending: 1, ticketPrice: 110, amountDue: 110, amountPaid: 0, balanceDue: 110, paymentStatus: 'door-list', priceTier: 'Door/Late', paymentMethod: 'door' },
  { registrationId: 'review', fullName: 'QA_PHASE23M_PAYMENT_UI Review Guest', personsAttending: 1, amountPaid: 0, balanceDue: 0, paymentStatus: 'unknown', ticketCode: 'QA23M-REVIEW' },
]

test('Phase 23M Overview displays canonical expected registration income without using event default price', () => {
  const summary = buildFinanceSummary(rows, event)

  assert.equal(summary.totalExpected, 505)
  assert.notEqual(summary.totalExpected, rows.length * event.ticketPrice)
  assert.equal(summary.totalCollected, 345)
  assert.equal(summary.totalOutstanding, 160)
})

test('Phase 23M Overview, Payments, and Reports finance totals align', () => {
  const overview = buildFinanceSummary(rows, event)
  const payments = buildPaymentsWorkspace(rows, event)
  const report = buildEventReview(event, rows, [{ entryType: 'income', status: 'received', amount: 999 }])

  assert.equal(overview.totalExpected, payments.summary.expectedRegistrationIncome)
  assert.equal(overview.totalCollected, payments.summary.recordedPayments)
  assert.equal(overview.totalOutstanding, payments.summary.outstandingBalance)
  assert.equal(report.paymentReview.registrationRecords.expectedIncome, payments.summary.expectedRegistrationIncome)
  assert.equal(report.paymentReview.registrationRecords.collectedAmount, payments.summary.recordedPayments)
  assert.equal(report.paymentReview.registrationRecords.outstandingAmount, payments.summary.outstandingBalance)
  assert.equal(report.paymentReview.registrationRecords.expectedIncome, 505)
  assert.equal(report.paymentReview.operationsLedger.incomeReceived, 999)
})

test('Phase 23M source uses aligned labels across Overview, Payments, and Reports', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  for (const source of [dashboard, payments, reports]) {
    assert.match(source, /Expected Registration Income/)
    assert.match(source, /Payments Received/)
    assert.match(source, /Outstanding Balance/)
  }
  assert.match(dashboard, /buildFinanceSummary\(registrations, selectedEvent\)/)
  assert.match(dashboard, /formatCurrency\(financeSummary\.totalExpected, financeSummary\.currency\)/)
  assert.match(dashboard, /Operations Ledger money remains separate/)
  assert.doesNotMatch(dashboard, /defaultTicketPriceForEvent|ticketPrice \* metrics|metrics\.totalPersons \*/)
  assert.doesNotMatch(payments, /Operations Ledger tracks[\s\S]*workspace\.summary\.expectedRegistrationIncome/)
})

test('Phase 23M Payments keeps desktop table and adds responsive cards with full finance context', async () => {
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')

  assert.match(payments, /function PaymentCard/)
  assert.match(payments, /lg:hidden[\s\S]*Responsive payment records/)
  assert.match(payments, /hidden overflow-hidden rounded-xl border border-\[#F2E8E1\] lg:block/)
  assert.match(payments, /<table className="w-full min-w-\[1080px\]/)
  for (const label of ['Expected', 'Received', 'Balance', 'Price tier', 'Method', 'Reference', 'Ticket']) {
    assert.match(payments, new RegExp(`'${label}'`))
  }
  assert.match(payments, /break-words text-sm font-bold text-\[#2B1723\]/)
  assert.match(payments, /role="status"/)
  assert.match(payments, /aria-label=\{`\$\{row\.name\} payment record`\}/)
})

test('Phase 23M Payments filters and search results remain unchanged', () => {
  const workspace = buildPaymentsWorkspace(rows, event)
  const byId = Object.fromEntries(workspace.rows.map((row) => [row.registrationId, row]))

  assert.equal(workspace.filterCounts.paid, 3)
  assert.equal(workspace.filterCounts.partial, 1)
  assert.equal(workspace.filterCounts.pending, 0)
  assert.equal(workspace.filterCounts.door, 2)
  assert.equal(workspace.filterCounts['needs-follow-up'], 3)
  assert.equal(workspace.filterCounts['finance-review'], 1)
  assert.equal(paymentFilterMatches(byId['door-paid'], 'paid'), true)
  assert.equal(paymentFilterMatches(byId['door-paid'], 'door'), true)
  assert.equal(paymentFilterMatches(byId['door-list'], 'paid'), false)
  assert.equal(paymentFilterMatches(byId['door-list'], 'door'), true)
  assert.equal(paymentSearchMatches(byId.partial, 'QA-PART'), true)
  assert.equal(paymentSearchMatches(byId['paid-general'], 'very long name'), true)
})

test('Phase 23M guardrails preserve QR, scanner, rules, indexes, and dependencies', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const scanner = await readFile('src/pages/ScannerPage.jsx', 'utf8')

  assert.equal(qrPayloadForTicketCode('QA23M-001'), 'GSV:TICKET:QA23M-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(scanner, /Duplicate check-in is blocked/)
})
