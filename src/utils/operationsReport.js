export function buildOperationsTotals(entries = []) {
  return entries.reduce((totals, entry) => {
    if (entry.status === 'cancelled') return totals
    const amount = Number(entry.amount) || 0
    if (entry.entryType === 'income') totals.income += amount
    if (entry.entryType === 'expense') totals.expenses += amount
    if (entry.entryType === 'refund') totals.refunds += amount
    if (entry.entryType === 'adjustment') totals.adjustments += amount
    totals.net = totals.income + totals.adjustments - totals.expenses - totals.refunds
    return totals
  }, {
    income: 0,
    expenses: 0,
    refunds: 0,
    adjustments: 0,
    net: 0,
  })
}

export function buildOperationsEntryCounts(entries = []) {
  return entries.reduce((summary, entry) => {
    summary.total += 1
    if (entry.status === 'cancelled') summary.cancelled += 1
    if (entry.status === 'pending' || entry.status === 'expected') summary.pending += 1
    if (entry.status === 'received' || entry.status === 'paid') summary.settled += 1
    return summary
  }, { total: 0, pending: 0, settled: 0, cancelled: 0 })
}

export function buildOperationsControlSummary(entries = []) {
  return entries.reduce((summary, entry) => {
    const amount = Number(entry.amount) || 0
    if (entry.status === 'cancelled') {
      summary.cancelledEntries += 1
      return summary
    }

    if (entry.status === 'pending' || entry.status === 'expected') {
      summary.openEntries += 1
      if (entry.entryType === 'income') summary.pendingIncome += amount
      if (entry.entryType === 'expense') summary.pendingExpenses += amount
      if (entry.entryType === 'refund') summary.pendingRefunds += amount
    }

    if (entry.status === 'received' || entry.status === 'paid') {
      summary.settledEntries += 1
    }

    return summary
  }, {
    openEntries: 0,
    settledEntries: 0,
    cancelledEntries: 0,
    pendingIncome: 0,
    pendingExpenses: 0,
    pendingRefunds: 0,
  })
}

export function buildOperationsLedgerReport(entries = [], { eventName = 'Selected Working Event', currency = 'BBD', scopeLabel = 'Current filtered view' } = {}) {
  const totals = buildOperationsTotals(entries)
  const counts = buildOperationsEntryCounts(entries)
  const control = buildOperationsControlSummary(entries)

  const lines = [
    `Operations ledger report: ${eventName}`,
    `Scope: ${scopeLabel}`,
    `Entries in current view: ${counts.total}`,
    `Pending / expected: ${counts.pending}`,
    `Settled: ${counts.settled}`,
    `Cancelled: ${counts.cancelled}`,
    `Open ledger items: ${control.openEntries}`,
    `Pending income: ${formatMoneyForReport(control.pendingIncome, currency)}`,
    `Pending expenses: ${formatMoneyForReport(control.pendingExpenses, currency)}`,
    `Income: ${formatMoneyForReport(totals.income, currency)}`,
    `Expenses: ${formatMoneyForReport(totals.expenses, currency)}`,
    `Refunds: ${formatMoneyForReport(totals.refunds, currency)}`,
    `Adjustments: ${formatMoneyForReport(totals.adjustments, currency)}`,
    `Net: ${formatMoneyForReport(totals.net, currency)}`,
    '',
  ]

  entries.forEach((entry) => {
    lines.push([
      entry.date || 'No date',
      labelForReport(entry.entryType),
      labelForReport(entry.status),
      entry.category || 'General',
      entry.label || 'Ledger entry',
      formatMoneyForReport(entry.amount, currency),
      entry.paidByOrPaidTo || '',
      entry.paymentReference || '',
    ].filter(Boolean).join(' | '))
  })

  return lines.join('\n')
}

function labelForReport(value = '') {
  return String(value || '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatMoneyForReport(value, currency = 'BBD') {
  return new Intl.NumberFormat('en-BB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0)
}
