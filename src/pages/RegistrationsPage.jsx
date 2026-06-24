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
import { Link } from 'react-router-dom'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'
import { formatPaymentLabel, paymentStatusMatches } from '../utils/paymentStatus'
import {
  buildFinanceSummary,
  calculateRegistrationFinance,
  financeFilterMatches,
  formatCurrency,
  formatPaymentMethod,
} from '../utils/financeUtils'

const TABS = ['All', 'Paid', 'Pending', 'Door Paid', 'To Pay at Door', 'Complimentary', 'Outstanding Balance', 'Missing Ticket', 'Review Needed', 'Checked In']

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
  return persons > 1 ? `Group of ${persons}` : '1 person'
}

function registrationNeedsReview(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  return Boolean(finance.needsFinanceReview || registration.financeReviewRequired || !registration.ticketCode)
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
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition ${
        active ? 'border-[#B76E79] bg-[#FFF8F2] ring-2 ring-[#B76E79]/20' : 'border-[#EEDFD6] bg-white hover:bg-[#FBF8F5]'
      }`}
      title={help}
    >
      <p className="text-lg font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
      {help && <p className="mt-1 text-[11px] leading-4 text-[#8C7567]">{help}</p>}
    </button>
  )
}

export function RegistrationsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filters, setFilters] = useState({})
  const [activeTab, setActiveTab] = useState('All')
  const [cardFilter, setCardFilter] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState(null)
  const [deletingRegistration, setDeletingRegistration] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
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
  }, [activeEvent?.eventId])

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={Users}
        title="No selected event"
        description="Select an event from Events or the dashboard before managing registrations."
        action={(
          <Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B]">
            Choose an event
          </Link>
        )}
      />
    )
  }

  if (loading) return <LoadingState message="Loading registrations…" />

  const filteredRegistrations = registrations.filter((reg) => {
    const finance = calculateRegistrationFinance(reg, activeEvent)
    if (!matchesCardFilter(reg, cardFilter, activeEvent)) return false
    // 1. Tab filtering
    if (activeTab === 'Checked In' && !reg.checkedIn) return false
    if (activeTab === 'Missing Ticket' && reg.ticketCode) return false
    if (activeTab === 'Door Paid' && !paymentStatusMatches(reg.paymentStatus, 'door')) return false
    if (activeTab === 'To Pay at Door' && !paymentStatusMatches(reg.paymentStatus, 'door-list')) return false
    if (activeTab === 'Review Needed' && !registrationNeedsReview(reg, activeEvent)) return false
    if (['Paid', 'Pending', 'Complimentary', 'Outstanding Balance'].includes(activeTab)) {
      if (!financeFilterMatches(reg, activeTab, activeEvent)) return false
    }

    // 2. Advanced Filters
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase()
      if (![reg.fullName, reg.buyerName, attendeeNamesText(reg), reg.email, reg.phone, reg.ticketCode].some(v => v?.toLowerCase().includes(q))) {
        return false
      }
    }
    if (filters.guestName && !reg.fullName?.toLowerCase().includes(filters.guestName.toLowerCase())) return false
    if (filters.buyerName && !reg.buyerName?.toLowerCase().includes(filters.buyerName.toLowerCase())) return false
    if (filters.attendeeName && !attendeeNamesText(reg).toLowerCase().includes(filters.attendeeName.toLowerCase())) return false
    if (filters.contact && !(reg.email?.toLowerCase().includes(filters.contact.toLowerCase()) || reg.phone?.toLowerCase().includes(filters.contact.toLowerCase()))) return false
    if (filters.group && !reg.groupName?.toLowerCase().includes(filters.group.toLowerCase())) return false
    if (filters.ticketCode && !reg.ticketCode?.toLowerCase().includes(filters.ticketCode.toLowerCase())) return false
    if (filters.priceTier && !reg.priceTier?.toLowerCase().includes(filters.priceTier.toLowerCase())) return false
    if (filters.paymentStatus && !paymentStatusMatches(reg.paymentStatus, filters.paymentStatus)) return false
    if (filters.paymentMethod && reg.paymentMethod !== filters.paymentMethod) return false
    if (filters.balanceDue) {
      if (!finance.balanceDue || finance.balanceDue <= 0) return false
    }
    if (filters.missingTicket && reg.ticketCode) return false
    if (filters.missingAmount) {
      if (finance.amountDue !== null && finance.amountPaid !== null) return false
    }
    if (filters.reviewNeeded) {
      if (!registrationNeedsReview(reg, activeEvent)) return false
    }
    
    return true
  })
  const allMetrics = buildRegistrationMetrics(registrations, activeEvent)
  const filteredMetrics = buildRegistrationMetrics(filteredRegistrations, activeEvent)
  const financeSummary = buildFinanceSummary(registrations, activeEvent)
  const isFiltering = activeTab !== 'All' || Boolean(cardFilter) || Object.values(filters).some(Boolean)
  const showingText = isFiltering
    ? `Showing ${filteredMetrics.totalRegistrations} of ${allMetrics.totalRegistrations} registrations and ${filteredMetrics.totalPersons} of ${allMetrics.totalPersons} persons.`
    : `Showing all registrations: ${allMetrics.totalRegistrations} registration${allMetrics.totalRegistrations === 1 ? '' : 's'} / ${allMetrics.totalPersons} person${allMetrics.totalPersons === 1 ? '' : 's'}.`
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
          <h2 className="font-serif text-3xl text-[#2B1723]">Registrations</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Managing registrations for <strong>{activeEvent.eventName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#8C766A] shadow-sm transition hover:bg-[#FBF8F5]"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <Link
            to="/imports"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#8C766A] shadow-sm transition hover:bg-[#FBF8F5]"
          >
            Import Center
          </Link>
          <button
            type="button"
            onClick={() => { setEditingRegistration(null); setIsModalOpen(true) }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B]"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add registration</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {loadError && <ErrorState message={loadError} onRetry={() => window.location.reload()} />}
      {success && (
        <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4 text-xs leading-5 text-[#816D62]">
        <p>
          <strong>Registrations</strong> are rows or groups. <strong>Persons</strong> counts guests through personsAttending, so checked-in persons can be higher than checked-in registrations. <strong>Finance warnings</strong> are rows with missing or inconsistent price, payment, or balance data.
        </p>
        <p className="mt-1 font-semibold text-[#6B564C]">{showingText}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Total registrations', value: allMetrics.totalRegistrations, help: 'Registration rows or groups.', key: '' },
          { label: 'Total persons', value: allMetrics.totalPersons, help: 'Total guests counted through personsAttending.', key: '' },
          { label: 'Paid', value: `${allMetrics.paidRegistrations} regs / ${allMetrics.paidPersons} persons`, help: 'Payment status paid.', tab: 'Paid' },
          { label: 'Pending', value: `${allMetrics.pendingRegistrations} regs / ${allMetrics.pendingPersons} persons`, help: 'Payment status pending.', tab: 'Pending' },
          { label: 'Complimentary', value: `${allMetrics.complimentaryRegistrations} regs / ${allMetrics.complimentaryPersons} persons`, help: 'Comped guest rows.', tab: 'Complimentary' },
          { label: 'Door Paid', value: `${allMetrics.doorRegistrations} regs / ${allMetrics.doorPersons} persons`, help: 'Confirmed paid at door or late.', tab: 'Door Paid', card: 'door' },
          { label: 'Total expected', value: formatCurrency(financeSummary.totalExpected), help: 'Ticket totals from explicit ticketPrice or amountDue only.' },
          { label: 'Collected', value: formatCurrency(financeSummary.totalCollected), help: 'Confirmed amountPaid across registrations.' },
          { label: 'Outstanding Balance', value: formatCurrency(financeSummary.totalOutstanding), help: 'Click to see rows with balance due.', tab: 'Outstanding Balance', card: 'outstanding' },
          { label: 'To Pay at Door', value: formatCurrency(financeSummary.doorTotal), help: 'Expected door balances, not confirmed paid.', tab: 'To Pay at Door', card: 'door-list' },
          { label: 'Complimentary value', value: formatCurrency(financeSummary.complimentaryValue), help: 'Value of complimentary tickets when prices are explicit.' },
          { label: 'Finance Warning', value: financeSummary.financeWarningCount, help: 'Click to see exact rows needing finance review.', card: 'finance-warning' },
          { label: 'Checked In', value: `${allMetrics.checkedInRegistrations} regs / ${allMetrics.checkedInPersons} persons`, help: 'Rows checked in and guests represented.', card: 'checked-in' },
          { label: 'Not Checked In', value: `${allMetrics.remainingRegistrations} regs / ${allMetrics.remainingPersons} persons`, help: 'Rows still not checked in.', card: 'not-checked-in' },
          { label: 'Missing Ticket', value: allMetrics.missingTicketRegistrations, help: 'Missing ticket rows with no ticket code.', tab: 'Missing Ticket', card: 'missing-ticket' },
          { label: 'Review Needed', value: registrations.filter((reg) => registrationNeedsReview(reg, activeEvent)).length, help: 'Rows from uncertain finance or missing ticket review.', tab: 'Review Needed', card: 'review-needed' },
          { label: 'Selected rows', value: selectedIds.size, help: 'Rows currently selected for bulk actions.' },
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

      <div className="flex flex-col gap-6">
        <RegistrationFilters 
          filters={filters} 
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
                    : 'bg-white text-[#8C766A] border border-[#E5D7CF] hover:bg-[#F2E8E1]'
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
            {allVisibleSelected ? 'Clear selection' : 'Select all visible rows'}
          </button>
          <button
            type="button"
            onClick={selectVisibleRows}
            className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
          >
            Select all filtered rows
          </button>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl px-4 py-2 text-xs font-bold text-[#8C7567] hover:bg-[#F2E8E1]"
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
                  <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={allVisibleSelected ? clearSelection : selectVisibleRows}
                        aria-label="Select all visible rows"
                      />
                    </th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Finance</th>
                    <th className="px-4 py-3">Ticket status</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8E1]">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.registrationId}>
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
                          <span className="rounded-full bg-[#FFF8F2] px-2 py-0.5 text-[10px] font-bold text-[#B76E79]">{personsLabel(reg)}</span>
                          {registrationNeedsReview(reg, activeEvent) && <span className="rounded-full bg-[#FFF7E8] px-2 py-0.5 text-[10px] font-bold text-[#986F26]">Review needed</span>}
                        </div>
                        {reg.buyerName && <div className="text-xs font-semibold text-[#8C7567]">Buyer: {reg.buyerName}</div>}
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
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8C766A] hover:bg-[#FFF8F2]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRegistration(reg)}
                          className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A85F6B] hover:bg-[#FCEEF1]"
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
