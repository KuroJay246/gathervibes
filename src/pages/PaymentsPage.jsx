import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, CheckCircle2, ChevronRight, CreditCard, ExternalLink, Search } from 'lucide-react'
import { useActiveEvent } from '../events/useActiveEvent'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { subscribeToRegistrations } from '../services/registrationService'
import {
  buildPaymentsWorkspace,
  formatCurrency,
  formatPaymentMethod,
  paymentFilterMatches,
  paymentSearchMatches,
  PAYMENT_METHODS,
} from '../utils/financeUtils'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

const PAYMENT_FILTERS = [
  ['all', 'All'],
  ['payment-follow-up', 'Payment Follow-Up'],
  ['data-review', 'All Data Review'],
  ['action-required', 'Action Required'],
  ['internal-cleanup', 'Internal Cleanup'],
  ['historical-limitation', 'Historical Limitation'],
  ['paid-amount-not-recorded', 'Paid — Amount Not Recorded'],
  ['missing-method', 'Missing Method'],
  ['missing-reference', 'Missing Reference'],
  ['possible-duplicate', 'Possible Duplicate'],
  ['amount-mismatch', 'Amount Mismatch'],
  ['paid', 'Paid'],
  ['partial', 'Partial'],
  ['pending', 'Pending'],
  ['door', 'Door'],
  ['complimentary', 'Complimentary'],
  ['unknown', 'Unknown'],
]

const PAYMENT_METHOD_FILTERS = [
  ['all', 'All methods'],
  ...PAYMENT_METHODS.map((method) => [method, formatPaymentMethod(method)]),
]

function Metric({ label, value, help }) {
  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3" aria-label={`${label}: ${value}`}>
      <p className="text-lg font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      {help && <p className="mt-1 text-xs leading-5 text-[#816D62]">{help}</p>}
    </div>
  )
}

function BoundaryNotice() {
  return (
    <section className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
      <strong className="text-[#4E3928]">Registration payment records only.</strong> This page reviews registration charges,
      payments received, balances, methods, follow-up, and internal data review. It is not a payment gateway, bank reconciliation,
      invoice system, or accounting ledger. Operations remains separate for sponsor income, vendor payments, expenses, refunds,
      reimbursements, adjustments, and other event-level obligations.
    </section>
  )
}

function receivedDisplay(row, currency) {
  if (['Paid — Amount Not Recorded', 'Door Paid — Amount Not Recorded'].includes(row.reviewLabel) && row.amountPaid === 0) {
    return 'Amount not recorded'
  }
  return formatCurrency(row.amountPaid, currency)
}

function reviewSummaryText(row) {
  if (!row.reviewLabel) return ''
  const secondaryLabels = (row.dataReviewCategoryLabels || [])
    .filter((label) => label !== row.reviewLabel)
    .slice(0, 2)
  const details = [row.reviewMessage, ...secondaryLabels].filter(Boolean)
  return `${row.reviewCategoryLabel}: ${row.reviewLabel}${details.length ? ` · ${details.join(' · ')}` : ''}`
}

function followUpState(row) {
  if (row.paymentFollowUpRequired && row.outstandingPayment) return 'Waiting for Payment'
  if (row.paymentFollowUpRequired) return 'Follow-Up Required'
  if (row.dataReviewActionRequired) return 'Payment Review Needed'
  if (row.dataReviewInternalCleanup) return 'Internal Cleanup'
  if (row.dataReviewHistoricalLimitation) return 'Historical Limitation'
  return 'No Follow-Up Needed'
}

function formatDateValue(value) {
  if (!value) return 'Not recorded'
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return date.toLocaleDateString('en-BB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildTaskHref(row) {
  const params = new URLSearchParams({
    title: `Follow up payment with ${row.name}`.slice(0, 160),
    category: 'Payments',
    status: 'Not Started',
    priority: row.outstandingPayment || row.dataReviewActionRequired ? 'High' : 'Normal',
    responsibleLabel: 'Organizer',
    notes: `${row.name}${row.ticketCode ? ` · Ticket ${row.ticketCode}` : ''}${row.reviewLabel ? ` · ${row.reviewLabel}` : ''}`,
  })
  return `/tasks?${params.toString()}`
}

function PaymentCard({ row, currency, onOpenDetails }) {
  const details = [
    ['Expected', row.amountDue === null ? 'Needs review' : formatCurrency(row.amountDue, currency)],
    ['Received', receivedDisplay(row, currency)],
    ['Outstanding', row.displayBalanceDue === null ? 'Needs review' : formatCurrency(row.displayBalanceDue, currency)],
    ['Price tier', row.priceTier || 'Needs review'],
    ['Method', formatPaymentMethod(row.paymentMethod)],
    ['Reference', row.paymentReference || 'Not recorded'],
    ['Ticket', row.ticketCode || 'Missing ticket'],
  ]

  return (
    <article className="rounded-2xl border border-[#F2E8E1] bg-white p-4" aria-label={`${row.name} payment record`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-[#2B1723]">{row.name}</h3>
          <p className="mt-1 text-xs text-[#816D62]">
            {row.personsAttending} guest{row.personsAttending === 1 ? '' : 's'} · {followUpState(row)}
          </p>
        </div>
        <span className="inline-flex w-fit max-w-full items-center rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">
          {row.displayStatus}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Payment amounts">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-[#FBF8F5] px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#80685B]">{label}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-[#2B1723]">{value}</dd>
          </div>
        ))}
      </dl>

      {row.reviewLabel ? (
        <div className="mt-3 flex gap-2 rounded-xl border border-[#F1DBA9] bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7A5818]" role="status">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{reviewSummaryText(row)}</span>
        </div>
      ) : (
        <div className="mt-3 flex gap-2 rounded-xl border border-[#D9EBD8] bg-[#EAF6EF] p-3 text-xs leading-5 text-[#244B32]">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span>No payment review item is currently open.</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onOpenDetails(row.registrationId)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">
          View details
        </button>
        <Link to={buildTaskHref(row)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">
          Create Follow-Up Task
        </Link>
      </div>
    </article>
  )
}

function ReviewList({ eyebrow, title, description, rows, currency, emptyMessage, onOpenDetails }) {
  const visibleRows = rows.slice(0, 8)
  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{eyebrow}</p>
          <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-[#816D62]">{description}</p>
        </div>
        <span className="w-fit rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5818]">
          {rows.length} flagged
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-5 divide-y divide-[#F2E8E1]">
          {visibleRows.map((row) => (
            <div key={row.registrationId || row.name} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-bold text-[#2B1723]">{row.name}</p>
                <p className="mt-1 text-xs leading-5 text-[#816D62]">
                  {row.displayStatus} · Balance {formatCurrency(row.displayBalanceDue ?? 0, currency)}
                  {row.reviewLabel ? ` · ${row.reviewLabel}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpenDetails(row.registrationId)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#9A5260]">
                  View details
                </button>
                <Link to={`/registrations?reviewRegistration=${encodeURIComponent(row.registrationId)}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#9A5260]">
                  Review Registration
                </Link>
              </div>
            </div>
          ))}
          {rows.length > visibleRows.length && (
            <p className="pt-4 text-xs text-[#816D62]">Plus {rows.length - visibleRows.length} more records in the table below.</p>
          )}
        </div>
      )}
    </section>
  )
}

function PaymentDetailsPanel({ row, currency, onClose }) {
  if (!row) return null

  const detailRows = [
    ['Registrant', row.name],
    ['Buyer', row.buyerName || 'Not recorded'],
    ['Guests', String(row.personsAttending)],
    ['Registration source', row.source || 'Not recorded'],
    ['Ticket code', row.ticketCode || 'Missing ticket'],
    ['Tier / Price', row.priceTier || 'Needs review'],
    ['Ticket price', row.ticketPrice === null ? 'Needs review' : formatCurrency(row.ticketPrice, currency)],
    ['Amount due', row.amountDue === null ? 'Needs review' : formatCurrency(row.amountDue, currency)],
    ['Amount paid', receivedDisplay(row, currency)],
    ['Balance', row.displayBalanceDue === null ? 'Needs review' : formatCurrency(row.displayBalanceDue, currency)],
    ['Payment status', row.displayStatus],
    ['Follow-Up', followUpState(row)],
    ['Payment method', formatPaymentMethod(row.paymentMethod)],
    ['Payment reference', row.paymentReference || 'Not recorded'],
    ['Evidence', row.paymentEvidenceClass || 'Not recorded'],
    ['Last updated', formatDateValue(row.updatedAt)],
    ['Updated by', row.updatedBy || 'Not recorded'],
  ]

  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Payment detail</p>
          <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{row.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#816D62]">
            Registration summary, payment evidence, and follow-up context for the selected record.
          </p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">
          Close details
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {detailRows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#FBF8F5] px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#80685B]">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-[#2B1723]">{value}</p>
          </div>
        ))}
      </div>

      {row.reviewLabel ? (
        <div className="mt-4 rounded-xl border border-[#F1DBA9] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#7A5818]">
          <strong>{row.reviewCategoryLabel}: {row.reviewLabel}</strong>
          {row.reviewMessage ? ` ${row.reviewMessage}` : ''}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm leading-6 text-[#244B32]">
          No payment review issue is currently open on this registration record.
        </div>
      )}

      {row.notes && (
        <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#6B564C]">
          <strong>Registration notes:</strong> {row.notes}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/registrations?reviewRegistration=${encodeURIComponent(row.registrationId)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">
          Open Registration <ExternalLink className="size-3.5" />
        </Link>
        <Link to={buildTaskHref(row)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">
          Create Follow-Up Task <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}

export function PaymentsPage() {
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('payment-follow-up')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRegistrations([])
    setFilter('payment-follow-up')
    setMethodFilter('all')
    setSearch('')
    setSelectedRegistrationId('')
    setLoading(Boolean(activeEvent?.eventId))
    if (!activeEvent?.eventId) return undefined
    return subscribeToRegistrations(
      activeEvent.eventId,
      (rows) => {
        setRegistrations(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  const workspace = useMemo(() => buildPaymentsWorkspace(registrations, activeEvent), [activeEvent, registrations])
  const activeFilter = filter === 'payment-follow-up'
    && (workspace.filterCounts['payment-follow-up'] || 0) === 0
    ? workspace.summary.actionRequiredCount > 0
      ? 'action-required'
      : workspace.summary.internalCleanupCount > 0
        ? 'internal-cleanup'
        : workspace.summary.historicalLimitationCount > 0
          ? 'historical-limitation'
          : filter
    : filter
  const visibleRows = workspace.rows.filter((row) => {
    const filterMatch = paymentFilterMatches(row, activeFilter)
    const searchMatch = paymentSearchMatches(row, search)
    const methodMatch = methodFilter === 'all' ? true : row.paymentMethod === methodFilter
    return filterMatch && searchMatch && methodMatch
  })
  const currency = workspace.summary.currency
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(activeEvent?.eventId), [activeEvent?.eventId])
  const selectedRow = selectedRegistrationId
    ? workspace.rows.find((row) => row.registrationId === selectedRegistrationId) || null
    : null

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No selected event"
        description="Select a Working Event before reviewing registration payment records."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading registration payments..." />

  return (
    <div data-tour-id="payments-workspace" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Selected Working Event only</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Registration Payments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
            Review who still owes money, which records need evidence or cleanup, and what follow-up should happen next for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/registrations" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
            Open Registrations
          </Link>
          <Link to="/tasks" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
            Open Tasks
          </Link>
          <Link to="/event-review" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
            Open Reports
          </Link>
          <Link to="/payments/reconciliation" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
            Reconciliation Preview
          </Link>
        </div>
      </header>

      <BoundaryNotice />

      <section data-tour-id="payments-summary-metrics" className="phase23v-metric-grid">
        <Metric label="Expected Registration Income" value={formatCurrency(workspace.summary.expectedRegistrationIncome, currency)} />
        <Metric label="Payments Received" value={formatCurrency(workspace.summary.recordedPayments, currency)} />
        <Metric label="Outstanding Balance" value={formatCurrency(workspace.summary.outstandingBalance, currency)} />
        <Metric label="Fully Paid" value={workspace.summary.paidRegistrations} />
        <Metric label="Partially Paid" value={workspace.summary.partialPaymentRegistrations} />
      </section>

      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Payment Records</p>
            <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Registration payment records</h2>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#816D62]">
              Search the full selected-event payment workspace, filter by payment state or method, and open details without leaving this page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#B8A49A]" />
              <input
                id="payment-record-search"
                name="paymentRecordSearch"
                aria-label="Search payment records"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, ticket, reference"
                className="min-h-10 rounded-xl border border-[#E5D7CF] py-2 pl-9 pr-3 text-xs font-bold"
              />
            </label>
            <select id="payment-record-filter" name="paymentRecordFilter" aria-label="Payment record filter" value={activeFilter} onChange={(event) => setFilter(event.target.value)} className="min-h-10 rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
              {PAYMENT_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label} ({workspace.filterCounts[value] ?? workspace.rows.length})</option>
              ))}
            </select>
            <select id="payment-method-filter" name="paymentMethodFilter" aria-label="Payment method filter" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="min-h-10 rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
              {PAYMENT_METHOD_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#816D62]">
          <strong className="text-[#6B564C]">How to use this:</strong> Payment Follow-Up is for registrations that may still need guest contact or payment collection. Internal review is for evidence, contradictions, or cleanup. Historical limitations remain visible for audit context without inflating live debt or reminder counts.
        </div>

        <div className="mt-4 lg:hidden" aria-label="Responsive payment records">
          {visibleRows.length === 0 ? (
            <p className="rounded-xl border border-[#F2E8E1] p-6 text-sm text-[#816D62]">No registration payment records match the current filters.</p>
          ) : (
            <div className="grid gap-3">
              {visibleRows.map((row) => (
                <PaymentCard key={row.registrationId || `${row.name}-${row.ticketCode}`} row={row} currency={currency} onOpenDetails={setSelectedRegistrationId} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 hidden overflow-hidden rounded-xl border border-[#F2E8E1] lg:block">
          {visibleRows.length === 0 ? (
            <p className="p-6 text-sm text-[#816D62]">No registration payment records match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#80685B]">
                  <tr>
                    <th className="px-3 py-2">Registrant</th>
                    <th className="px-3 py-2">Guests</th>
                    <th className="px-3 py-2">Amount Due</th>
                    <th className="px-3 py-2">Amount Paid</th>
                    <th className="px-3 py-2">Balance</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Follow-Up</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">Reference</th>
                    <th className="px-3 py-2">Last Updated</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8E1]">
                  {visibleRows.map((row) => (
                    <tr key={row.registrationId || `${row.name}-${row.ticketCode}`}>
                      <td className="px-3 py-3">
                        <p className="font-bold text-[#2B1723]">{row.name}</p>
                        <p className="text-xs text-[#816D62]">{row.priceTier || 'Needs review'}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">{row.personsAttending}</td>
                      <td className="px-3 py-3 font-bold">{row.amountDue === null ? 'Needs review' : formatCurrency(row.amountDue, currency)}</td>
                      <td className="px-3 py-3 font-bold">{receivedDisplay(row, currency)}</td>
                      <td className="px-3 py-3 font-bold">{row.displayBalanceDue === null ? 'Needs review' : formatCurrency(row.displayBalanceDue, currency)}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{row.displayStatus}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">{followUpState(row)}</td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">{formatPaymentMethod(row.paymentMethod)}</td>
                      <td className="max-w-[180px] break-words px-3 py-3 text-xs text-[#816D62]">{row.paymentReference || 'Not recorded'}</td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">{formatDateValue(row.updatedAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setSelectedRegistrationId(row.registrationId)} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                            Details
                          </button>
                          <Link to={buildTaskHref(row)} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                            Task
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {selectedRow && (
        <PaymentDetailsPanel row={selectedRow} currency={currency} onClose={() => setSelectedRegistrationId('')} />
      )}

      <section className="phase23v-metric-grid">
        <Metric label="Unpaid" value={workspace.summary.pendingRegistrations + workspace.summary.doorListRegistrations} />
        <Metric label="Complimentary" value={workspace.summary.complimentaryRegistrations} help={`${workspace.summary.complimentaryGuests} guests`} />
        <Metric label="Door Paid" value={workspace.summary.doorPaidRegistrations} />
        <Metric label="Payment Review Needed" value={workspace.summary.actionRequiredCount + workspace.summary.internalCleanupCount} />
        <Metric label="Follow-Up Required" value={workspace.summary.paymentFollowUpCount} />
      </section>

      <ReviewList
        eyebrow="Payment Follow-Up"
        title="Records that may still need organizer action"
        description="Use this list when money may still be due, a payment is partial, or the current payment state is not yet settled."
        rows={workspace.paymentFollowUpRows}
        currency={currency}
        emptyMessage={workspace.summary.prominentDataReviewCount > 0 || workspace.summary.historicalLimitationCount > 0
          ? 'No guest payment follow-up is detected. Review counts below are internal finance review only.'
          : 'No guest payment follow-up is detected from the current records.'}
        onOpenDetails={setSelectedRegistrationId}
      />

      <ReviewList
        eyebrow="Internal Review"
        title="Records that still need organizer review"
        description="Use this list for data contradictions, missing evidence, duplicate references, or internal cleanup that should be resolved without treating the guest as unpaid by default."
        rows={workspace.prominentDataReviewRows}
        currency={currency}
        emptyMessage="No active finance review is currently detected."
        onOpenDetails={setSelectedRegistrationId}
      />

      <details className="phase23v-panel">
        <summary className="phase23v-summary">Payment status and review detail</summary>
        <div className="phase23v-body space-y-4">
          <section className="phase23v-metric-grid">
            <Metric label="Paid" value={workspace.summary.paidRegistrations} />
            <Metric label="Partial payments" value={workspace.summary.partialPaymentRegistrations} />
            <Metric label="Pending" value={workspace.summary.pendingRegistrations} />
            <Metric label="Door Paid" value={workspace.summary.doorPaidRegistrations} />
            <Metric label="To Pay at Door" value={workspace.summary.doorListRegistrations} />
          </section>
          <section className="phase23v-metric-grid">
            <Metric label="Action Required" value={workspace.summary.actionRequiredCount} />
            <Metric label="Internal Cleanup" value={workspace.summary.internalCleanupCount} />
            <Metric label="Historical Limitations" value={workspace.summary.historicalLimitationCount} />
            <Metric label="Informational Only" value={workspace.summary.informationalOnlyCount} />
            <Metric label="Paid — Amount Not Recorded" value={workspace.summary.paidAmountNotRecordedCount} />
          </section>
          <p className="text-xs leading-5 text-[#816D62]">
            Historical and informational review items stay searchable for audit context without being treated as current guest debt by default.
          </p>
        </div>
      </details>

      {evidenceAudit && (
        <section className="rounded-2xl border border-[#D8C5A8] bg-[#FFFCF6] p-4 text-sm leading-6 text-[#715D46]" aria-label="Historical reconciliation moved to Reports">
          <strong className="text-[#4E3928]">Historical reconciliation evidence is not part of the daily Registration Payments workflow.</strong>
          {' '}Use Reports for historical reconciliation detail and Reconciliation Preview for a read-only workbook comparison. The totals above remain the current registration payment records only.
        </section>
      )}
    </div>
  )
}
