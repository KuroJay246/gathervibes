import { useState, useEffect } from 'react'
import { Plus, Trash2, Users, Download } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import {
  subscribeToRegistrations,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  bulkDeleteRegistrations,
  bulkUpdateFinanceFields,
  bulkUpdatePaymentStatus,
} from '../services/registrationService'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RegistrationCard } from '../components/registrations/RegistrationCard'
import { RegistrationFormModal } from '../components/registrations/RegistrationFormModal'
import { DeleteRegistrationDialog } from '../components/registrations/DeleteRegistrationDialog'
import { ExportModal } from '../components/registrations/ExportModal'
import { RegistrationFilters } from '../components/registrations/RegistrationFilters'
import { InfoHint } from '../components/ui/InfoHint'
import { Link, useSearchParams } from 'react-router-dom'
import { buildRegistrationMetrics, formatRegistrationGuestSummary } from '../utils/registrationMetrics'
import { formatPaymentLabel, paymentStatusMatches } from '../utils/paymentStatus'
import {
  buildFinanceSummary,
  calculateRegistrationFinance,
  financeFilterMatches,
  formatCurrency,
  formatPaymentMethod,
} from '../utils/financeUtils'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

const TABS = ['All', 'Paid', 'Pending', 'Door Paid', 'To Pay at Door', 'Complimentary', 'Outstanding Balance', 'Missing Ticket Code', 'Needs Review', 'Checked In']

function titleCase(value = '') {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) ? registration.attendeeNames.join(', ') : ''
}

function personsLabel(registration = {}) {
  const persons = Number(registration.personsAttending) || 1
  return persons > 1 ? `Group of ${persons}` : '1 guest'
}

function registrationNeedsReview(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  return Boolean(finance.needsFinanceReview || registration.financeReviewRequired || !registration.ticketCode)
}

function duplicateContactKeys(registrations = []) {
  const emailCounts = new Map()
  const phoneCounts = new Map()

  registrations.forEach((registration) => {
    const email = String(registration.email || '').trim().toLowerCase()
    const phone = String(registration.phone || '').trim().toLowerCase()
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
    if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1)
  })

  return { emailCounts, phoneCounts }
}

function hasDuplicateContact(registration = {}, contactKeys = duplicateContactKeys([])) {
  const email = String(registration.email || '').trim().toLowerCase()
  const phone = String(registration.phone || '').trim().toLowerCase()
  return Boolean(
    (email && (contactKeys.emailCounts.get(email) || 0) > 1)
    || (phone && (contactKeys.phoneCounts.get(phone) || 0) > 1),
  )
}

function matchesCardFilter(registration = {}, key, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  if (!key) return true
  if (key === 'finance-warning') return finance.needsFinanceReview || registration.financeReviewRequired
  if (key === 'missing-ticket') return !registration.ticketCode
  if (key === 'outstanding') return (finance.balanceDue || 0) > 0
  if (key === 'door') return paymentStatusMatches(registration.paymentStatus, 'door')
  if (key === 'door-list') return paymentStatusMatches(registration.paymentStatus, 'door-list')
  if (key === 'checked-in') return Boolean(registration.checkedIn)
  if (key === 'not-checked-in') return !registration.checkedIn
  if (key === 'review-needed') return registrationNeedsReview(registration, event)
  return true
}

function CountCard({ label, value, help, active, onClick }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active ? 'border-[#9A5260] bg-[#FFF8F2] ring-2 ring-[#9A5260]/20' : 'border-[#EEDFD6] bg-white hover:bg-[#FBF8F5]'
      }`}
      title={help}
    >
      <button type="button" onClick={onClick} className="block w-full text-left">
        <p className="text-lg font-bold text-[#2B1723]">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</p>
      </button>
      {help && <InfoHint className="mt-1" label={`${label} help`}>{help}</InfoHint>}
    </div>
  )
}

export function RegistrationsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [searchParams] = useSearchParams()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filters, setFilters] = useState({})
  const [activeTab, setActiveTab] = useState('All')
  const [cardFilter, setCardFilter] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const reviewRegistrationId = searchParams.get('reviewRegistration') || ''
  const reviewMode = searchParams.get('review') || ''

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState(null)
  const [deletingRegistration, setDeletingRegistration] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setRegistrations([])
      setLoadError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    const unsubscribe = subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setRegistrations(data)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error('Registration fetch error:', err)
        setLoadError('Could not load registrations. Please try again later.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId, reloadKey])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSelectedIds(new Set())
    setEditingRegistration(null)
    setDeletingRegistration(null)
    setIsModalOpen(false)
    setIsExportModalOpen(false)
    setSuccess('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={Users}
        title="No selected event"
        description="Select an event from Events or the dashboard before managing registrations."
        action={(
          <Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B]">
            Choose an event
          </Link>
        )}
      />
    )
  }

  function retryRegistrationsLoad() {
    setLoading(true)
    setLoadError('')
    setReloadKey((current) => current + 1)
  }

  if (loading) return <LoadingState message="Loading registrations…" />
  if (loadError) return <ErrorState message={loadError} onRetry={retryRegistrationsLoad} />

  const duplicateContactReview = reviewMode === 'duplicate-contacts'
  const effectiveFilters = duplicateContactReview ? { ...filters, duplicateContacts: true } : filters
  const effectiveActiveTab = duplicateContactReview ? 'All' : activeTab
  const effectiveCardFilter = duplicateContactReview ? '' : cardFilter
  const duplicateContactLookup = duplicateContactKeys(registrations)
  const filteredRegistrations = registrations.filter((reg) => {
    const finance = calculateRegistrationFinance(reg, activeEvent)
    if (!matchesCardFilter(reg, effectiveCardFilter, activeEvent)) return false
    // 1. Tab filtering
    if (effectiveActiveTab === 'Checked In' && !reg.checkedIn) return false
    if (effectiveActiveTab === 'Missing Ticket Code' && reg.ticketCode) return false
    if (effectiveActiveTab === 'Door Paid' && !paymentStatusMatches(reg.paymentStatus, 'door')) return false
    if (effectiveActiveTab === 'To Pay at Door' && !paymentStatusMatches(reg.paymentStatus, 'door-list')) return false
    if (effectiveActiveTab === 'Needs Review' && !registrationNeedsReview(reg, activeEvent)) return false
    if (['Paid', 'Pending', 'Complimentary', 'Outstanding Balance'].includes(effectiveActiveTab)) {
      if (!financeFilterMatches(reg, effectiveActiveTab, activeEvent)) return false
    }

    // 2. Advanced Filters
    if (effectiveFilters.keyword) {
      const q = effectiveFilters.keyword.toLowerCase()
      if (![reg.fullName, reg.buyerName, attendeeNamesText(reg), reg.email, reg.phone, reg.ticketCode].some(v => v?.toLowerCase().includes(q))) {
        return false
      }
    }
    if (effectiveFilters.guestName && !reg.fullName?.toLowerCase().includes(effectiveFilters.guestName.toLowerCase())) return false
    if (effectiveFilters.buyerName && !reg.buyerName?.toLowerCase().includes(effectiveFilters.buyerName.toLowerCase())) return false
    if (effectiveFilters.attendeeName && !attendeeNamesText(reg).toLowerCase().includes(effectiveFilters.attendeeName.toLowerCase())) return false
    if (effectiveFilters.contact && !(reg.email?.toLowerCase().includes(effectiveFilters.contact.toLowerCase()) || reg.phone?.toLowerCase().includes(effectiveFilters.contact.toLowerCase()))) return false
    if (effectiveFilters.group && !reg.groupName?.toLowerCase().includes(effectiveFilters.group.toLowerCase())) return false
    if (effectiveFilters.ticketCode && !reg.ticketCode?.toLowerCase().includes(effectiveFilters.ticketCode.toLowerCase())) return false
    if (effectiveFilters.priceTier && !reg.priceTier?.toLowerCase().includes(effectiveFilters.priceTier.toLowerCase())) return false
    if (effectiveFilters.paymentStatus && !paymentStatusMatches(reg.paymentStatus, effectiveFilters.paymentStatus)) return false
    if (effectiveFilters.paymentMethod && reg.paymentMethod !== effectiveFilters.paymentMethod) return false
    if (effectiveFilters.balanceDue) {
      if (!finance.balanceDue || finance.balanceDue <= 0) return false
    }
    if (effectiveFilters.missingTicket && reg.ticketCode) return false
    if (effectiveFilters.missingAmount) {
      if (finance.amountDue !== null && finance.amountPaid !== null) return false
    }
    if (effectiveFilters.reviewNeeded) {
      if (!registrationNeedsReview(reg, activeEvent)) return false
    }
    if (effectiveFilters.duplicateContacts) {
      if (!hasDuplicateContact(reg, duplicateContactLookup)) return false
    }
    
    return true
  })
  const allMetrics = buildRegistrationMetrics(registrations, activeEvent)
  const filteredMetrics = buildRegistrationMetrics(filteredRegistrations, activeEvent)
  const financeSummary = buildFinanceSummary(registrations, activeEvent)
  const evidenceAudit = getEventFinancialEvidenceAudit(activeEvent?.eventId)
  const isFiltering = effectiveActiveTab !== 'All' || Boolean(effectiveCardFilter) || Object.values(effectiveFilters).some(Boolean)
  const showingText = isFiltering
    ? `Showing ${filteredMetrics.totalRegistrations} registration${filteredMetrics.totalRegistrations === 1 ? '' : 's'} covering ${filteredMetrics.totalPersons} guest${filteredMetrics.totalPersons === 1 ? '' : 's'}.`
    : 'Showing all registrations.'
  const selectedRegistrations = filteredRegistrations.filter((registration) => selectedIds.has(registration.registrationId))
  const allVisibleSelected = filteredRegistrations.length > 0 && filteredRegistrations.every((registration) => selectedIds.has(registration.registrationId))

  function toggleSelected(registrationId) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(registrationId)) next.delete(registrationId)
      else next.add(registrationId)
      return next
    })
  }

  function selectVisibleRows() {
    setSelectedIds(new Set(filteredRegistrations.map((registration) => registration.registrationId)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const selected = selectedRegistrations.filter((registration) => registration.eventId === activeEvent.eventId)
    if (selected.length === 0) return
    const confirmed = window.confirm(`Delete ${selected.length} selected registrations from ${activeEvent.eventName}?`)
    if (!confirmed) return
    if (selected.length > 10) {
      const typed = window.prompt(`Type DELETE to confirm deleting ${selected.length} selected registrations from ${activeEvent.eventName}.`)
      if (typed !== 'DELETE') return
    }

    setSaving(true)
    setSuccess('')
    try {
      await bulkDeleteRegistrations(selected, activeEvent.eventId, user)
      clearSelection()
      setSuccess(`Deleted ${selected.length} selected registration${selected.length === 1 ? '' : 's'}.`)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Bulk delete error:', err)
      alert('Failed to delete selected registrations. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkPaymentStatus(paymentStatus) {
    const selected = selectedRegistrations.filter((registration) => registration.eventId === activeEvent.eventId)
    if (selected.length === 0 || !paymentStatus) return

    setSaving(true)
    setSuccess('')
    try {
      await bulkUpdatePaymentStatus(selected, activeEvent.eventId, paymentStatus, user)
      setSuccess(`Updated ${selected.length} selected registration${selected.length === 1 ? '' : 's'} to ${formatPaymentLabel(paymentStatus)}.`)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Bulk status error:', err)
      alert('Failed to update selected registrations. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkFinance(updates, confirmation = '') {
    const selected = selectedRegistrations.filter((registration) => registration.eventId === activeEvent.eventId)
    if (selected.length === 0) return
    if (confirmation && !window.confirm(`${confirmation} This affects ${selected.length} selected registration${selected.length === 1 ? '' : 's'} in ${activeEvent.eventName} only.`)) return

    setSaving(true)
    setSuccess('')
    try {
      await bulkUpdateFinanceFields(selected, activeEvent.eventId, updates, user, activeEvent)
      setSuccess(`Updated finance fields for ${selected.length} selected registration${selected.length === 1 ? '' : 's'}.`)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Bulk finance error:', err)
      alert('Failed to update selected finance fields. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(data) {
    setSaving(true)
    setSuccess('')
    try {
      if (editingRegistration) {
        await updateRegistration(editingRegistration.registrationId, activeEvent.eventId, data, user, editingRegistration, activeEvent)
        setSuccess('Registration updated.')
      } else {
        await createRegistration(data, activeEvent.eventId, user, activeEvent)
        setSuccess('Registration created.')
      }
      setIsModalOpen(false)
      setEditingRegistration(null)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Save error:', err)
      alert('Failed to save registration. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    setSuccess('')
    try {
      await deleteRegistration(deletingRegistration, user)
      setDeletingRegistration(null)
      setSuccess('Registration deleted.')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Delete error:', err)
      alert('Failed to delete registration. Check your permissions.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-[#2B1723]">Guests & Registrations</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Manage registration records and the guests represented inside them for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#80685B] shadow-sm transition hover:bg-[#FBF8F5]"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <Link
            to="/imports"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#80685B] shadow-sm transition hover:bg-[#FBF8F5]"
          >
            Import Center
          </Link>
          <Link
            to="/payments"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#80685B] shadow-sm transition hover:bg-[#FBF8F5]"
          >
            Payments
          </Link>
          <button
            type="button"
            onClick={() => { setEditingRegistration(null); setIsModalOpen(true) }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#9A5260] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#9A5260]/20 transition hover:bg-[#A9606B]"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add registration</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {success && (
        <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">
          {success}
        </div>
      )}

      <section className="flex items-center gap-2 rounded-2xl border border-[#EEDFD6] bg-white p-4 text-xs leading-5 text-[#816D62]">
        <p className="font-semibold text-[#6B564C]">{showingText}</p>
        <InfoHint label="Guest count explanation">
          Some registrations include multiple guests. That is why the guest count may be higher than the registration count. Finance review means a registration has missing or inconsistent price, payment, or balance details.
        </InfoHint>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total Registrations', value: allMetrics.totalRegistrations, help: 'Registration records for this Working Event.', key: '' },
          { label: 'Total Guests', value: allMetrics.totalPersons, help: 'Guests represented by those registrations, including groups.', key: '' },
          { label: 'Paid', value: formatRegistrationGuestSummary(allMetrics.paidRegistrations, allMetrics.paidPersons), help: 'Registrations marked paid.', tab: 'Paid' },
          { label: 'Pending', value: formatRegistrationGuestSummary(allMetrics.pendingRegistrations, allMetrics.pendingPersons), help: 'Registrations still pending payment review or collection.', tab: 'Pending' },
          { label: 'Complimentary', value: formatRegistrationGuestSummary(allMetrics.complimentaryRegistrations, allMetrics.complimentaryPersons), help: 'Registrations marked complimentary.', tab: 'Complimentary' },
          { label: 'Door Paid', value: formatRegistrationGuestSummary(allMetrics.doorRegistrations, allMetrics.doorPersons), help: 'Paid at door or late payment confirmed.', tab: 'Door Paid', card: 'door' },
          { label: 'Expected Registration Income', value: formatCurrency(financeSummary.totalExpected), help: 'Registration totals from explicit ticket price or amount due only.' },
          { label: 'Recorded Registration Payments', value: formatCurrency(financeSummary.totalCollected), help: 'Confirmed amountPaid across registrations.' },
          { label: 'Outstanding Balance', value: formatCurrency(financeSummary.totalOutstanding), help: 'Click to see rows with balance due.', tab: 'Outstanding Balance', card: 'outstanding' },
          { label: 'To Pay at Door', value: formatCurrency(financeSummary.doorTotal), help: 'Expected door balances, not confirmed paid.', tab: 'To Pay at Door', card: 'door-list' },
          { label: 'Complimentary Value', value: formatCurrency(financeSummary.complimentaryValue), help: 'Value of complimentary tickets when prices are explicit.' },
          { label: 'Finance Review', value: financeSummary.financeWarningCount, help: 'Click to see registrations needing finance review.', card: 'finance-warning' },
          { label: 'Checked In', value: formatRegistrationGuestSummary(allMetrics.checkedInRegistrations, allMetrics.checkedInPersons), help: 'Checked-in registrations and guests represented.', card: 'checked-in' },
          { label: 'Not Checked In', value: formatRegistrationGuestSummary(allMetrics.remainingRegistrations, allMetrics.remainingPersons), help: 'Registrations and guests not checked in yet.', card: 'not-checked-in' },
          { label: 'Missing Ticket Code', value: allMetrics.missingTicketRegistrations, help: 'Registrations with no ticket code assigned.', tab: 'Missing Ticket Code', card: 'missing-ticket' },
          { label: 'Needs Review', value: registrations.filter((reg) => registrationNeedsReview(reg, activeEvent)).length, help: 'Registrations with finance review, ticket review, or missing ticket information.', tab: 'Needs Review', card: 'review-needed' },
          { label: 'Selected Registrations', value: selectedIds.size, help: 'Registrations currently selected for bulk actions.' },
        ].map((item) => (
          <CountCard
            key={item.label}
            label={item.label}
            value={item.value}
            help={item.help}
            active={(item.card && cardFilter === item.card) || (item.tab && activeTab === item.tab)}
            onClick={() => {
              if (item.tab) setActiveTab(item.tab)
              setCardFilter((current) => (item.card && current !== item.card ? item.card : ''))
            }}
          />
        ))}
      </section>

      {evidenceAudit && (
        <section className="rounded-[24px] border border-[#D8C5A8] bg-[#FFFCF6] p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6" aria-labelledby="registration-audit-heading">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7A5818]">Registration Evidence Reconciliation</p>
              <h2 id="registration-audit-heading" className="mt-2 font-serif text-2xl text-[#2B1723]">CPB booking crosswalk in organizer review</h2>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-[#715D46]">
                The private manifest maps audit booking IDs to current registration records. Exact and high-confidence matches can be proposed; candidate, conflict and unmatched records stay in organizer review.
              </p>
            </div>
            <Link to="/event-review" className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl border border-[#D8C5A8] bg-white px-4 text-xs font-bold text-[#7A5818]">
              Open Reports
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CountCard label="App registrations" value={evidenceAudit.attendance.appRegistrations} help="Current Firestore registration records." />
            <CountCard label="App guests" value={evidenceAudit.attendance.appGuests} help="Current persons attending total." />
            <CountCard label="Gmail-supported ticket spaces" value={evidenceAudit.ticketIncome.gmailSupportedTickets} help="Documentary ticket spaces, including inferred amounts." />
            <CountCard label="Christina Morris exception" value="Still present" help="No current CPB app row safely contains Christina Morris or her two guest spaces." />
          </div>
        </section>
      )}

      <div className="flex flex-col gap-6">
        <RegistrationFilters 
          filters={effectiveFilters}
          onFilterChange={setFilters} 
          onClearFilters={() => { setFilters({}); setActiveTab('All'); setCardFilter('') }} 
        />

        <div className="overflow-x-auto pb-2">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  activeTab === tab
                    ? 'bg-[#2B1723] text-white'
                    : 'bg-white text-[#80685B] border border-[#E5D7CF] hover:bg-[#F2E8E1]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[#EEDFD6] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={allVisibleSelected ? clearSelection : selectVisibleRows}
            className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
          >
            {allVisibleSelected ? 'Clear selection' : 'Select all visible registrations'}
          </button>
          <button
            type="button"
            onClick={selectVisibleRows}
            className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
          >
            Select all filtered registrations
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl px-4 py-2 text-xs font-bold text-[#80685B] hover:bg-[#F2E8E1]"
            >
              Clear selected
            </button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Bulk payment status"
              onChange={(event) => {
                const value = event.target.value
                event.target.value = ''
                void handleBulkPaymentStatus(value)
              }}
              disabled={saving}
              className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C]"
            >
              <option value="">Update payment...</option>
              {['paid', 'pending', 'complimentary', 'door', 'door-list'].map((status) => (
                <option key={status} value={status}>{formatPaymentLabel(status)}</option>
              ))}
            </select>
            <select
              aria-label="Bulk payment method"
              onChange={(event) => {
                const value = event.target.value
                event.target.value = ''
                void handleBulkFinance({ paymentMethod: value }, 'Update payment method?')
              }}
              disabled={saving}
              className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C]"
            >
              <option value="">Update method...</option>
              {['firstpay', 'bank-transfer', 'cash', 'door', 'card', 'complimentary', 'unknown'].map((method) => (
                <option key={method} value={method}>{formatPaymentMethod(method)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const value = window.prompt('Set ticket price for selected rows. Use numbers only, for example 100.')
                if (value !== null && value.trim() !== '') void handleBulkFinance({ ticketPrice: value }, 'Set ticket price?')
              }}
              disabled={saving}
              className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C]"
            >
              Set ticket price
            </button>
            <button
              type="button"
              onClick={() => {
                const value = window.prompt('Set price tier for selected rows, for example General or Complimentary.')
                if (value !== null && value.trim() !== '') void handleBulkFinance({ priceTier: value }, 'Set price tier?')
              }}
              disabled={saving}
              className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C]"
            >
              Set price tier
            </button>
            <button
              type="button"
              onClick={() => void handleBulkFinance({ paymentStatus: 'paid' }, 'Mark selected rows as paid? Confirm payment was actually received.')}
              disabled={saving}
              className="rounded-xl bg-[#1E7345] px-3 py-2 text-xs font-bold text-white"
            >
              Mark paid
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#A32626] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Trash2 className="size-4" />
              Delete selected
            </button>
          </div>
        )}
      </div>

      {filteredRegistrations.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No registrations found"
          description={
            Object.values(filters).some(Boolean) || activeTab !== 'All'
              ? 'Try adjusting your search or filters.'
              : 'Get started by manually adding one or importing a CSV.'
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#EEDFD6] bg-white shadow-[0_4px_16px_rgba(43,23,35,0.03)] lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#80685B]">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={allVisibleSelected ? clearSelection : selectVisibleRows}
                        aria-label="Select all visible rows"
                      />
                    </th>
                    <th className="px-4 py-3">Guest / Registration</th>
                    <th className="px-4 py-3">Buyer / Contact</th>
                    <th className="px-4 py-3">Guest Count</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Finance Review</th>
                    <th className="px-4 py-3">Ticket Status</th>
                    <th className="px-4 py-3">Check-In Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8E1]">
                  {filteredRegistrations.map((reg) => (
                      <tr
                        key={reg.registrationId}
                        id={`registration-${reg.registrationId}`}
                        className={reg.registrationId === reviewRegistrationId ? 'bg-[#FFF8EA] ring-2 ring-inset ring-[#D8A739]/40' : ''}
                      >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(reg.registrationId)}
                          onChange={() => toggleSelected(reg.registrationId)}
                          aria-label={`Select ${reg.fullName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#2B1723]">{reg.fullName}</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#FFF8F2] px-2 py-0.5 text-[10px] font-bold text-[#9A5260]">{personsLabel(reg)}</span>
                          {registrationNeedsReview(reg, activeEvent) && <span className="rounded-full bg-[#FFF7E8] px-2 py-0.5 text-[10px] font-bold text-[#7A5818]">Needs review</span>}
                        </div>
                        {reg.buyerName && <div className="text-xs font-semibold text-[#80685B]">Buyer: {reg.buyerName}</div>}
                        {attendeeNamesText(reg) && <div className="max-w-xs text-xs text-[#5D4A52]">Guests: {attendeeNamesText(reg)}</div>}
                        {reg.groupName && <div className="text-xs text-[#816D62]">{reg.groupName}</div>}
                      </td>
                      <td className="px-4 py-3 text-[#5D4A52]">
                        {reg.email && <div>{reg.email}</div>}
                        {reg.phone && <div>{reg.phone}</div>}
                      </td>
                      <td className="px-4 py-3">{reg.personsAttending}</td>
                      <td className="px-4 py-3">{formatPaymentLabel(reg.paymentStatus)}</td>
                      <td className="px-4 py-3 text-xs text-[#5D4A52]">
                        {(() => {
                          const finance = calculateRegistrationFinance(reg, activeEvent)
                          return (
                            <div className="space-y-0.5">
                              <div>{reg.priceTier || finance.priceTier || 'Needs review'}</div>
                              <div>Due {finance.amountDue === null ? 'Needs review' : formatCurrency(finance.amountDue)}</div>
                              <div>Paid {formatCurrency(finance.amountPaid)}</div>
                              <div className={finance.balanceDue > 0 ? 'font-bold text-[#A32626]' : 'text-[#1E7345]'}>Balance {finance.balanceDue === null ? 'Needs review' : formatCurrency(finance.balanceDue)}</div>
                              <div>{formatPaymentMethod(finance.paymentMethod)}</div>
                              {reg.paymentReference && <div>Ref: {reg.paymentReference}</div>}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#816D62]">{titleCase(reg.ticketStatus)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#816D62]">{reg.checkedIn ? 'Checked in' : 'Not checked in'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => { setEditingRegistration(reg); setIsModalOpen(true) }}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#80685B] hover:bg-[#FFF8F2]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRegistration(reg)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8A3F4B] hover:bg-[#FCEEF1]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredRegistrations.map((reg) => (
              <RegistrationCard
                key={reg.registrationId}
                registration={reg}
                highlighted={reg.registrationId === reviewRegistrationId}
                onEdit={(r) => { setEditingRegistration(r); setIsModalOpen(true) }}
                onDelete={(r) => setDeletingRegistration(r)}
              />
            ))}
          </div>
        </>
      )}

      <RegistrationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingRegistration}
        saving={saving}
      />

      <DeleteRegistrationDialog
        registration={deletingRegistration}
        onConfirm={handleDelete}
        onCancel={() => setDeletingRegistration(null)}
        deleting={saving}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        registrations={filteredRegistrations}
        event={activeEvent}
      />
    </div>
  )
}
