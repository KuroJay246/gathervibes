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
import { buildOperationsSettlementSummary, buildOperationsTotals } from '../src/utils/operationsReport.js'
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

test('Phase 23N UI surfaces documentary audit without reopening completed-event planning work', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(dashboard, /Historical Reference/)
  assert.match(dashboard, /Financial audit history/)
  assert.match(dashboard, /completed historical event/i)
  assert.match(payments, /Evidence classification is separate from payment status/)
  assert.match(registrations, /Registration Evidence Reconciliation/)
  assert.match(checkIn, /Historical attendance is not system check-in/)
  assert.match(operations, /Financial Audit and Closeout History/)
  assert.match(reports, /Documentary Financial Audit/)
  assert.match(reports, /Final profit cannot be confirmed until bank, 1stPay, baker and supplier evidence is complete/)
})

test('Phase 23N-B Operations cash position is not labelled final profit', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(operations, /Operations Cash Position/)
  assert.match(operations, /This is not final event profit/)
  assert.match(reports, /Operations cash position/)
  assert.doesNotMatch(operations, /final profit\/loss|final event loss|event loss|final balance/i)
})

test('Phase 23N-B registration payments remain separate from Operations', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reports = await readFile('src/pages/EventReviewPage.jsx', 'utf8')

  assert.match(operations, /Registration ticket payments are recorded separately under Payments/)
  assert.match(operations, /should not be added automatically to registration payment totals/)
  assert.match(reports, /Registration payment records track guest charges/)
  assert.match(reports, /Operations cash position excludes registration ticket receipts/)
})

test('Phase 23N-B paid expenses and commitments remain separate', () => {
  const entries = [
    { entryType: 'expense', status: 'paid', amount: 1227.88 },
    { entryType: 'expense', status: 'paid', amount: 1225 },
    { entryType: 'expense', status: 'pending', amount: 1050 },
  ]
  const summary = buildOperationsSettlementSummary(entries)
  const legacyTotals = buildOperationsTotals(entries)

  assert.equal(summary.paidExpenses, 2452.88)
  assert.equal(summary.outstandingCommitments, 1050)
  assert.equal(summary.operationsCashPosition, -2452.88)
  assert.equal(legacyTotals.expenses, 3502.88)
})

test('Phase 23N-B completed closeout panel cannot reapply records', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')

  assert.match(operations, /Operations closeout records applied/)
  assert.match(operations, /Applied/)
  assert.match(operations, /Registration and attendance corrections locked/)
  assert.doesNotMatch(operations, /waiting for organizer approval/)
  assert.doesNotMatch(operations, /Apply Phase 23N|Apply approved|Reapply/)
})

test('Phase 23N-B corrective tasks do not alter totals', () => {
  const entries = [
    { entryType: 'expense', status: 'paid', amount: CPB_FINANCIAL_EVIDENCE_AUDIT.operations.venuePaid },
    { entryType: 'expense', status: 'paid', amount: CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerPaidOrganizerReported },
    { entryType: 'expense', status: 'pending', amount: CPB_FINANCIAL_EVIDENCE_AUDIT.operations.bakerOutstandingOrganizerReported },
  ]
  const summary = buildOperationsSettlementSummary(entries)

  assert.equal(CPB_FINANCIAL_EVIDENCE_AUDIT.correctiveActions.length, 13)
  assert.equal(summary.paidExpenses, 2452.88)
  assert.equal(summary.outstandingCommitments, 1050)
  assert.equal(summary.outstandingCommitments + CPB_FINANCIAL_EVIDENCE_AUDIT.operations.cakeBoxesPrinting, 1225)
})

test('Phase 23N-B applied proposal-count reporting is internally consistent', async () => {
  const report = await readFile('PHASE_23N_SUBSETS_1_4_PRODUCTION_APPLY.md', 'utf8')

  assert.match(report, /Approved proposal count: 21/)
  assert.match(report, /Applied proposal count: 21/)
  assert.match(report, /Skipped approved-write proposal count: 0/)
  assert.match(report, /Non-write considered item count: 1/)
  assert.match(report, /22 CONSIDERED \/ 21 APPLIED \/ 1 NON-WRITE SKIPPED/)
  assert.match(report, /P23N-OP-CAKE-BOXES-PRINTING/)
  assert.match(report, /not one of the 21 approved production write proposals/)
})

test('Phase 23N-B Subsets 5 and 6 remain locked in UI and report', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const report = await readFile('PHASE_23N_SUBSETS_1_4_PRODUCTION_APPLY.md', 'utf8')

  assert.match(operations, /Registration and attendance corrections locked/)
  assert.match(report, /Subset 5: Registration Evidence Metadata/)
  assert.match(report, /Subset 6: Registration\/Attendance Corrections/)
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
