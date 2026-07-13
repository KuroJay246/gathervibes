import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildOperationsControlSummary,
  buildOperationsLedgerReport,
  buildOperationsTotals,
} from '../src/utils/operationsReport.js'

test('Phase 19 operations ledger report summarizes the visible view safely', () => {
  const entries = [
    { entryType: 'income', status: 'received', amount: 500, date: '2026-07-08', category: 'Sponsor', label: 'Sponsor payment' },
    { entryType: 'expense', status: 'pending', amount: 100, date: '2026-07-09', category: 'Decor', label: 'Decor deposit', paymentReference: 'INV-19' },
    { entryType: 'refund', status: 'cancelled', amount: 40, date: '2026-07-10', category: 'Guest', label: 'Refund' },
  ]

  const totals = buildOperationsTotals(entries)
  const control = buildOperationsControlSummary(entries)
  const report = buildOperationsLedgerReport(entries, { eventName: 'CODEX_TEST Live Verification Event', currency: 'BBD' })

  assert.equal(totals.income, 500)
  assert.equal(totals.expenses, 100)
  assert.equal(totals.refunds, 0)
  assert.equal(control.openEntries, 1)
  assert.equal(control.pendingExpenses, 100)
  assert.match(report, /Operations ledger report: CODEX_TEST Live Verification Event/)
  assert.match(report, /Scope: Current filtered view/)
  assert.match(report, /Entries in current view: 3/)
  assert.match(report, /Pending \/ expected: 1/)
  assert.match(report, /Settled: 1/)
  assert.match(report, /Cancelled: 1/)
  assert.match(report, /Open ledger items: 1/)
  assert.match(report, /Pending expenses: \$100\.00/)
  assert.match(report, /Sponsor payment/)
  assert.match(report, /INV-19/)
})

test('Phase 19 operations helper keeps filtered summaries scoped to the copied current view only', () => {
  const visibleEntries = [
    { entryType: 'income', status: 'received', amount: 250, date: '2026-07-11', category: 'Sponsor', label: 'Visible sponsor' },
    { entryType: 'expense', status: 'pending', amount: 75, date: '2026-07-12', category: 'Decor', label: 'Visible decor' },
  ]
  const hiddenEntry = { entryType: 'income', status: 'received', amount: 999, date: '2026-07-13', category: 'Hidden', label: 'Hidden row' }
  const report = buildOperationsLedgerReport(visibleEntries, { eventName: 'CODEX_TEST only', currency: 'BBD', scopeLabel: 'Current filtered view (status: Pending)' })

  assert.match(report, /Operations ledger report: CODEX_TEST only/)
  assert.match(report, /Scope: Current filtered view \(status: Pending\)/)
  assert.match(report, /Entries in current view: 2/)
  assert.match(report, /Visible sponsor/)
  assert.match(report, /Visible decor/)
  assert.doesNotMatch(report, new RegExp(hiddenEntry.label))
})

test('Phase 19 operations page keeps existing design while adding practical filtering and export helpers', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')

  assert.match(operations, /Search entry, category, note, reference/)
  assert.match(operations, /setEntries\(\[\]\)/)
  assert.match(operations, /setRegistrations\(\[\]\)/)
  assert.match(operations, /setFilters\(DEFAULT_FILTERS\)/)
  assert.match(operations, /setLoading\(Boolean\(activeEvent\?\.eventId\)\)/)
  assert.match(operations, /Clear filters/)
  assert.match(operations, /Copy view/)
  assert.match(operations, /Print view/)
  assert.match(operations, /Current view scope:/)
  assert.match(operations, /Copy view and Print view use only the rows currently visible under this scope/)
  assert.match(operations, /buildOperationsLedgerReport\(filteredEntries/)
  assert.match(operations, /scopeLabel: filterScopeLabel/)
  assert.match(operations, /navigator\.clipboard\.writeText\(report\)/)
  assert.match(operations, /onClick=\{\(\) => window\.print\(\)\}/)
  assert.match(operations, /Entries in current view/)
  assert.match(operations, /Pending \/ expected/)
  assert.match(operations, /Open ledger items/)
  assert.match(operations, /Pending income/)
  assert.match(operations, /Pending expenses/)
  assert.match(operations, /Visible income/)
  assert.match(operations, /Visible Operations Net Position/)
  assert.match(operations, /What this means:/)
  assert.match(operations, /This tracker is separate from registration payment records/)
})
