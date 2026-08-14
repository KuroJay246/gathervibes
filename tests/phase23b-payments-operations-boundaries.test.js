import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildPaymentsWorkspace,
  classifyRegistrationFinance,
  paymentFilterMatches,
} from '../src/utils/financeUtils.js'
import {
  buildOperationsSettlementSummary,
  findPossibleRegistrationPaymentOverlap,
} from '../src/utils/operationsReport.js'
import { buildEventReview } from '../src/utils/eventReview.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Payments route is organizer-facing while scanner navigation remains isolated', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')

  assert.match(app, /path="\/payments"/)
  assert.match(shell, /to: '\/payments', label: 'Registration Payments'/)
  assert.match(shell, /Guests & Attendance[\s\S]*\/registrations[\s\S]*\/tickets[\s\S]*\/check-in/)
  assert.match(shell, /Money & Follow-Up[\s\S]*\/payments[\s\S]*\/operations[\s\S]*\/event-review/)
  assert.match(access, /scanner:[\s\S]*'\/scanner'/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/payments'/)
  assert.match(paymentsPage, /'unknown', 'Unknown'/)
})

test('Payments workspace classifies registration payment follow-up without inventing money', () => {
  const registrations = [
    { registrationId: 'paid', fullName: 'Paid Guest', personsAttending: 1, ticketPrice: 50, amountPaid: 50, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'FP-1' },
    { registrationId: 'partial', fullName: 'Partial Guest', personsAttending: 2, ticketPrice: 50, amountPaid: 25, paymentStatus: 'pending', paymentReference: 'FP-2' },
    { registrationId: 'bad', fullName: 'Bad Guest', personsAttending: 1, ticketPrice: 50, amountPaid: '', paymentStatus: 'paid', paymentReference: 'FP-3' },
    { registrationId: 'missing', fullName: 'Missing Price', personsAttending: 1, amountPaid: 0, paymentStatus: 'pending' },
  ]

  const workspace = buildPaymentsWorkspace(registrations, { currency: 'BBD' })

  assert.equal(workspace.summary.registrationCount, 4)
  assert.equal(workspace.summary.guestCount, 5)
  assert.equal(workspace.summary.expectedRegistrationIncome, 200)
  assert.equal(workspace.summary.recordedPayments, 75)
  assert.equal(workspace.summary.outstandingBalance, 125)
  assert.equal(workspace.summary.paymentFollowUpCount, 3)
  assert.equal(workspace.summary.dataReviewCount, 0)
  assert.equal(workspace.filterCounts['finance-review'], 0)
  assert.equal(paymentFilterMatches(workspace.rows.find((row) => row.registrationId === 'partial'), 'partial'), true)
  assert.equal(workspace.rows.find((row) => row.registrationId === 'missing').amountDue, null)
})

test('Registration finance classification catches data defects and duplicate references', () => {
  const referenceCounts = new Map([['dup-1', 2]])
  const classified = classifyRegistrationFinance({
    personsAttending: 1,
    ticketPrice: 50,
    amountPaid: 75,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    paymentReference: 'DUP-1',
  }, {}, { paymentReferenceCounts: referenceCounts })

  assert.equal(classified.statusGroup, 'paid')
  assert.equal(classified.dataReviewRequired, true)
  assert.equal(classified.reviewLabel, 'Amount Mismatch')
  assert.ok(classified.warnings.some((warning) => warning.code === 'overpaid'))
  assert.ok(classified.warnings.some((warning) => warning.code === 'duplicate-payment-reference'))
})

test('Payments page exposes price context and links to the existing registration review workflow', async () => {
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const registrationsPage = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const registrationCard = await readFile('src/components/registrations/RegistrationCard.jsx', 'utf8')

  assert.match(paymentsPage, /Door Paid/)
  assert.match(paymentsPage, /Outstanding/)
  assert.match(paymentsPage, /Tier \/ Price/)
  assert.match(paymentsPage, /row\.priceTier/)
  assert.match(paymentsPage, /row\.ticketPrice/)
  assert.match(paymentsPage, /reviewRegistration=\$\{encodeURIComponent\(row\.registrationId\)\}/)
  assert.match(paymentsPage, /break-words/)
  assert.match(registrationsPage, /useSearchParams/)
  assert.match(registrationsPage, /reviewRegistrationId/)
  assert.match(registrationsPage, /registration-\$\{reg\.registrationId\}/)
  assert.match(registrationCard, /highlighted/)
})

test('Operations page and helpers keep registration payments separate from ledger totals', async () => {
  const operationsPage = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const qaPage = await readFile('src/pages/QaPage.jsx', 'utf8')
  const reports = await readFile('src/utils/eventReview.js', 'utf8')

  const overlaps = findPossibleRegistrationPaymentOverlap([
    { entryType: 'income', label: 'Ticket revenue from door guest', status: 'received' },
    { entryType: 'income', label: 'Sponsor income', status: 'received' },
    { entryType: 'expense', label: 'Ticket printing', status: 'paid' },
  ])

  assert.equal(overlaps.length, 1)
  assert.match(operationsPage, /Open Payments/)
  assert.match(operationsPage, /should not be added automatically to registration payment totals/)
  assert.match(operationsPage, /Possible overlap/)
  assert.match(operationsPage, /Confirm the income was not already recorded under Payments/)
  assert.match(operationsPage, /Current Ledger Difference/)
  assert.match(operationsPage, /Visible Current Ledger Difference/)
  assert.match(operationsPage, /Registration ticket payments stay in Registration Payments/)
  assert.doesNotMatch(operationsPage, /Net event position/)
  assert.doesNotMatch(operationsPage, /Operations closeout records applied/)
  assert.match(qaPage, /Overall event profit is not calculated automatically/)
  assert.match(reports, /Boundary comparison for review only/)
  assert.match(reports, /Do not add them together/)
})

test('Financial boundary examples stay separated across payments, operations, planning, and reports', async () => {
  const event = {
    eventId: 'phase-1-boundary',
    eventName: 'Boundary QA Event',
    currency: 'BBD',
    capacity: 20,
    financialPlan: {
      projectedRegistrationIncome: 1000,
      venueBudget: 300,
      supplierBudget: 200,
      marketingBudget: 75,
      staffingBudget: 125,
      contingencyBudget: 50,
    },
    partnerRecords: [
      { recordType: 'sponsor', sponsorType: 'cash', status: 'Requested', requestedAmount: 500, confirmedCashAmount: 0 },
      { recordType: 'sponsor', sponsorType: 'cash', status: 'Confirmed', confirmedCashAmount: 250 },
      { recordType: 'sponsor', sponsorType: 'in-kind', status: 'Confirmed', estimatedValue: 300, itemOrService: 'Gift bags' },
      { recordType: 'supplier', status: 'Confirmed', agreedAmount: 160, amountPaid: 80 },
    ],
  }
  const registrations = [
    { registrationId: 'paid', fullName: 'Fully Paid', personsAttending: 1, ticketPrice: 100, amountPaid: 100, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'P-1' },
    { registrationId: 'partial', fullName: 'Partial Paid', personsAttending: 2, ticketPrice: 100, amountPaid: 50, paymentStatus: 'pending' },
    { registrationId: 'unpaid', fullName: 'Unpaid Guest', personsAttending: 1, ticketPrice: 100, amountPaid: 0, paymentStatus: 'pending' },
    { registrationId: 'comp', fullName: 'Comp Guest', personsAttending: 1, ticketPrice: 0, amountDue: 0, amountPaid: 0, paymentStatus: 'complimentary', paymentMethod: 'complimentary' },
  ]
  const operations = [
    { entryType: 'income', status: 'received', category: 'Sponsor cash', label: 'Confirmed sponsor cash', amount: 250 },
    { entryType: 'income', status: 'expected', category: 'Sponsor request', label: 'Requested sponsor not confirmed', amount: 500 },
    { entryType: 'expense', status: 'paid', category: 'Vendor', label: 'Vendor paid expense', amount: 120 },
    { entryType: 'expense', status: 'pending', category: 'Supplier', label: 'Unpaid commitment', amount: 80 },
    { entryType: 'refund', status: 'paid', category: 'Refund', label: 'Refund paid', amount: 25 },
    { entryType: 'adjustment', status: 'received', category: 'Reimbursement', label: 'Reimbursement adjustment', amount: 40 },
    { entryType: 'income', status: 'received', category: 'Ticket revenue', label: 'Duplicate ticket revenue entry', amount: 100 },
    { entryType: 'income', status: 'received', category: 'In-kind support', label: 'Gift bags in-kind support', amount: 0 },
  ]

  const payments = buildPaymentsWorkspace(registrations, event)
  const settlement = buildOperationsSettlementSummary(operations)
  const review = buildEventReview(event, registrations, operations, { asOf: new Date('2026-01-01T00:00:00Z') })
  const overlaps = findPossibleRegistrationPaymentOverlap(operations)

  assert.equal(payments.summary.expectedRegistrationIncome, 400)
  assert.equal(payments.summary.recordedPayments, 150)
  assert.equal(payments.summary.outstandingBalance, 250)
  assert.equal(payments.summary.complimentaryRegistrations, 1)
  assert.equal(settlement.incomeReceived, 350)
  assert.equal(settlement.incomePending, 500)
  assert.equal(settlement.paidExpenses, 120)
  assert.equal(settlement.outstandingCommitments, 80)
  assert.equal(settlement.paidRefunds, 25)
  assert.equal(settlement.inKindContributions, 1)
  assert.equal(overlaps.length, 1)
  assert.equal(review.paymentReview.plannedFigures.plannedRegistrationIncome, 1000)
  assert.equal(review.paymentReview.plannedFigures.plannedExpenses, 750)
  assert.equal(review.paymentReview.outstandingCommitments.totalOutstandingCommitments, 160)
  assert.equal(review.paymentReview.comparison.registrationCollected, 150)
  assert.equal(review.paymentReview.comparison.ledgerReceivedIncome, 350)
  assert.match(review.paymentReview.comparison.note, /Do not add them together/)
})

test('CPB historical evidence is relocated out of daily Payments and Operations presentation', async () => {
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const operationsPage = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reportsPage = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(paymentsPage, /Historical reconciliation evidence is not part of the daily Registration Payments workflow/)
  assert.doesNotMatch(paymentsPage, /Documentary support for CPB ticket income/)
  assert.match(operationsPage, /Registration ticket payments stay in Registration Payments/)
  assert.doesNotMatch(operationsPage, /Baker payment schedule/)
  assert.match(reportsPage, /Historical Reconciliation/)
  assert.match(reportsPage, /Documentary-to-app variance/)
})

test('Phase 23B guardrails keep QR, dependencies, Firestore rules, and access workflows unchanged', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const contract = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.equal(qrPayloadForTicketCode('PH23B-001'), 'GSV:TICKET:PH23B-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(contract, /No live access workflow is available/)
  assert.doesNotMatch(contract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})
