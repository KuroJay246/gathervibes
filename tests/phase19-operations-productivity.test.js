import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildOperationsLedgerReport, buildOperationsTotals } from '../src/utils/operationsReport.js'

test('Phase 19 operations ledger report summarizes the visible view safely', () => {
  const entries = [
    { entryType: 'income', status: 'received', amount: 500, date: '2026-07-08', category: 'Sponsor', label: 'Sponsor payment' },
    { entryType: 'expense', status: 'pending', amount: 100, date: '2026-07-09', category: 'Decor', label: 'Decor deposit', paymentReference: 'INV-19' },
    { entryType: 'refund', status: 'cancelled', amount: 40, date: '2026-07-10', category: 'Guest', label: 'Refund' },
  ]

  const totals = buildOperationsTotals(entries)
  const report = buildOperationsLedgerReport(entries, { eventName: 'CODEX_TEST Live Verification Event', currency: 'BBD' })

  assert.equal(totals.income, 500)
  assert.equal(totals.expenses, 100)
  assert.equal(totals.refunds, 0)
  assert.match(report, /Operations ledger report: CODEX_TEST Live Verification Event/)
  assert.match(report, /Entries in current view: 3/)
  assert.match(report, /Pending \/ expected: 1/)
  assert.match(report, /Settled: 1/)
  assert.match(report, /Cancelled: 1/)
  assert.match(report, /Sponsor payment/)
  assert.match(report, /INV-19/)
})

test('Phase 19 operations page keeps existing design while adding practical filtering and export helpers', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')

  assert.match(operations, /Search entry, category, note, reference/)
  assert.match(operations, /Clear filters/)
  assert.match(operations, /Copy view/)
  assert.match(operations, /Print view/)
  assert.match(operations, /Entries in current view/)
  assert.match(operations, /Pending \/ expected/)
  assert.match(operations, /Visible income/)
  assert.match(operations, /Visible net/)
  assert.match(operations, /This tracker is separate from ticket sales/)
})
