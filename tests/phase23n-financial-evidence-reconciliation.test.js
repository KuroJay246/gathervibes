import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildEventReview } from '../src/utils/eventReview.js'
import {
  CPB_EVENT_ID,
  CPB_FINANCIAL_EVIDENCE_AUDIT,
  EVIDENCE_CLASSES,
  countEvidenceClasses,
  getEventFinancialEvidenceAudit,
} from '../src/utils/financialEvidenceAudit.js'
import { buildFinanceSummary } from '../src/utils/financeUtils.js'
import { buildOperationsTotals } from '../src/utils/operationsReport.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 23N preserves exact evidence classes and CPB-only audit lookup', () => {
  assert.deepEqual(EVIDENCE_CLASSES, [
    'Directly Verified',
    'Amount Inferred',
    'Organizer Reported',
    'Confirmed In-Kind',
    'Organizer-Reported In-Kind',
    'Unverified / Outstanding',
    'Historical / Excluded',
    'Control Exception',
    'Needs External Evidence',
  ])
  assert.equal(getEventFinancialEvidenceAudit(CPB_EVENT_ID)?.auditStatus, 'Qualified / Incomplete Reconciliation')
  assert.equal(getEventFinancialEvidenceAudit('xPfa0b3KZyLSDnAD2uGI'), null)
})

test('Phase 23N keeps operational totals separate from documentary audit totals', () => {
  const event = { eventId: CPB_EVENT_ID, eventName: 'CPB', ticketPrice: 85, capacity: 80, status: 'completed' }
  const registrations = [
    { personsAttending: 1, ticketPrice: 85, amountPaid: 85, paymentStatus: 'paid' },
    { personsAttending: 1, ticketPrice: 100, amountPaid: 100, paymentStatus: 'paid' },
  ]
  const finance = buildFinanceSummary(registrations, event)
  const report = buildEventReview(event, registrations, [{ entryType: 'income', status: 'received', amount: 0 }])

  assert.equal(finance.totalCollected, 185)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.ticketIncome.directlyVerifiedAmount, 4115)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.ticketIncome.inferredAmount, 1300)
  assert.equal(report.paymentReview.registrationRecords.collectedAmount, 185)
  assert.equal(report.paymentReview.operationsLedger.incomeReceived, 0)
})

test('Phase 23N in-kind support does not enter cash Operations totals', () => {
  const entries = CPB_FINANCIAL_EVIDENCE_AUDIT.sponsorship.map((item) => ({
    entryType: 'income',
    status: 'received',
    amount: item.cashReceived,
  }))
  const totals = buildOperationsTotals(entries)
  assert.equal(totals.income, 0)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.sponsorship.filter((item) => item.evidenceClass === 'Confirmed In-Kind').length, 2)
  assert.equal(countEvidenceClasses(CPB_FINANCIAL_EVIDENCE_AUDIT).some(([label]) => label === 'Organizer-Reported In-Kind'), true)
})

test('Phase 23N baker variance and historical records do not alter paid or outstanding totals', () => {
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerPaidOrganizerReported, 1225)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerOutstandingOrganizerReported, 1050)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerVariance, 25)
  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerPaidOrganizerReported + CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerVariance, 1250)
})

test('Phase 23N approximate attendance does not create system check-ins', () => {
  const audit = CPB_FINANCIAL_EVIDENCE_AUDIT
  const event = { eventId: CPB_EVENT_ID, eventName: 'CPB', capacity: 80, status: 'completed' }
  const registrations = [
    { personsAttending: 1, checkedIn: false, paymentStatus: 'paid', ticketCode: 'CPB-001' },
    { personsAttending: 1, checkedIn: false, paymentStatus: 'paid', ticketCode: 'CPB-002' },
  ]
  const review = buildEventReview(event, registrations, [])
  assert.equal(audit.attendance.approximateAttendance, 70)
  assert.equal(audit.attendance.attendanceToGmailGap, 13)
  assert.equal(review.summary.checkedInGuests, 0)
})

test('Phase 23N UI surfaces documentary audit without replacing operational labels', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(dashboard, /Financial Evidence Audit/)
  assert.match(dashboard, /Expected Registration Income/)
  assert.match(payments, /Evidence classification is separate from payment status/)
  assert.match(registrations, /Registration Evidence Reconciliation/)
  assert.match(checkIn, /Historical attendance is not system check-in/)
  assert.match(operations, /Operations Closeout Proposal/)
  assert.match(reports, /Documentary Financial Audit/)
  assert.match(reports, /Final profit cannot be confirmed until bank, 1stPay, baker and supplier evidence is complete/)
})

test('Phase 23N generator is dry-run only and blocks ambiguous automatic apply', async () => {
  const script = await readFile('scripts/admin/generatePhase23NFinancialEvidenceManifest.mjs', 'utf8')
  assert.match(script, /writesPerformed: false/)
  assert.match(script, /phase23JManifestReused: false/)
  assert.match(script, /eligibleForAutomaticApply: false/)
  assert.match(script, /Conflict/)
  assert.match(script, /Unmatched/)
  assert.doesNotMatch(script, /batch\.commit|commit\(|firebase-tools deploy|runCpbProductionApply/)
})

test('Phase 23N guardrails preserve QR payload, scanner boundaries, and append-only audit logs', async () => {
  const scanner = await readFile('src/pages/ScannerPage.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const ticketService = await readFile('src/services/ticketService.js', 'utf8')
  assert.equal(qrPayloadForTicketCode('QA23N-001'), 'GSV:TICKET:QA23N-001')
  assert.match(scanner, /Scanner Mode/)
  assert.match(rules, /allow update, delete: if false;/)
  assert.doesNotMatch(ticketService, /deleteDoc\(doc\(db,\s*'auditLogs'/)
})
