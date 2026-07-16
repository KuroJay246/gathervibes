import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  CPB_RECONCILIATION_EVENT_ID,
  buildPaymentReconciliationPreview,
  parsePaymentWorkbookSheet,
} from '../src/utils/paymentReconciliation.js'

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
  'Payment Method',
  'Evidence Summary',
  'Confidence',
]

function sheet(rows) {
  return { headers, rows: rows.map((data, index) => ({ data, sourceRowNumber: index + 2 })) }
}

test('Phase 23E generator uses the released parser and finance contracts', async () => {
  const script = await readFile('scripts/admin/generateCpbManifest.mjs', 'utf8')

  assert.match(script, /worksheet-xml-cached-values/)
  assert.match(script, /cpb-reconciliation-parser-v1/)
  assert.match(script, /phase-23d0-registration-finance-v1/)
  assert.match(script, /function cellNodes/)
  assert.match(script, /Array\.from\(\{ length: values\.length \}/)
  assert.match(script, /77AF3050F82D97D12067728FC1314E51CA734F73B798AAD8D63C263421029D96/)
  assert.match(script, /2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409/)
  assert.match(script, /C:\\\\Users\\\\Jaylan\\\\Desktop\\\\GSV_New_CPB_Manifest/)
})

test('Phase 23E manifest generation preserves canonical payment-status behavior', () => {
  const records = parsePaymentWorkbookSheet(sheet([
    ['CPB-001', 'Paid Dash', 'Paid Dash', 'paid@example.com', 'General', 100, 100, 100, 0, 'Paid – Confirmed', 'FirstPay', 'Ref', 'High'],
    ['CPB-002', 'Payment Confirmed', 'Payment Confirmed', 'confirmed@example.com', 'General', 100, 100, 100, 0, 'Payment Confirmed', 'FirstPay', 'Ref', 'High'],
    ['CPB-003', 'Partial Guest', 'Partial Guest', 'partial@example.com', 'General', 100, 40, 100, 60, 'Partial', 'FirstPay', 'Ref', 'High'],
    ['CPB-004', 'Door Deposit', 'Door Deposit', 'door@example.com', 'Door', 120, 20, 120, 100, 'To Pay at Door', 'Door', 'Ref', 'High'],
    ['CPB-005', 'Door Paid', 'Door Paid', 'doorpaid@example.com', 'Door', 120, 120, 120, 0, 'Door Paid', 'Door', 'Ref', 'High'],
    ['CPB-006', 'Comp Guest', 'Comp Guest', 'comp@example.com', 'Complimentary', 0, 0, 0, 0, 'Complimentary', 'Complimentary', 'Ref', 'High'],
  ]))

  assert.deepEqual(records.map((record) => record.paymentStatus), ['paid', 'paid', 'pending', 'door-list', 'door', 'complimentary'])
})

test('Phase 23E preview produces complete classification counts and deterministic proposal fields', () => {
  const preview = buildPaymentReconciliationPreview({
    workbookSheet: sheet([
      ['CPB-101', 'No Change', 'No Change', 'same@example.com', 'General', 100, 100, 100, 0, 'Paid Confirmed', 'FirstPay', 'PAY-101', 'High'],
      ['CPB-102', 'Update', 'Update', 'update@example.com', 'General', 100, 100, 100, 0, 'Paid Confirmed', 'FirstPay', 'PAY-102', 'High'],
      ['', 'Manual Only', 'Manual Only', '', 'General', 100, 0, 100, 100, 'Pending', 'Unknown', '', 'Low'],
      ['CPB-103', 'Workbook Only', 'Workbook Only', 'only@example.com', 'General', 100, 100, 100, 0, 'Paid Confirmed', 'FirstPay', 'PAY-103', 'High'],
    ]),
    registrations: [
      { registrationId: 'same', eventId: CPB_RECONCILIATION_EVENT_ID, fullName: 'No Change', email: 'same@example.com', ticketCode: 'CPB-101', ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'PAY-101', priceTier: 'General' },
      { registrationId: 'update', eventId: CPB_RECONCILIATION_EVENT_ID, fullName: 'Update', email: 'update@example.com', ticketCode: 'CPB-102', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending', paymentMethod: 'unknown', paymentReference: 'PAY-102', priceTier: 'General' },
      { registrationId: 'manual', eventId: CPB_RECONCILIATION_EVENT_ID, fullName: 'Manual Only', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending' },
      { registrationId: 'app-only', eventId: CPB_RECONCILIATION_EVENT_ID, fullName: 'App Only', ticketCode: 'CPB-999', ticketPrice: 100, amountDue: 100, amountPaid: 0, balanceDue: 100, paymentStatus: 'pending' },
    ],
    event: { eventId: CPB_RECONCILIATION_EVENT_ID, currency: 'BBD' },
  })

  assert.equal(preview.classificationCounts.workbook.all, 4)
  assert.equal(preview.classificationCounts.app.all, 4)
  assert.equal(preview.classificationCounts.workbook['no-change'], 1)
  assert.equal(preview.classificationCounts.workbook['proposed-update'], 1)
  assert.equal(preview.classificationCounts.workbook['manual-review'], 1)
  assert.equal(preview.classificationCounts.workbook['workbook-only'], 1)
  assert.deepEqual(preview.proposedFields, ['ticketPrice', 'amountDue', 'amountPaid', 'balanceDue', 'paymentStatus', 'paymentMethod', 'priceTier'])
  assert.equal(preview.writesPerformed, false)
})

test('Phase 23E generator remains read-only and does not expose CPB apply behavior', async () => {
  const script = await readFile('scripts/admin/generateCpbManifest.mjs', 'utf8')
  const readService = await readFile('src/services/reconciliationReadService.js', 'utf8')

  assert.doesNotMatch(script, /\.setDoc\(|\.addDoc\(|\.updateDoc\(|\.deleteDoc\(|writeBatch|runTransaction/)
  assert.doesNotMatch(readService, /addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)
  assert.match(script, /writesPerformed:\s*false/)
})
