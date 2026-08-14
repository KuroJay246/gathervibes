import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildPaymentsWorkspace } from '../src/utils/financeUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Registration Payments exposes detail review, method filtering, and task-prefill follow-up', async () => {
  const page = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const tasks = await readFile('src/pages/TasksPage.jsx', 'utf8')

  assert.match(page, /PaymentDetailsPanel/)
  assert.match(page, /PAYMENT_METHOD_FILTERS/)
  assert.match(page, /Create Follow-Up Task/)
  assert.match(page, /\/tasks\?/)
  assert.match(page, /followUpState/)
  assert.match(page, /Last updated/)
  assert.match(tasks, /useSearchParams/)
  assert.match(tasks, /prefilledTask/)
})

test('Payments workspace keeps follow-up separate from internal review counts', () => {
  const workspace = buildPaymentsWorkspace([
    { registrationId: 'paid', fullName: 'Paid Guest', personsAttending: 1, ticketPrice: 80, amountPaid: 80, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'P-1' },
    { registrationId: 'partial', fullName: 'Partial Guest', personsAttending: 2, ticketPrice: 80, amountPaid: 40, paymentStatus: 'pending', paymentMethod: 'firstpay' },
    { registrationId: 'cleanup', fullName: 'Cleanup Guest', personsAttending: 1, ticketPrice: 80, amountPaid: 80, paymentStatus: 'paid' },
  ], { currency: 'BBD' })

  assert.equal(workspace.summary.paymentFollowUpCount, 1)
  assert.equal(workspace.summary.internalCleanupCount, 1)
  assert.equal(workspace.paymentFollowUpRows[0].registrationId, 'partial')
  assert.equal(workspace.prominentDataReviewRows[0].registrationId, 'cleanup')
})

test('Operations exposes derived commitment, partner, and in-kind views with task-prefill actions', async () => {
  const page = await readFile('src/pages/OperationsPage.jsx', 'utf8')

  assert.match(page, /Operations views/)
  assert.match(page, /Commitments/)
  assert.match(page, /Partners & Suppliers/)
  assert.match(page, /In-Kind Support/)
  assert.match(page, /Create Follow-Up Task/)
  assert.match(page, /Outstanding commitments/)
  assert.match(page, /Linked Operations activity/)
  assert.match(page, /Estimated value/)
})

test('Operations and payments boundaries remain explicit', async () => {
  const payments = await readFile('src/pages/PaymentsPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

  assert.match(payments, /separate from the Operations ledger/)
  assert.match(operations, /Registration ticket payments stay in Registration Payments/)
  assert.match(operations, /This is not final event profit/)
  assert.equal(qrPayloadForTicketCode('AUG26-001'), 'GSV:TICKET:AUG26-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
})
