export const OPERATIONS_ENTRY_EFFECTS = [
  {
    entryType: 'income',
    settledStatuses: ['received'],
    cashEffect: 'inflow',
    commitmentEffect: 'none',
    reportingTreatment: 'Received event-level cash income. Expected or pending income is shown separately and is not counted as received cash.',
  },
  {
    entryType: 'expense',
    settledStatuses: ['paid'],
    cashEffect: 'outflow',
    commitmentEffect: 'pending expense when expected or pending',
    reportingTreatment: 'Paid expenses reduce Operations ledger difference. Expected or pending expenses are outstanding commitments only.',
  },
  {
    entryType: 'refund',
    settledStatuses: ['paid'],
    cashEffect: 'outflow',
    commitmentEffect: 'pending refund when expected or pending',
    reportingTreatment: 'Paid refunds are cash outflows. Pending refunds remain outstanding commitments.',
  },
  {
    entryType: 'reimbursement',
    settledStatuses: ['received'],
    cashEffect: 'inflow',
    commitmentEffect: 'pending reimbursement when expected or pending',
    reportingTreatment: 'Received reimbursements are cash inflows and stay separate from registration payments.',
  },
  {
    entryType: 'adjustment',
    settledStatuses: ['received', 'paid'],
    cashEffect: 'directional correction',
    commitmentEffect: 'none',
    reportingTreatment: 'Adjustments require a direction. Increase adds to ledger difference; decrease subtracts from ledger difference.',
  },
]

const DEFAULT_REPORT_MONEY_FORMATTER = new Intl.NumberFormat('en-BB', {
  style: 'currency',
  currency: 'BBD',
  minimumFractionDigits: 2,
})

export function operationEffectFor(entryType) {
  return OPERATIONS_ENTRY_EFFECTS.find((effect) => effect.entryType === entryType) || OPERATIONS_ENTRY_EFFECTS[0]
}

export function adjustmentDirection(entry = {}) {
  return entry.adjustmentDirection === 'decrease' ? 'decrease' : 'increase'
}

export function operationsEntryEffect(entry = {}) {
  const amount = Number(entry.amount) || 0
  const status = entry.status || 'pending'
  const entryType = entry.entryType || 'income'
  const cancelled = status === 'cancelled'
  const settled = operationEffectFor(entryType).settledStatuses.includes(status)
  const pending = !cancelled && (status === 'pending' || status === 'expected')
  const direction = adjustmentDirection(entry)

  if (cancelled) return { cashAmount: 0, commitmentAmount: 0, bucket: 'cancelled', direction }
  if (entryType === 'income') return { cashAmount: settled ? amount : 0, commitmentAmount: pending ? amount : 0, bucket: settled ? 'incomeReceived' : 'incomePending', direction }
  if (entryType === 'expense') return { cashAmount: settled ? -amount : 0, commitmentAmount: pending ? amount : 0, bucket: settled ? 'paidExpenses' : 'outstandingCommitments', direction }
  if (entryType === 'refund') return { cashAmount: settled ? -amount : 0, commitmentAmount: pending ? amount : 0, bucket: settled ? 'paidRefunds' : 'pendingRefunds', direction }
  if (entryType === 'reimbursement') return { cashAmount: settled ? amount : 0, commitmentAmount: pending ? amount : 0, bucket: settled ? 'reimbursementsReceived' : 'pendingReimbursements', direction }
  if (entryType === 'adjustment') {
    const signed = direction === 'decrease' ? -amount : amount
    return { cashAmount: settled ? signed : 0, commitmentAmount: 0, bucket: direction === 'decrease' ? 'negativeAdjustments' : 'positiveAdjustments', direction }
  }
  return { cashAmount: 0, commitmentAmount: 0, bucket: 'unclassified', direction }
}

export function buildOperationsTotals(entries = []) {
  return entries.reduce((totals, entry) => {
    if (entry.status === 'cancelled') return totals
    const amount = Number(entry.amount) || 0
    if (entry.entryType === 'income') totals.income += amount
    if (entry.entryType === 'expense') totals.expenses += amount
    if (entry.entryType === 'refund') totals.refunds += amount
    if (entry.entryType === 'reimbursement') totals.reimbursements += amount
    if (entry.entryType === 'adjustment') {
      const signedAdjustment = adjustmentDirection(entry) === 'decrease' ? -amount : amount
      totals.adjustments += signedAdjustment
    }
    totals.net = totals.income + totals.reimbursements + totals.adjustments - totals.expenses - totals.refunds
    return totals
  }, {
    income: 0,
    expenses: 0,
    refunds: 0,
    reimbursements: 0,
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
      if (entry.entryType === 'reimbursement') summary.pendingReimbursements += amount
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
    pendingReimbursements: 0,
  })
}

export function buildOperationsSettlementSummary(entries = []) {
  return entries.reduce((summary, entry) => {
    if (entry.status === 'cancelled') return summary
    const amount = Number(entry.amount) || 0

    if (entry.entryType === 'income' && entry.status === 'received') summary.incomeReceived += amount
    if (entry.entryType === 'income' && (entry.status === 'pending' || entry.status === 'expected')) summary.incomePending += amount
    if (entry.entryType === 'expense' && entry.status === 'paid') summary.paidExpenses += amount
    if (entry.entryType === 'expense' && (entry.status === 'pending' || entry.status === 'expected')) summary.outstandingCommitments += amount
    if (entry.entryType === 'refund' && entry.status === 'paid') summary.paidRefunds += amount
    if (entry.entryType === 'refund' && (entry.status === 'pending' || entry.status === 'expected')) summary.pendingRefunds += amount
    if (entry.entryType === 'reimbursement' && entry.status === 'received') summary.reimbursementsReceived += amount
    if (entry.entryType === 'reimbursement' && (entry.status === 'pending' || entry.status === 'expected')) summary.pendingReimbursements += amount
    if (entry.entryType === 'adjustment') {
      const signedAdjustment = adjustmentDirection(entry) === 'decrease' ? -amount : amount
      summary.adjustments += signedAdjustment
      if (signedAdjustment >= 0) summary.positiveAdjustments += signedAdjustment
      else summary.negativeAdjustments += Math.abs(signedAdjustment)
    }
    if (entry.category === 'In-kind support' && amount === 0) summary.inKindContributions += 1

    summary.operationsCashPosition = summary.incomeReceived + summary.reimbursementsReceived + summary.adjustments - summary.paidExpenses - summary.paidRefunds
    return summary
  }, {
    incomeReceived: 0,
    incomePending: 0,
    paidExpenses: 0,
    outstandingCommitments: 0,
    paidRefunds: 0,
    pendingRefunds: 0,
    reimbursementsReceived: 0,
    pendingReimbursements: 0,
    adjustments: 0,
    positiveAdjustments: 0,
    negativeAdjustments: 0,
    operationsCashPosition: 0,
    inKindContributions: 0,
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
    `Reimbursements: ${formatMoneyForReport(totals.reimbursements, currency)}`,
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

export function operationEntryLooksLikeRegistrationPayment(entry = {}) {
  if (entry?.entryType !== 'income') return false
  const haystack = [
    entry.category,
    entry.label,
    entry.paidByOrPaidTo,
    entry.paymentReference,
    entry.notes,
  ].join(' ').toLowerCase()

  return /\b(ticket|registration|guest|attendee|firstpay|door paid|pay at door|ticket sale|ticket revenue)\b/.test(haystack)
}

export function findPossibleRegistrationPaymentOverlap(entries = []) {
  return (Array.isArray(entries) ? entries : []).filter(operationEntryLooksLikeRegistrationPayment)
}

function labelForReport(value = '') {
  return String(value || '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatMoneyForReport(value, currency = 'BBD') {
  const amount = Number(value) || 0
  if (currency === 'BBD') return DEFAULT_REPORT_MONEY_FORMATTER.format(amount)
  return `${currency} ${amount.toFixed(2)}`
}
