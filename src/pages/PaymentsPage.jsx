import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CreditCard, Search } from 'lucide-react'
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
} from '../utils/financeUtils'
import { countEvidenceClasses, getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

const PAYMENT_FILTERS = [
  ['all', 'All'],
  ['needs-follow-up', 'Needs Follow-Up'],
  ['paid', 'Paid'],
  ['partial', 'Partial'],
  ['pending', 'Pending'],
  ['door', 'Door'],
  ['complimentary', 'Complimentary'],
  ['unknown', 'Unknown'],
  ['finance-review', 'Finance Review'],
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
      payments received, balances, methods, and follow-up flags. It is not a payment gateway, processor report,
      bank reconciliation, invoice system, or accounting ledger. Operations remains separate for sponsor income,
      vendor payments, expenses, refunds, reimbursements, and adjustments.
    </section>
  )
}

function PaymentCard({ row, currency }) {
  const details = [
    ['Expected', row.amountDue === null ? 'Needs review' : formatCurrency(row.amountDue, currency)],
    ['Received', formatCurrency(row.amountPaid, currency)],
    ['Balance', row.balanceDue === null ? 'Needs review' : formatCurrency(row.balanceDue, currency)],
    ['Price tier', row.priceTier || 'Needs review'],
    ['Ticket price', row.ticketPrice === null ? 'Price needs review' : formatCurrency(row.ticketPrice, currency)],
    ['Method', formatPaymentMethod(row.paymentMethod)],
    ['Reference', row.paymentReference || 'Not recorded'],
    ['Ticket', row.ticketCode || 'Missing ticket'],
  ]
  const warnings = row.warnings.map((item) => item.message).join(' ')

  return (
    <article className="rounded-2xl border border-[#F2E8E1] bg-white p-4" aria-label={`${row.name} payment record`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-bold text-[#2B1723]">{row.name}</h3>
          <p className="mt-1 text-xs text-[#816D62]">
            {row.personsAttending} guest{row.personsAttending === 1 ? '' : 's'}
          </p>
        </div>
        <span className="inline-flex w-fit max-w-full items-center rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">
          {row.displayStatus}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="Payment amounts">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl bg-[#FBF8F5] px-3 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#80685B]">{label}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-[#2B1723]">{value}</dd>
          </div>
        ))}
      </dl>

      {warnings ? (
        <div className="mt-3 flex gap-2 rounded-xl border border-[#F1DBA9] bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7A5818]" role="status">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 break-words">{warnings}</span>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#816D62]">No warning</p>
      )}
    </article>
  )
}

function FollowUpList({ rows, currency }) {
  const visibleRows = rows.slice(0, 8)
  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Needs Follow-Up</p>
          <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Registration payment records to review</h2>
        </div>
        <span className="w-fit rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5818]">
          {rows.length} flagged
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
          No registration payment follow-up is detected from the current records.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-[#F2E8E1]">
          {visibleRows.map((row) => (
            <div key={row.registrationId || row.name} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-bold text-[#2B1723]">{row.name}</p>
                <p className="mt-1 text-xs leading-5 text-[#816D62]">
                  {row.displayStatus} · Balance {formatCurrency(row.balanceDue, currency)}
                  {row.warnings[0]?.message ? ` · ${row.warnings[0].message}` : ''}
                </p>
              </div>
              <Link to={`/registrations?reviewRegistration=${encodeURIComponent(row.registrationId)}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#9A5260]">
                Review Registration
              </Link>
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

export function PaymentsPage() {
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('needs-follow-up')
  const [search, setSearch] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRegistrations([])
    setFilter('needs-follow-up')
    setSearch('')
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
  const visibleRows = workspace.rows.filter((row) => paymentFilterMatches(row, filter) && paymentSearchMatches(row, search))
  const currency = workspace.summary.currency
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(activeEvent?.eventId), [activeEvent?.eventId])

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
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Selected Working Event only</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Registration Payments</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
            Review registration charges, payments, balances, and records that need follow-up for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/registrations" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
            Open Registrations
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Registration records" value={workspace.summary.registrationCount} />
        <Metric label="Guests" value={workspace.summary.guestCount} />
        <Metric label="Expected Registration Income" value={formatCurrency(workspace.summary.expectedRegistrationIncome, currency)} />
        <Metric label="Payments Received" value={formatCurrency(workspace.summary.recordedPayments, currency)} />
        <Metric label="Outstanding Balance" value={formatCurrency(workspace.summary.outstandingBalance, currency)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Paid" value={workspace.summary.paidRegistrations} />
        <Metric label="Partial payments" value={workspace.summary.partialPaymentRegistrations} />
        <Metric label="Pending" value={workspace.summary.pendingRegistrations} />
        <Metric label="Door Paid" value={workspace.summary.doorPaidRegistrations} />
        <Metric label="To Pay at Door" value={workspace.summary.doorListRegistrations} />
        <Metric label="Complimentary registrations" value={workspace.summary.complimentaryRegistrations} help={`${workspace.summary.complimentaryGuests} complimentary guests`} />
        <Metric label="Unknown payment state" value={workspace.summary.unknownPaymentStates} />
        <Metric label="Finance review" value={workspace.summary.financeReviewCount} />
        <Metric label="Needs follow-up" value={workspace.summary.needsFollowUpCount} />
      </section>

      {evidenceAudit && (
        <section className="rounded-[24px] border border-[#D8C5A8] bg-[#FFFCF6] p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6" aria-labelledby="payments-evidence-heading">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7A5818]">Payment Evidence</p>
              <h2 id="payments-evidence-heading" className="mt-2 font-serif text-2xl text-[#2B1723]">Documentary support for CPB ticket income</h2>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-[#715D46]">
                Evidence classification is separate from payment status. The row-level matching package remains private until organizer review.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5818]">
              BBD {evidenceAudit.ticketIncome.documentaryToAppVariance.toFixed(2)} variance unresolved
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {countEvidenceClasses(evidenceAudit).map(([label, value]) => (
              <Metric
                key={label}
                label={label}
                value={typeof value === 'number' && value > 100 ? formatCurrency(value, currency) : value}
              />
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#715D46]">
            BBD $5,420 remains the app payment record. BBD $5,415 is the maximum Gmail-supported ticket value and must not replace app totals without row-level bank or 1stPay evidence.
          </p>
        </section>
      )}

      <FollowUpList rows={workspace.followUpRows} currency={currency} />

      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Payment Records</p>
            <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Registration payment records</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#B8A49A]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, ticket, reference"
                className="min-h-10 rounded-xl border border-[#E5D7CF] py-2 pl-9 pr-3 text-xs font-bold"
              />
            </label>
            <select aria-label="Payment record filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-10 rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
              {PAYMENT_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>{label} ({workspace.filterCounts[value] ?? workspace.rows.length})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#816D62]">
          <strong className="text-[#6B564C]">How to use this:</strong> review flags here, then update the source registration record in Guests & Registrations. Do not add registration payments to Operations unless they are intentionally separate event-level ledger entries.
        </div>

        <div className="mt-4 lg:hidden" aria-label="Responsive payment records">
          {visibleRows.length === 0 ? (
            <p className="rounded-xl border border-[#F2E8E1] p-6 text-sm text-[#816D62]">No registration payment records match the current filters.</p>
          ) : (
            <div className="grid gap-3">
              {visibleRows.map((row) => (
                <PaymentCard key={row.registrationId || `${row.name}-${row.ticketCode}`} row={row} currency={currency} />
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
                    <th className="px-3 py-2">Registration</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Ticket</th>
                    <th className="px-3 py-2">Tier / Price</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2">Balance</th>
                    <th className="px-3 py-2">Method / Reference</th>
                    <th className="px-3 py-2">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8E1]">
                  {visibleRows.map((row) => (
                    <tr key={row.registrationId || `${row.name}-${row.ticketCode}`}>
                      <td className="px-3 py-3">
                        <p className="font-bold text-[#2B1723]">{row.name}</p>
                        <p className="text-xs text-[#816D62]">{row.personsAttending} guest{row.personsAttending === 1 ? '' : 's'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{row.displayStatus}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">{row.ticketCode || 'Missing ticket'}</td>
                      <td className="px-3 py-3 text-xs text-[#816D62]">
                        <p className="font-bold text-[#2B1723]">{row.priceTier || 'Needs review'}</p>
                        <p>{row.ticketPrice === null ? 'Price needs review' : formatCurrency(row.ticketPrice, currency)}</p>
                      </td>
                      <td className="px-3 py-3 font-bold">{row.amountDue === null ? 'Needs review' : formatCurrency(row.amountDue, currency)}</td>
                      <td className="px-3 py-3 font-bold">{formatCurrency(row.amountPaid, currency)}</td>
                      <td className="px-3 py-3 font-bold">{row.balanceDue === null ? 'Needs review' : formatCurrency(row.balanceDue, currency)}</td>
                      <td className="max-w-[220px] break-words px-3 py-3 text-xs text-[#816D62]">{formatPaymentMethod(row.paymentMethod)}{row.paymentReference ? ` · ${row.paymentReference}` : ''}</td>
                      <td className="px-3 py-3">
                        {row.warnings.length > 0 ? (
                          <div className="flex max-w-xs gap-2 text-xs leading-5 text-[#7A5818]">
                            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                            <span>{row.warnings.map((item) => item.message).join(' ')}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#816D62]">No warning</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
