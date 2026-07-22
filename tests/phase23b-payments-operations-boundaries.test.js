import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildPaymentsWorkspace,
  classifyRegistrationFinance,
  paymentFilterMatches,
} from '../src/utils/financeUtils.js'
import { findPossibleRegistrationPaymentOverlap } from '../src/utils/operationsReport.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Payments route is organizer-facing while scanner navigation remains isolated', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')

  assert.match(app, /path="\/payments"/)
  assert.match(shell, /to: '\/payments', label: 'Payments'/)
  assert.match(shell, /\/registrations[\s\S]*\/payments[\s\S]*\/tickets/)
  assert.match(shell, /More workspace[\s\S]*\/events[\s\S]*\/payments[\s\S]*\/operations/)
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
  assert.match(paymentsPage, /To Pay at Door/)
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
  assert.match(operationsPage, /Operations Cash Position/)
  assert.match(operationsPage, /Visible Operations Cash Position/)
  assert.doesNotMatch(operationsPage, /Net event position/)
  assert.match(qaPage, /Overall event profit is not calculated automatically/)
  assert.match(reports, /Boundary comparison for review only/)
  assert.match(reports, /Do not add them together/)
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
