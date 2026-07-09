import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Copy, Edit3, Plus, Printer, ReceiptText, Save, Search, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { buildFinanceSummary, formatCurrency } from '../utils/financeUtils'
import { subscribeToRegistrations } from '../services/registrationService'
import {
  LEDGER_ENTRY_TYPES,
  LEDGER_STATUSES,
  cancelLedgerEntry,
  createLedgerEntry,
  subscribeToOperationsLedger,
  updateLedgerEntry,
} from '../services/operationsLedgerService'
import { buildOperationsEntryCounts, buildOperationsLedgerReport, buildOperationsTotals } from '../utils/operationsReport'
import { InfoHint } from '../components/ui/InfoHint'
import { canWriteOperations, isApprovedAdmin } from '../utils/accessRoles'

const EMPTY_FORM = {
  entryType: 'income',
  category: '',
  label: '',
  amount: '',
  paymentMethod: 'unknown',
  paymentReference: '',
  paidByOrPaidTo: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  notes: '',
}

const PAYMENT_METHOD_OPTIONS = [
  ['cash', 'Cash'],
  ['bank-transfer', 'Bank Transfer'],
  ['firstpay', 'FirstPay'],
  ['card', 'Card'],
  ['unknown', 'Unknown / Not Recorded'],
]

const STATUS_HELP = {
  expected: 'Expected means the money or cost is planned but not settled yet.',
  received: 'Received means income has already been collected.',
  paid: 'Paid means an expense or refund has already gone out.',
  pending: 'Pending means this entry is not settled yet.',
  cancelled: 'Cancelled keeps the entry visible but removes it from totals.',
}

const DEFAULT_FILTERS = { type: 'all', category: '', status: 'all', search: '' }

function labelFor(value) {
  return String(value || '').split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function FieldHelp({ children }) {
  return <p className="mt-1 text-[11px] leading-4 text-[#8C7567]">{children}</p>
}

function buildFilterScopeLabel(filters = DEFAULT_FILTERS) {
  const parts = []
  if (filters.type && filters.type !== 'all') parts.push(`type: ${labelFor(filters.type)}`)
  if (filters.status && filters.status !== 'all') parts.push(`status: ${labelFor(filters.status)}`)
  if (filters.category) parts.push(`category: ${filters.category}`)
  if (filters.search) parts.push(`search: ${filters.search}`)
  return parts.length > 0 ? `Current filtered view (${parts.join(' / ')})` : 'Current filtered view (all visible ledger rows)'
}

export function OperationsPage() {
  const { user, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const adminUser = isApprovedAdmin(access)
  const canEditOperations = canWriteOperations(access, activeEvent?.eventId)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setEntries([])
    setRegistrations([])
    setFilters(DEFAULT_FILTERS)
    setForm(EMPTY_FORM)
    setEditing(null)
    setMessage('')
    setError('')
    setLoading(Boolean(activeEvent?.eventId))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined

    const unsubscribeRegs = adminUser
      ? subscribeToRegistrations(activeEvent.eventId, setRegistrations, () => {})
      : () => setRegistrations([])
    const unsubscribeLedger = subscribeToOperationsLedger(
      activeEvent.eventId,
      (rows) => {
        setEntries(rows)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error(err)
        setError('Could not load operations ledger. Check permissions and Firestore rules.')
        setLoading(false)
      },
    )

    return () => {
      unsubscribeRegs()
      unsubscribeLedger()
    }
  }, [activeEvent?.eventId, adminUser])

  const filteredEntries = entries.filter((entry) => {
    if (filters.type !== 'all' && entry.entryType !== filters.type) return false
    if (filters.status !== 'all' && entry.status !== filters.status) return false
    if (filters.category && !String(entry.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false
    if (filters.search) {
      const query = filters.search.toLowerCase()
      const haystack = [
        entry.label,
        entry.category,
        entry.paidByOrPaidTo,
        entry.paymentReference,
        entry.notes,
        entry.date,
        entry.entryType,
        entry.status,
      ].map((value) => String(value || '').toLowerCase())
      if (!haystack.some((value) => value.includes(query))) return false
    }
    return true
  })

  const financeSummary = useMemo(() => buildFinanceSummary(registrations, activeEvent), [registrations, activeEvent])
  const operationsTotals = useMemo(() => buildOperationsTotals(entries), [entries])
  const filteredTotals = useMemo(() => buildOperationsTotals(filteredEntries), [filteredEntries])
  const filteredCounts = useMemo(() => buildOperationsEntryCounts(filteredEntries), [filteredEntries])
  const filterScopeLabel = useMemo(() => buildFilterScopeLabel(filters), [filters])
  const netEventPosition = financeSummary.totalCollected + operationsTotals.income + operationsTotals.adjustments - operationsTotals.expenses - operationsTotals.refunds

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No selected event"
        description="Select a Working Event before tracking event operations money."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading event operations ledger..." />

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditing(null)
  }

  function editEntry(entry) {
    if (!canEditOperations) return
    setEditing(entry)
    setForm({
      entryType: entry.entryType || 'income',
      category: entry.category || '',
      label: entry.label || '',
      amount: entry.amount ?? '',
      paymentMethod: entry.paymentMethod || 'unknown',
      paymentReference: entry.paymentReference || '',
      paidByOrPaidTo: entry.paidByOrPaidTo || '',
      date: entry.date || new Date().toISOString().slice(0, 10),
      status: entry.status || 'pending',
      notes: entry.notes || '',
    })
  }

  async function saveEntry(event) {
    event.preventDefault()
    if (!canEditOperations) {
      setError('This role can view assigned operations entries but cannot create or edit them.')
      return
    }
    if (!form.label.trim()) {
      setError('Entry label is required.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      if (editing) {
        await updateLedgerEntry(editing, form, user)
        setMessage('Operations ledger entry updated.')
      } else {
        await createLedgerEntry(form, activeEvent.eventId, user)
        setMessage('Operations ledger entry added.')
      }
      resetForm()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError(err.message || 'Could not save operations ledger entry.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelEntry(entry) {
    if (!canEditOperations) {
      setError('This role can view assigned operations entries but cannot cancel them.')
      return
    }
    if (!window.confirm(`Cancel ledger entry "${entry.label}" for ${activeEvent.eventName}?`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await cancelLedgerEntry(entry, user)
      setMessage('Operations ledger entry cancelled.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError(err.message || 'Could not cancel ledger entry.')
    } finally {
      setSaving(false)
    }
  }

  async function copyCurrentViewReport() {
    const report = buildOperationsLedgerReport(filteredEntries, {
      eventName: activeEvent?.eventName,
      currency: financeSummary.currency,
      scopeLabel: filterScopeLabel,
    })

    try {
      await navigator.clipboard.writeText(report)
      setMessage('Current operations ledger view copied.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('Could not copy the current ledger view.')
    }
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Selected Working Event only</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Event Operations / Money Tracker</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Tracking non-ticket money for <strong>{activeEvent.eventName}</strong>. No payment processing is enabled.
          </p>
        </div>
        <Link to="/dashboard" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">Back to Dashboard</Link>
      </header>

      <section className="flex items-center gap-2 rounded-xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        <p className="font-semibold text-[#6B564C]">
          Operations Ledger is active for sponsor income, vendor payments, expenses, reimbursements, and refunds.
          {!canEditOperations && ' Your role is read-only for this assigned event.'}
        </p>
        <InfoHint label="Operations Ledger Info">
          This tracker is separate from ticket sales. Ticket revenue comes from registrations. Future modules for tasks, supplies, vendors, sponsors, school/baker tracking, event-day run sheets, reimbursements, and expense reporting are planned but not active yet.
        </InfoHint>
      </section>

      {error && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{error}</div>}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ...(adminUser ? [
            ['Ticket expected revenue', formatCurrency(financeSummary.totalExpected)],
            ['Ticket collected', formatCurrency(financeSummary.totalCollected)],
            ['Ticket outstanding', formatCurrency(financeSummary.totalOutstanding)],
          ] : []),
          ['Sponsor/other income', formatCurrency(operationsTotals.income)],
          ['Expenses', formatCurrency(operationsTotals.expenses)],
          ['Refunds', formatCurrency(operationsTotals.refunds)],
          ['Adjustments', formatCurrency(operationsTotals.adjustments)],
          ['Net event position', formatCurrency(netEventPosition)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#EEDFD6] bg-white p-4">
            <p className="text-lg font-bold text-[#2B1723]">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {canEditOperations && <form onSubmit={saveEntry} className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl text-[#2B1723]">{editing ? 'Edit entry' : 'Add entry'}</h3>
            {editing && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-[#8C7567] hover:bg-[#F2E8E1]" aria-label="Cancel edit"><X className="size-4" /></button>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Entry Type</span>
              <select value={form.entryType} onChange={(event) => setForm((current) => ({ ...current, entryType: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {LEDGER_ENTRY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
              <FieldHelp>Choose whether this entry is money coming in, money going out, or an internal correction.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <FieldHelp>Track whether this entry is planned, pending, paid, cancelled, or already received. {STATUS_HELP[form.status]}</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Category</span>
              <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Sponsor, Baker payment, Venue, Decor" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Group this entry so event costs and income are easier to review later.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Amount</span>
              <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="100.00" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Enter the amount for this operation. Leave blank only when no amount is known yet.</FieldHelp>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Short description / title</span>
              <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Sponsor payment from Cake Co." className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use a short name that makes this entry easy to recognize.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Payment Method</span>
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {PAYMENT_METHOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <FieldHelp>Choose how the payment was made or recorded. Use Unknown / Not Recorded only when the detail is genuinely not available yet.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Payment Reference</span>
              <input value={form.paymentReference} onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))} placeholder="Receipt or transaction reference" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Add a receipt number, transfer note, FirstPay reference, invoice number, or other proof reference.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Paid By / Paid To</span>
              <input value={form.paidByOrPaidTo} onChange={(event) => setForm((current) => ({ ...current, paidByOrPaidTo: event.target.value }))} placeholder="Who paid you, or who you paid" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Record who paid or who received the payment.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Date</span>
              <input value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} type="date" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use the date the payment, expense, or note relates to.</FieldHelp>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short internal note" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" rows={3} />
              <FieldHelp>Add any extra context needed for later review. Do not store credentials, private exports, or payment proof links here.</FieldHelp>
            </label>
          </div>

          <button type="submit" disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-bold text-white disabled:opacity-50">
            {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {saving ? 'Saving...' : editing ? 'Save entry' : 'Add entry'}
          </button>
        </form>}
        {!canEditOperations && (
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Read-only operations role</p>
            <h3 className="mt-2 font-serif text-xl text-[#2B1723]">Assigned event ledger view</h3>
            <p className="mt-3 text-sm leading-6 text-[#816D62]">
              Operations helpers can review assigned-event ledger entries here. Creating, editing, cancelling, registration deletes,
              import apply, payment edits, Settings, and admin controls remain unavailable.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-serif text-xl text-[#2B1723]">Ledger entries</h3>
            <div className="flex flex-wrap gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#B8A49A]" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search entry, category, note, reference"
                  className="rounded-xl border border-[#E5D7CF] py-2 pl-9 pr-3 text-xs font-bold"
                />
              </label>
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All types</option>
                {LEDGER_ENTRY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All statuses</option>
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold" />
              <button type="button" onClick={clearFilters} className="rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]">
                Clear filters
              </button>
              <button type="button" onClick={copyCurrentViewReport} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]">
                <Copy className="size-3.5" />
                Copy view
              </button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]">
                <Printer className="size-3.5" />
                Print view
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Entries in current view', filteredCounts.total],
              ['Pending / expected', filteredCounts.pending],
              ['Settled', filteredCounts.settled],
              ['Cancelled', filteredCounts.cancelled],
              ['Visible income', formatCurrency(filteredTotals.income)],
              ['Visible expenses', formatCurrency(filteredTotals.expenses)],
              ['Visible refunds', formatCurrency(filteredTotals.refunds)],
              ['Visible net', formatCurrency(filteredTotals.net)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#816D62]">
            <strong className="text-[#6B564C]">Current view scope:</strong> {filterScopeLabel}. Copy view and Print view use only the rows currently visible under this scope.
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#F2E8E1]">
            {filteredEntries.length === 0 ? (
              <div className="p-6 text-sm leading-6 text-[#816D62]">
                No operations entries yet. Add sponsor income, vendor or baker payments, expenses, reimbursements, refunds, or adjustments here. This tracker is separate from ticket sales and is scoped to the selected Working Event. Tasks, supplies, sponsor tracking, school/baker tracking, run sheets, and expanded expense reporting remain future modules.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                    <tr>
                      <th className="px-3 py-2">Entry</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8E1]">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.ledgerEntryId} className={entry.status === 'cancelled' ? 'bg-[#F7F1ED] opacity-70' : ''}>
                        <td className="px-3 py-3">
                          <p className="font-bold text-[#2B1723]">{entry.label}</p>
                          <p className="text-xs text-[#816D62]">{entry.category || 'General'}{entry.paidByOrPaidTo ? ` - ${entry.paidByOrPaidTo}` : ''}</p>
                        </td>
                        <td className="px-3 py-3">{labelFor(entry.entryType)}</td>
                        <td className="px-3 py-3">{labelFor(entry.status)}</td>
                        <td className="px-3 py-3 font-bold">{formatCurrency(entry.amount)}</td>
                        <td className="px-3 py-3 text-xs text-[#816D62]">{entry.date}</td>
                        <td className="px-3 py-3 text-right">
                          {canEditOperations ? (
                            <>
                              <button type="button" onClick={() => editEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8C766A] hover:bg-[#FFF8F2] disabled:opacity-40">
                                <Edit3 className="inline size-3.5" /> Edit
                              </button>
                              <button type="button" onClick={() => cancelEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A32626] hover:bg-[#FFF1F1] disabled:opacity-40">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-[#8C7567]">Read-only</span>
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
      </section>

      <p className="flex gap-2 rounded-xl border border-[#F2D6A3] bg-[#FFF7E8] px-4 py-3 text-xs leading-5 text-[#7A5818]">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Operations ledger remains scoped to the selected Working Event. Admins can edit entries; operations helpers can only view assigned-event entries until a separately approved write scope is designed.
      </p>
    </div>
  )
}
