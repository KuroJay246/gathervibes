import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Edit3, Plus, ReceiptText, Save, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { buildFinanceSummary, formatCurrency } from '../utils/financeUtils'
import { subscribeToRegistrations } from '../services/registrationService'
import {
  LEDGER_ENTRY_TYPES,
  LEDGER_STATUSES,
  buildOperationsTotals,
  cancelLedgerEntry,
  createLedgerEntry,
  subscribeToOperationsLedger,
  updateLedgerEntry,
} from '../services/operationsLedgerService'

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
  ['unknown', 'Unknown / Not recorded'],
]

const STATUS_HELP = {
  expected: 'Expected means money should come later.',
  received: 'Received means income is already collected.',
  paid: 'Paid means an expense or refund already went out.',
  pending: 'Pending means not settled yet.',
  cancelled: 'Cancelled keeps the entry visible but removes it from totals.',
}

function labelFor(value) {
  return String(value || '').split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function FieldHelp({ children }) {
  return <p className="mt-1 text-[11px] leading-4 text-[#8C7567]">{children}</p>
}

export function OperationsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ type: 'all', category: '', status: 'all' })
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined

    const unsubscribeRegs = subscribeToRegistrations(activeEvent.eventId, setRegistrations, () => {})
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
  }, [activeEvent?.eventId])

  const filteredEntries = entries.filter((entry) => {
    if (filters.type !== 'all' && entry.entryType !== filters.type) return false
    if (filters.status !== 'all' && entry.status !== filters.status) return false
    if (filters.category && !String(entry.category || '').toLowerCase().includes(filters.category.toLowerCase())) return false
    return true
  })

  const financeSummary = useMemo(() => buildFinanceSummary(registrations, activeEvent), [registrations, activeEvent])
  const operationsTotals = useMemo(() => buildOperationsTotals(entries), [entries])
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

      <section className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        This tracker is separate from ticket sales. Ticket revenue comes from registrations; sponsor income, vendor/baker payments, expenses, refunds, and adjustments live here for the selected Working Event only.
      </section>

      {error && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{error}</div>}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Ticket expected revenue', formatCurrency(financeSummary.totalExpected)],
          ['Ticket collected', formatCurrency(financeSummary.totalCollected)],
          ['Ticket outstanding', formatCurrency(financeSummary.totalOutstanding)],
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
        <form onSubmit={saveEntry} className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
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
              <FieldHelp>Income is money coming in; Expense is money going out; Adjustment/refund corrects totals.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <FieldHelp>{STATUS_HELP[form.status]}</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Category</span>
              <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Sponsor, Baker payment, Venue, Decor" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Example: Sponsor, Baker payment, Venue, Decor, Water, Printing.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Amount</span>
              <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="100.00" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Enter BBD amount only, e.g. 100.00.</FieldHelp>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Short description / title</span>
              <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Sponsor payment from Cake Co." className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use a clear title so the ledger row is easy to recognize later.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Payment Method</span>
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {PAYMENT_METHOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <FieldHelp>Use Unknown / Not recorded when the method is unclear.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Payment Reference</span>
              <input value={form.paymentReference} onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))} placeholder="Receipt or transaction reference" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Receipt number, transaction reference, or leave blank if unknown.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Paid By / Paid To</span>
              <input value={form.paidByOrPaidTo} onChange={(event) => setForm((current) => ({ ...current, paidByOrPaidTo: event.target.value }))} placeholder="Who paid you, or who you paid" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Who paid you, or who you paid.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Date</span>
              <input value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} type="date" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use the expected or actual payment date.</FieldHelp>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C7567]">Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short internal note" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" rows={3} />
              <FieldHelp>Internal note only. Do not store credentials, private exports, or payment proof links here.</FieldHelp>
            </label>
          </div>

          <button type="submit" disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 text-sm font-bold text-white disabled:opacity-50">
            {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {saving ? 'Saving...' : editing ? 'Save entry' : 'Add entry'}
          </button>
        </form>

        <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h3 className="font-serif text-xl text-[#2B1723]">Ledger entries</h3>
            <div className="flex flex-wrap gap-2">
              <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All types</option>
                {LEDGER_ENTRY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All statuses</option>
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold" />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#F2E8E1]">
            {filteredEntries.length === 0 ? (
              <div className="p-6 text-sm leading-6 text-[#816D62]">
                No operations entries yet. Add sponsor income, expenses, refunds, or adjustments here. This tracker is separate from ticket sales.
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
                          <button type="button" onClick={() => editEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8C766A] hover:bg-[#FFF8F2] disabled:opacity-40">
                            <Edit3 className="inline size-3.5" /> Edit
                          </button>
                          <button type="button" onClick={() => cancelEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A32626] hover:bg-[#FFF1F1] disabled:opacity-40">
                            Cancel
                          </button>
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
        Operations ledger is admin-only, scoped to the selected Working Event, and does not add public access, sending, OAuth, Cloud Functions, Storage, or payment processing.
      </p>
    </div>
  )
}
