import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Copy, Edit3, Plus, Printer, ReceiptText, Save, Search, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { PartnerCommitmentsPanel } from '../components/operations/PartnerCommitmentsPanel'
import { useActiveEvent } from '../events/useActiveEvent'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { buildFinanceSummary, formatCurrency, formatPaymentMethod } from '../utils/financeUtils'
import { subscribeToRegistrations } from '../services/registrationService'
import {
  LEDGER_ENTRY_TYPES,
  LEDGER_STATUSES,
  cancelLedgerEntry,
  createLedgerEntry,
  subscribeToOperationsLedger,
  updateLedgerEntry,
} from '../services/operationsLedgerService'
import { deletePartnerRecord, savePartnerRecord, subscribeToEvents } from '../services/eventService'
import {
  OPERATIONS_ENTRY_EFFECTS,
  buildOperationsControlSummary,
  buildOperationsEntryCounts,
  buildOperationsLedgerReport,
  buildOperationsSettlementSummary,
  buildOperationsTotals,
  findPossibleRegistrationPaymentOverlap,
} from '../utils/operationsReport'
import { InfoHint } from '../components/ui/InfoHint'
import { canWriteOperations, isApprovedAdmin } from '../utils/accessRoles'
import { hydrateEventForPlanning, isCompletedEvent } from '../utils/eventPlanning'

const EMPTY_FORM = {
  entryType: 'income',
  category: '',
  label: '',
  amount: '',
  adjustmentDirection: 'increase',
  paymentMethod: 'unknown',
  paymentReference: '',
  paidByOrPaidTo: '',
  linkedContactId: '',
  linkedOrganizationId: '',
  linkedDocumentId: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  notes: '',
}

const PAYMENT_METHOD_OPTIONS = [
  ['cash', 'Cash'],
  ['bank-transfer', 'Bank Transfer'],
  ['firstpay', 'CIBC 1stPay'],
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
  return <p className="mt-1 text-[11px] leading-4 text-[#80685B]">{children}</p>
}

function buildFilterScopeLabel(filters = DEFAULT_FILTERS) {
  const parts = []
  if (filters.type && filters.type !== 'all') parts.push(`type: ${labelFor(filters.type)}`)
  if (filters.status && filters.status !== 'all') parts.push(`status: ${labelFor(filters.status)}`)
  if (filters.category) parts.push(`category: ${filters.category}`)
  if (filters.search) parts.push(`search: ${filters.search}`)
  return parts.length > 0 ? `Current filtered view (${parts.join(' / ')})` : 'Current filtered view (all visible ledger rows)'
}

function formatDateValue(value) {
  if (!value) return 'Not recorded'
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return date.toLocaleDateString('en-BB', { year: 'numeric', month: 'short', day: 'numeric' })
}

function buildTaskHref({ title, category, notes, priority = 'Normal' }) {
  const params = new URLSearchParams({
    title: title.slice(0, 160),
    category,
    status: 'Not Started',
    priority,
    responsibleLabel: 'Organizer',
    notes: notes.slice(0, 400),
  })
  return `/tasks?${params.toString()}`
}

export function OperationsPage() {
  const { user, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [resolvedActiveEvent, setResolvedActiveEvent] = useState(activeEvent)
  const [registrations, setRegistrations] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [activeView, setActiveView] = useState('ledger')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [cancelCandidate, setCancelCandidate] = useState(null)
  const adminUser = isApprovedAdmin(access)
  const currentEvent = resolvedActiveEvent || activeEvent
  const canEditOperations = canWriteOperations(access, currentEvent?.eventId)
  const completedEvent = isCompletedEvent(currentEvent)
  const planningEvent = useMemo(() => hydrateEventForPlanning(currentEvent || {}), [currentEvent])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setEntries([])
    setRegistrations([])
    setResolvedActiveEvent(activeEvent)
    setFilters(DEFAULT_FILTERS)
    setActiveView('ledger')
    setForm(EMPTY_FORM)
    setEditing(null)
    setMessage('')
    setError('')
    setSelectedDetail(null)
    setLoading(Boolean(activeEvent?.eventId))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined

    return subscribeToEvents(
      (events) => {
        const matchedEvent = events.find((event) => event?.eventId === activeEvent.eventId)
        if (matchedEvent) setResolvedActiveEvent(matchedEvent)
      },
      () => {},
    )
  }, [activeEvent])

  useEffect(() => {
    if (!currentEvent?.eventId) return undefined

    const unsubscribeRegs = adminUser
      ? subscribeToRegistrations(currentEvent.eventId, setRegistrations, () => {})
      : () => setRegistrations([])
    const unsubscribeLedger = subscribeToOperationsLedger(
      currentEvent.eventId,
      (rows) => {
        setEntries(rows)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error(err)
        setError(
          'Live Operations ledger rows could not be loaded for this session. The read-only audit summary remains separate from registration payments.',
        )
        setLoading(false)
      },
    )

    return () => {
      unsubscribeRegs()
      unsubscribeLedger()
    }
  }, [adminUser, currentEvent?.eventId])

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

  const financeSummary = useMemo(() => buildFinanceSummary(registrations, currentEvent), [currentEvent, registrations])
  const operationsTotals = useMemo(() => buildOperationsTotals(entries), [entries])
  const operationsSettlement = useMemo(() => buildOperationsSettlementSummary(entries), [entries])
  const filteredTotals = useMemo(() => buildOperationsTotals(filteredEntries), [filteredEntries])
  const filteredCounts = useMemo(() => buildOperationsEntryCounts(filteredEntries), [filteredEntries])
  const filteredControl = useMemo(() => buildOperationsControlSummary(filteredEntries), [filteredEntries])
  const possibleRegistrationPaymentOverlap = useMemo(() => findPossibleRegistrationPaymentOverlap(entries), [entries])
  const filterScopeLabel = useMemo(() => buildFilterScopeLabel(filters), [filters])
  const partnerRecords = useMemo(() => planningEvent.partnerRecords || [], [planningEvent])
  const commitmentRows = useMemo(() => partnerRecords
    .filter((record) => record.recordType !== 'sponsor' && ((record.agreedAmount || 0) > 0 || (record.amountPaid || 0) > 0 || (record.balance || 0) > 0))
    .map((record) => ({
      ...record,
      commitmentStatus: (record.status === 'Paid' || (record.balance || 0) === 0) ? 'Paid' : record.status === 'Partially Paid' || (record.amountPaid || 0) > 0 ? 'Partially Paid' : record.status,
      overdue: Boolean(record.dueDate && (record.balance || 0) > 0 && new Date(record.dueDate) < new Date(new Date().toDateString())),
    })), [partnerRecords])
  const inKindRows = useMemo(() => partnerRecords
    .filter((record) => record.recordType === 'sponsor' && record.sponsorType === 'in-kind')
    .map((record) => ({
      ...record,
      estimatedValueResolved: record.estimatedValue || 0,
    })), [partnerRecords])
  const partnerRows = useMemo(() => partnerRecords.map((record) => ({
    ...record,
    linkedEntryCount: entries.filter((entry) => [entry.paidByOrPaidTo, entry.label, entry.category].some((value) => String(value || '').toLowerCase().includes(String(record.name || record.company || '').toLowerCase()))).length,
    latestActivity: record.paymentDate || record.followUpDate || record.dueDate || '',
  })), [entries, partnerRecords])

  if (!currentEvent?.eventId) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No selected event"
        description="Select a Working Event before tracking event operations money."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
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
      adjustmentDirection: entry.adjustmentDirection || 'increase',
      paymentMethod: entry.paymentMethod || 'unknown',
      paymentReference: entry.paymentReference || '',
      paidByOrPaidTo: entry.paidByOrPaidTo || '',
      linkedContactId: entry.linkedContactId || '',
      linkedOrganizationId: entry.linkedOrganizationId || '',
      linkedDocumentId: entry.linkedDocumentId || '',
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
        await createLedgerEntry(form, currentEvent.eventId, user)
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
    setCancelCandidate(entry)
  }

  async function confirmCancelEntry() {
    const entry = cancelCandidate
    if (!entry) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await cancelLedgerEntry(entry, user)
      setMessage('Operations ledger entry cancelled.')
      setCancelCandidate(null)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError(err.message || 'Could not cancel ledger entry.')
    } finally {
      setSaving(false)
    }
  }

  async function copyCurrentViewReport() {
    const report = buildOperationsLedgerReport(filteredEntries, {
      eventName: currentEvent?.eventName,
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
    <div data-tour-id="operations-workspace" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Selected Working Event only</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Operations Ledger Summary</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Track partner commitments and event-level money for <strong>{currentEvent.eventName}</strong>. Registration payments are reviewed separately in Payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {adminUser && (
            <Link to="/payments" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
              Open Payments
            </Link>
          )}
          {adminUser && (
            <Link to="/event-review" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">
              Open Event Review
            </Link>
          )}
          <Link to="/dashboard" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2.5 text-xs font-bold text-[#6B564C]">Back to Overview</Link>
        </div>
      </header>

      <section className="flex items-center gap-2 rounded-xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        <p className="font-semibold text-[#6B564C]">
          Operations now covers both planning commitments and the event-level ledger.
          {!canEditOperations && ' Your role is read-only for this assigned event.'}
        </p>
        <InfoHint label="Operations Ledger Info">
          Use the contact and commitment workspace for partners, vendors, suppliers, sponsors, venue contacts, and helpers. Use the ledger for event-level income, expenses, refunds, reimbursements, and adjustments. Registration payments stay in Payments.
        </InfoHint>
      </section>

      <details className="phase23v-panel border-[#E6D4B4] bg-[#FFF8EA]">
        <summary className="phase23v-summary text-[#4E3928]">Operations finance boundary</summary>
        <div className="phase23v-body text-xs leading-5 text-[#715D46]">
          <h3 id="operations-finance-summary-heading" className="text-sm font-bold text-[#4E3928]">Operations finance boundary</h3>
          <p className="mt-1">
            Operations tracks event expenses, commitments and non-registration income. Registration ticket payments are recorded separately under Payments, so the Operations cash position is not the event's final profit or loss.
          </p>
        </div>
      </details>

      {completedEvent && (
        <section className="rounded-xl border border-[#D9E3F8] bg-[#F6F9FF] px-4 py-3 text-sm leading-6 text-[#415F91]">
          This event is completed. Use this page mainly for historical reference, outstanding supplier or vendor commitments, and closeout checks instead of normal upcoming-event setup.
        </section>
      )}

      {possibleRegistrationPaymentOverlap.length > 0 && (
        <section className="flex gap-2 rounded-xl border border-[#F2D6A3] bg-[#FFF7E8] px-4 py-3 text-xs leading-5 text-[#7A5818]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            Possible overlap: {possibleRegistrationPaymentOverlap.length} Operations income {possibleRegistrationPaymentOverlap.length === 1 ? 'entry references' : 'entries reference'} registration or ticket revenue.
            Confirm the income was not already recorded under Payments before adding Operations income to registration payment totals.
          </p>
        </section>
      )}

      {error && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{error}</div>}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}

      <section className="phase23v-metric-grid">
        {[
          ...(adminUser ? [
            ['Registration expected income', formatCurrency(financeSummary.totalExpected)],
            ['Registration payments recorded', formatCurrency(financeSummary.totalCollected)],
            ['Registration balance outstanding', formatCurrency(financeSummary.totalOutstanding)],
          ] : []),
          ['Recorded Event Income', formatCurrency(operationsSettlement.incomeReceived)],
          ['Recorded Event Expenses', formatCurrency(operationsSettlement.paidExpenses)],
          ['Outstanding Commitments', formatCurrency(operationsSettlement.outstandingCommitments)],
          ['Refunds Paid', formatCurrency(operationsSettlement.paidRefunds)],
          ['Reimbursements Received', formatCurrency(operationsSettlement.reimbursementsReceived)],
          ['Adjustments', formatCurrency(operationsTotals.adjustments)],
          ['Current Ledger Difference', formatCurrency(operationsSettlement.operationsCashPosition)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#EEDFD6] bg-white p-4">
            <p className="text-lg font-bold text-[#2B1723]">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</p>
            {label === 'Current Ledger Difference' && (
              <p className="mt-2 text-[11px] leading-5 text-[#816D62]">This is not final event profit.</p>
            )}
          </div>
        ))}
      </section>

      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Operations views</p>
            <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Commitments, partners, and in-kind support</h3>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-[#816D62]">
              Review event-level money separately from outstanding commitments, partner records, and non-cash support.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['ledger', 'Ledger'],
              ['commitments', 'Commitments'],
              ['partners', 'Partners & Suppliers'],
              ['in-kind', 'In-Kind Support'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveView(value)}
                className={`rounded-xl px-4 py-2 text-xs font-bold ${activeView === value ? 'bg-[#2B1723] text-white' : 'border border-[#E7D6CC] text-[#6B564C]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeView === 'commitments' && (
          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{commitmentRows.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Commitment records</p>
              </div>
              <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{formatCurrency(commitmentRows.reduce((sum, row) => sum + (row.balance || 0), 0))}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Outstanding commitments</p>
              </div>
              <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{commitmentRows.filter((row) => row.commitmentStatus === 'Partially Paid').length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Partially paid</p>
              </div>
              <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{commitmentRows.filter((row) => row.overdue).length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Overdue</p>
              </div>
            </div>
            {commitmentRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-5 text-sm leading-6 text-[#816D62]">
                No supplier, vendor, baker, venue, or helper commitments are recorded for this Working Event yet.
              </div>
            ) : (
              commitmentRows.map((row) => (
                <article key={row.partnerId} className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2B1723]">{row.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[#816D62]">
                        {row.company || partnerRows.find((item) => item.partnerId === row.partnerId)?.company || 'Independent'} · {row.service || row.role || 'Commitment'} · {row.commitmentStatus}
                        {row.overdue ? ' · Overdue' : ''}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#816D62]">
                        Promised {formatCurrency(row.agreedAmount || 0)} · Paid {formatCurrency(row.amountPaid || 0)} · Balance {formatCurrency(row.balance || 0)}
                        {row.dueDate ? ` · Due ${formatDateValue(row.dueDate)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setSelectedDetail({ type: 'commitment', row })} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                        View details
                      </button>
                      <Link to={buildTaskHref({
                        title: `Follow up ${row.name} commitment`,
                        category: 'Suppliers and Partners',
                        priority: row.overdue || (row.balance || 0) > 0 ? 'High' : 'Normal',
                        notes: `${row.name}${row.service ? ` · ${row.service}` : ''}${row.balance ? ` · Balance ${formatCurrency(row.balance)}` : ''}`,
                      })} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                        Create Follow-Up Task
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeView === 'partners' && (
          <div className="mt-5 space-y-3">
            {partnerRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-5 text-sm leading-6 text-[#816D62]">
                No partner or supplier records are recorded for this Working Event yet.
              </div>
            ) : (
              partnerRows.map((row) => (
                <article key={row.partnerId} className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2B1723]">{row.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[#816D62]">
                        {[row.company, row.role || row.service, row.recordType].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#816D62]">
                        Linked Operations activity: {row.linkedEntryCount} · Outstanding {formatCurrency(row.balance || 0)} · Latest activity {formatDateValue(row.latestActivity)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedDetail({ type: 'partner', row })} className="w-fit rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                      View details
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeView === 'in-kind' && (
          <div className="mt-5 space-y-3">
            {inKindRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-5 text-sm leading-6 text-[#816D62]">
                No in-kind support is recorded for this Working Event yet.
              </div>
            ) : (
              inKindRows.map((row) => (
                <article key={row.partnerId} className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#2B1723]">{row.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[#816D62]">
                        {row.itemOrService || row.service || 'In-kind support'} · Estimated value {formatCurrency(row.estimatedValueResolved)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#816D62]">
                        Status {row.status} · Quantity {row.quantity || 'Not recorded'} · Follow-up {formatDateValue(row.followUpDate)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedDetail({ type: 'in-kind', row })} className="w-fit rounded-xl border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#6B564C]">
                      View details
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeView === 'ledger' && (
          <div className="mt-5 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#816D62]">
            Ledger view stays below so existing create, edit, cancel, copy, and print controls remain in the normal Operations workflow.
          </div>
        )}
      </section>

      {selectedDetail && (
        <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{selectedDetail.type}</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{selectedDetail.row.name || selectedDetail.row.label}</h3>
            </div>
            <button type="button" onClick={() => setSelectedDetail(null)} className="w-fit rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">
              Close details
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries({
              Type: labelFor(selectedDetail.row.recordType || selectedDetail.row.entryType || selectedDetail.type),
              Status: selectedDetail.row.commitmentStatus || selectedDetail.row.status || 'Not recorded',
              Amount: formatCurrency(selectedDetail.row.amount || selectedDetail.row.agreedAmount || selectedDetail.row.estimatedValueResolved || 0),
              Balance: formatCurrency(selectedDetail.row.balance || 0),
              'Payment method': formatPaymentMethod(selectedDetail.row.paymentMethod),
              Reference: selectedDetail.row.paymentReference || selectedDetail.row.evidence || 'Not recorded',
              'Follow-up / due': formatDateValue(selectedDetail.row.followUpDate || selectedDetail.row.dueDate || selectedDetail.row.date),
              Notes: selectedDetail.row.notes || 'Not recorded',
            }).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#FBF8F5] px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#80685B]">{label}</p>
                <p className="mt-1 break-words text-sm font-bold text-[#2B1723]">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <details className="phase23v-panel" data-tour-id="partners-commitments-panel" data-tour-container="partners-commitments">
        <summary className="phase23v-summary">Partner commitments, sponsors, and supplier contacts</summary>
        <div className="phase23v-body">
          <PartnerCommitmentsPanel
            event={currentEvent}
            onSaveRecord={(record) => savePartnerRecord(currentEvent, record, user)}
            onDeleteRecord={(partnerId) => deletePartnerRecord(currentEvent, partnerId, user)}
          />
        </div>
      </details>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {canEditOperations && <form onSubmit={saveEntry} className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl text-[#2B1723]">{editing ? 'Edit entry' : 'Add entry'}</h3>
            {editing && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-[#80685B] hover:bg-[#F2E8E1]" aria-label="Cancel edit"><X className="size-4" /></button>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Entry Type</span>
              <select value={form.entryType} onChange={(event) => setForm((current) => ({ ...current, entryType: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {LEDGER_ENTRY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
              <FieldHelp>Choose whether this entry is money coming in, money going out, or an internal correction.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Status</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <FieldHelp>Track whether this entry is planned, pending, paid, cancelled, or already received. {STATUS_HELP[form.status]}</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Category</span>
              <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Sponsor, Baker payment, Venue, Decor" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Group this entry so event costs and income are easier to review later.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Amount</span>
              <input value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="100.00" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Enter the amount for this operation. Leave blank only when no amount is known yet.</FieldHelp>
            </label>
            {form.entryType === 'adjustment' && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Adjustment Direction</span>
                <select value={form.adjustmentDirection} onChange={(event) => setForm((current) => ({ ...current, adjustmentDirection: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                  <option value="increase">Increase ledger difference</option>
                  <option value="decrease">Decrease ledger difference</option>
                </select>
                <FieldHelp>Use direction instead of entering a negative amount.</FieldHelp>
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Short description / title</span>
              <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} placeholder="Sponsor payment from Cake Co." className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use a short name that makes this entry easy to recognize.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Payment Method</span>
              <select value={form.paymentMethod} onChange={(event) => setForm((current) => ({ ...current, paymentMethod: event.target.value }))} className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm">
                {PAYMENT_METHOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <FieldHelp>Choose how the payment was made or recorded. Use Unknown / Not Recorded only when the detail is genuinely not available yet.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Payment Reference</span>
              <input value={form.paymentReference} onChange={(event) => setForm((current) => ({ ...current, paymentReference: event.target.value }))} placeholder="Receipt or transaction reference" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Add a receipt number, transfer note, invoice number, or other proof reference. Registration payment references belong on registration records unless this is intentionally separate Operations income.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Paid By / Paid To</span>
              <input value={form.paidByOrPaidTo} onChange={(event) => setForm((current) => ({ ...current, paidByOrPaidTo: event.target.value }))} placeholder="Who paid you, or who you paid" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Record who paid or who received the payment.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Linked Contact ID</span>
              <input value={form.linkedContactId} onChange={(event) => setForm((current) => ({ ...current, linkedContactId: event.target.value }))} placeholder="Optional reusable contact ID" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Optional metadata link to a reusable contact. Free-text Paid By / Paid To stays supported.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Linked Organization ID</span>
              <input value={form.linkedOrganizationId} onChange={(event) => setForm((current) => ({ ...current, linkedOrganizationId: event.target.value }))} placeholder="Optional organization ID" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Optional metadata link to a reusable organization. Historical supplier names are not migrated automatically.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Linked Document ID</span>
              <input value={form.linkedDocumentId} onChange={(event) => setForm((current) => ({ ...current, linkedDocumentId: event.target.value }))} placeholder="Optional receipt, invoice, or agreement reference ID" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use this to connect receipts, invoices, quotations, or sponsorship agreements from Documents.</FieldHelp>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Date</span>
              <input value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} type="date" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" />
              <FieldHelp>Use the date the payment, expense, or note relates to.</FieldHelp>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Short internal note" className="mt-1 w-full rounded-xl border border-[#E5D7CF] px-3 py-2 text-sm" rows={3} />
              <FieldHelp>Add any extra context needed for later review. Do not store credentials, private exports, or payment proof links here.</FieldHelp>
            </label>
          </div>

          <button type="submit" disabled={saving} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#9A5260] px-5 text-sm font-bold text-white disabled:opacity-50">
            {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
            {saving ? 'Saving...' : editing ? 'Save entry' : 'Add entry'}
          </button>
        </form>}
        {!canEditOperations && (
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Read-only operations role</p>
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
                <span className="sr-only">Search ledger entries</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#B8A49A]" />
                <input
                  aria-label="Search ledger entries"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search entry, category, note, reference"
                  className="rounded-xl border border-[#E5D7CF] py-2 pl-9 pr-3 text-xs font-bold"
                />
              </label>
              <select aria-label="Ledger entry type filter" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All types</option>
                {LEDGER_ENTRY_TYPES.map((type) => <option key={type} value={type}>{labelFor(type)}</option>)}
              </select>
              <select aria-label="Ledger status filter" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold">
                <option value="all">All statuses</option>
                {LEDGER_STATUSES.map((status) => <option key={status} value={status}>{labelFor(status)}</option>)}
              </select>
              <input aria-label="Ledger category filter" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold" />
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
              ['Open ledger items', filteredControl.openEntries],
              ['Pending income', formatCurrency(filteredControl.pendingIncome)],
              ['Pending expenses', formatCurrency(filteredControl.pendingExpenses)],
              ['Pending refunds', formatCurrency(filteredControl.pendingRefunds)],
              ['Visible income', formatCurrency(filteredTotals.income)],
              ['Visible expenses', formatCurrency(filteredTotals.expenses)],
              ['Visible refunds', formatCurrency(filteredTotals.refunds)],
              ['Visible Current Ledger Difference', formatCurrency(filteredTotals.net)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-sm font-bold text-[#2B1723]">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#816D62]">
            <strong className="text-[#6B564C]">Current view scope:</strong> {filterScopeLabel}. Copy view and Print view use only the rows currently visible under this scope.
          </div>

          <div className="mt-4 rounded-xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
            <strong className="text-[#6B564C]">What this means:</strong> open ledger items are still expected or pending, while the visible Current Ledger Difference reflects only the filtered Operations rows on screen. This is not final event profit and should not be added automatically to registration payment totals.
          </div>

          <details className="mt-4 rounded-xl border border-[#EEDFD6] bg-[#FBF8F5]">
            <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[#6B564C]">Operations entry effect table</summary>
            <div className="overflow-x-auto border-t border-[#EFE2DA]">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-white uppercase tracking-wider text-[#80685B]">
                  <tr>
                    <th className="px-3 py-2">Entry type</th>
                    <th className="px-3 py-2">Cash effect</th>
                    <th className="px-3 py-2">Commitment effect</th>
                    <th className="px-3 py-2">Reporting treatment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE2DA]">
                  {OPERATIONS_ENTRY_EFFECTS.map((effect) => (
                    <tr key={effect.entryType}>
                      <td className="px-3 py-2 font-bold text-[#2B1723]">{labelFor(effect.entryType)}</td>
                      <td className="px-3 py-2">{effect.cashEffect}</td>
                      <td className="px-3 py-2">{effect.commitmentEffect}</td>
                      <td className="px-3 py-2">{effect.reportingTreatment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <div className="mt-4 overflow-hidden rounded-xl border border-[#F2E8E1]">
            {filteredEntries.length === 0 ? (
              <div className="p-6 text-sm leading-6 text-[#816D62]">
                No operations entries yet. Add sponsor income, vendor or supplier payments, expenses, reimbursements, refunds, or adjustments here. This tracker is separate from registration payment records and is scoped to the selected Working Event.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#80685B]">
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
                              <button type="button" onClick={() => editEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#80685B] hover:bg-[#FFF8F2] disabled:opacity-40">
                                <Edit3 className="inline size-3.5" /> Edit
                              </button>
                              <button type="button" onClick={() => cancelEntry(entry)} disabled={saving || entry.status === 'cancelled'} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A32626] hover:bg-[#FFF1F1] disabled:opacity-40">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-[#80685B]">Read-only</span>
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
      <ConfirmDialog
        open={Boolean(cancelCandidate)}
        title="Cancel ledger entry?"
        recordName={cancelCandidate?.label}
        message={`This keeps the entry visible for ${currentEvent?.eventName || 'the Working Event'} but removes it from active Operations totals.`}
        confirmLabel="Cancel Entry"
        pending={saving}
        onCancel={() => setCancelCandidate(null)}
        onConfirm={confirmCancelEntry}
      />
    </div>
  )
}
