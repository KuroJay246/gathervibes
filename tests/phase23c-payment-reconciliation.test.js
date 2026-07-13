import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  CPB_DRY_RUN_CONFIRMATION_TEXT,
  CPB_RECONCILIATION_EVENT_ID,
  buildPaymentReconciliationPreview,
  parsePaymentWorkbookSheet,
} from '../src/utils/paymentReconciliation.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const headers = [
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
]

function sheet(rows) {
  return {
    headers,
    rows: rows.map((data, index) => ({ data, sourceRowNumber: index + 2 })),
  }
}

test('Phase 23C route is preview-only, CPB-gated, and does not require Working Event selection', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const paymentsPage = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const reconciliationPage = await readFile('src/pages/PaymentReconciliationPage.jsx', 'utf8')
  const access = await readFile('src/utils/accessRoles.js', 'utf8')

  assert.match(app, /path="\/payments\/reconciliation"/)
  assert.doesNotMatch(app, /path="\/payments\/reconciliation" element=\{<AssignedEventGate/)
  assert.match(paymentsPage, /Reconciliation Preview/)
  assert.match(await readFile('src/utils/paymentReconciliation.js', 'utf8'), new RegExp(CPB_DRY_RUN_CONFIRMATION_TEXT))
  assert.match(await readFile('src/utils/paymentReconciliation.js', 'utf8'), new RegExp(CPB_RECONCILIATION_EVENT_ID))
  assert.match(reconciliationPage, /Working Event unchanged/)
  assert.match(reconciliationPage, /CPB data is never silently reloaded/)
  assert.doesNotMatch(reconciliationPage, /localStorage|setActiveEvent|updateDoc|writeBatch|setDoc|addDoc|deleteDoc|runTransaction/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/payments'/)
})

test('Payment reconciliation parses workbook rows without committing private CPB data', () => {
  const records = parsePaymentWorkbookSheet(sheet([
    ['CPB-001', 'Ada Buyer', 'Ada Buyer', 'ada@example.com / 1 (246) 555-0101', 'General', '100', '100', '100', '0', 'Paid confirmed', 'Synthetic evidence', 'High'],
    ['', 'Door Guest', 'Door Buyer', '246-555-0102', 'Door', '125', '0', '125', '125', 'To pay at door', '', 'High'],
  ]))

  assert.equal(records.length, 2)
  assert.equal(records[0].ticketCode, 'CPB-001')
  assert.equal(records[0].email, 'ada@example.com')
  assert.ok(records[0].phoneKeys.includes('5550101'))
  assert.equal(records[0].paymentStatus, 'paid')
  assert.equal(records[1].paymentStatus, 'door-list')
  assert.equal(records[1].paymentMethod, 'door')
})

test('Payment reconciliation uses strong identifiers and never treats name-only as a safe match', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-001', 'Exact Buyer', 'Exact Buyer', 'exact@example.com / 246-555-0101', 'General', '100', '100', '100', '0', 'Paid confirmed', 'FP-001', 'High'],
      ['', 'Name Only', 'Name Only', '', 'General', '100', '50', '100', '50', 'Partial balance due', '', 'Medium'],
    ]),
    registrations: [
      { registrationId: 'exact', fullName: 'Exact Buyer', email: 'exact@example.com', phone: '555-0101', ticketCode: 'CPB-001', priceTier: 'General', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentReference: 'FP-001' },
      { registrationId: 'name-only', fullName: 'Name Only', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending' },
    ],
    operationsEntries: [],
    event: { eventId: CPB_RECONCILIATION_EVENT_ID, currency: 'BBD' },
  })

  const proposed = preview.rows.find((row) => row.registrationRecord?.registrationId === 'exact')
  const manual = preview.rows.find((row) => row.workbookRecord?.guestName === 'Name Only')

  assert.equal(proposed.status, 'Exact Match - Proposed Update')
  assert.deepEqual(proposed.proposedChanges.map((change) => change.field).sort(), ['amountPaid', 'balanceDue', 'paymentStatus'].sort())
  assert.equal(manual.status, 'Possible Match - Manual Review')
  assert.equal(preview.writesPerformed, false)
})

test('Payment reconciliation keeps workbook and app classifications mutually exclusive', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-010', 'Matched No Change', 'Matched No Change', 'match@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-010', 'High'],
      ['CPB-011', 'Matched Update', 'Matched Update', 'update@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-011', 'High'],
      ['', 'Manual Name', 'Manual Name', '', 'General', '100', '50', '100', '50', 'Partial balance due', '', 'Medium'],
      ['CPB-012', 'Workbook Only', 'Workbook Only', 'only@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-012', 'High'],
    ]),
    registrations: [
      { registrationId: 'same', fullName: 'Matched No Change', email: 'match@example.com', ticketCode: 'CPB-010', ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', paymentReference: 'PAY-010', priceTier: 'General' },
      { registrationId: 'update', fullName: 'Matched Update', email: 'update@example.com', ticketCode: 'CPB-011', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentReference: 'PAY-011', priceTier: 'General' },
      { registrationId: 'manual', fullName: 'Manual Name', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending' },
      { registrationId: 'app-only', fullName: 'App Only', ticketCode: 'CPB-099', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending' },
    ],
    operationsEntries: [],
    event: { currency: 'BBD' },
  })

  assert.equal(preview.workbookClassifications.length, 4)
  assert.equal(preview.appClassifications.length, 4)
  assert.equal(preview.classificationCounts.workbook.all, 4)
  assert.equal(preview.classificationCounts.app.all, 4)
  assert.equal(preview.classificationCounts.workbook['no-change'], 1)
  assert.equal(preview.classificationCounts.workbook['proposed-update'], 1)
  assert.equal(preview.classificationCounts.workbook['manual-review'], 1)
  assert.equal(preview.classificationCounts.workbook['workbook-only'], 1)
  assert.equal(preview.classificationCounts.app['app-only'], 1)
  assert.equal(preview.classificationCounts.app['manual-review'], 1)
})

test('Shared contact warnings do not override a unique ticket-code match', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-020', 'Household One', 'Buyer', 'shared@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-020', 'High'],
      ['CPB-021', 'Household Two', 'Buyer', 'shared@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-021', 'High'],
    ]),
    registrations: [
      { registrationId: 'one', fullName: 'Household One', email: 'shared@example.com', ticketCode: 'CPB-020', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentReference: 'PAY-020' },
      { registrationId: 'two', fullName: 'Household Two', email: 'shared@example.com', ticketCode: 'CPB-021', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentReference: 'PAY-021' },
    ],
    operationsEntries: [],
    event: { currency: 'BBD' },
  })

  assert.equal(preview.classificationCounts.workbook.duplicate, 0)
  assert.equal(preview.classificationCounts.workbook['proposed-update'], 2)
  assert.equal(preview.duplicateGroups.some((group) => group.keyType === 'email-name' && group.blocking), false)
})

test('Payment reconciliation blocks duplicate identifiers and keeps Operations separate', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-002', 'Duplicate A', 'Duplicate A', 'a@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'FP-DUP', 'High'],
      ['CPB-002', 'Duplicate B', 'Duplicate B', 'b@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'FP-DUP-2', 'High'],
    ]),
    registrations: [
      { registrationId: 'dup', fullName: 'Duplicate A', ticketCode: 'CPB-002', ticketPrice: 100, amountDue: 100, amountPaid: 100, paymentStatus: 'paid' },
    ],
    operationsEntries: [
      { ledgerEntryId: 'op-1', eventId: CPB_RECONCILIATION_EVENT_ID, entryType: 'income', label: 'Ticket revenue from door guest', status: 'received', amount: 100 },
      { ledgerEntryId: 'op-2', eventId: CPB_RECONCILIATION_EVENT_ID, entryType: 'income', label: 'Sponsor income', status: 'received', amount: 500 },
    ],
    event: { eventId: CPB_RECONCILIATION_EVENT_ID, currency: 'BBD' },
  })

  assert.equal(preview.counts.duplicate, 2)
  assert.equal(preview.totals.operationsExcluded.count, 2)
  assert.equal(preview.totals.operationsExcluded.possibleOverlapCount, 1)
  assert.equal(preview.totals.operationsExcluded.possibleOverlapAmount, 100)
})

test('Payment reconciliation exposes field-level proposal evidence and totals', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-030', 'Proposal Guest', 'Proposal Guest', 'proposal@example.com', 'General', '100', '100', '100', '0', 'Paid confirmed', 'PAY-030', 'High'],
    ]),
    registrations: [
      { registrationId: 'proposal', fullName: 'Proposal Guest', email: 'proposal@example.com', ticketCode: 'CPB-030', ticketPrice: 100, amountDue: 100, amountPaid: 25, balanceDue: 75, paymentStatus: 'pending', paymentReference: 'PAY-030', priceTier: 'General' },
    ],
    operationsEntries: [],
    event: { currency: 'BBD' },
  })
  const row = preview.workbookClassifications[0]

  assert.equal(row.status, 'Exact Match - Proposed Update')
  assert.equal(row.matchBasis, 'ticket code')
  assert.deepEqual(row.proposedChanges.map((change) => change.field).sort(), ['amountPaid', 'balanceDue', 'paymentStatus'].sort())
  assert.equal(row.proposalWarnings.length, 0)
  assert.equal(preview.totals.workbook.amountPaid, 100)
  assert.equal(preview.totals.currentApp.totalCollected, 25)
  assert.equal(preview.totals.hypotheticalApp.totalCollected, 100)
})

test('Payment reconciliation UI includes refinement evidence tables and reset safety', async () => {
  const page = await readFile('src/pages/PaymentReconciliationPage.jsx', 'utf8')
  const utility = await readFile('src/utils/paymentReconciliation.js', 'utf8')

  assert.match(page, /classificationCounts/)
  assert.match(page, /Workbook classifications/)
  assert.match(page, /App registration classifications/)
  assert.match(page, /Warning instances/)
  assert.match(page, /Duplicate groups/)
  assert.match(page, /Proposal field list/)
  assert.match(page, /Refresh/)
  assert.doesNotMatch(page, /localStorage|sessionStorage/)
  assert.doesNotMatch(page, /setDoc|updateDoc|writeBatch|runTransaction/)
  assert.match(utility, /workbookClassifications/)
  assert.match(utility, /appClassifications/)
})

test('Phase 23C read-only architecture and guardrails remain intact', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const readService = await readFile('src/services/reconciliationReadService.js', 'utf8')
  const workbookReader = await readFile('src/utils/reconciliationWorkbook.js', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const contract = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.equal(qrPayloadForTicketCode('PH23C-001'), 'GSV:TICKET:PH23C-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(workbookReader, /read-excel-file\/browser/)
  assert.match(workbookReader, /fflate/)
  assert.match(readService, /getDocs/)
  assert.doesNotMatch(readService, /addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(contract, /No live access workflow is available/)
  assert.doesNotMatch(contract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})
