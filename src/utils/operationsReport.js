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

export function buildOperationsLedgerReport(entries = [], { eventName = 'Selected Working Event', currency = 'BBD' } = {}) {
  const totals = buildOperationsTotals(entries)
  const counts = buildOperationsEntryCounts(entries)

  const lines = [
    `Operations ledger report: ${eventName}`,
    `Entries in current view: ${counts.total}`,
    `Pending / expected: ${counts.pending}`,
    `Settled: ${counts.settled}`,
    `Cancelled: ${counts.cancelled}`,
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
