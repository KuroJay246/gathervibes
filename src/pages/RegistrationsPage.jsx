import { useState, useEffect } from 'react'
import { Plus, Search, Trash2, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import {
  subscribeToRegistrations,
  createRegistration,
  updateRegistration,
  deleteRegistration,
  bulkDeleteRegistrations,
  bulkUpdatePaymentStatus,
} from '../services/registrationService'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RegistrationCard } from '../components/registrations/RegistrationCard'
import { RegistrationFormModal } from '../components/registrations/RegistrationFormModal'
import { DeleteRegistrationDialog } from '../components/registrations/DeleteRegistrationDialog'
import { Link } from 'react-router-dom'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'
import { formatPaymentLabel, paymentStatusMatches } from '../utils/paymentStatus'

const TABS = ['All', 'Paid', 'Pending', 'Complimentary', 'Door', 'Missing Ticket', 'Checked In']

function titleCase(value = '') {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) ? registration.attendeeNames.join(', ') : ''
}

export function RegistrationsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  const [isModalOpen, setIsModalOpen] = useState(false)
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
    if (activeTab === 'Checked In' && !reg.checkedIn) return false
    if (activeTab === 'Missing Ticket' && reg.ticketCode) return false
    if (!['All', 'Checked In', 'Missing Ticket'].includes(activeTab) && !paymentStatusMatches(reg.paymentStatus, activeTab)) return false
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      reg.fullName?.toLowerCase().includes(query)
      || reg.buyerName?.toLowerCase().includes(query)
      || attendeeNamesText(reg).toLowerCase().includes(query)
      || reg.email?.toLowerCase().includes(query)
      || reg.phone?.toLowerCase().includes(query)
      || reg.ticketCode?.toLowerCase().includes(query)
    )
  })
  const allMetrics = buildRegistrationMetrics(registrations, activeEvent)
  const filteredMetrics = buildRegistrationMetrics(filteredRegistrations, activeEvent)
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

  async function handleSave(data) {
    setSaving(true)
    setSuccess('')
    try {
      if (editingRegistration) {
        await updateRegistration(editingRegistration.registrationId, activeEvent.eventId, data, user, editingRegistration)
        setSuccess('Registration updated.')
      } else {
        await createRegistration(data, activeEvent.eventId, user)
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

        <div className="flex gap-3">
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Total registrations', allMetrics.totalRegistrations],
          ['Total persons', allMetrics.totalPersons],
          ['Paid', `${allMetrics.paidRegistrations} / ${allMetrics.paidPersons}`],
          ['Pending', `${allMetrics.pendingRegistrations} / ${allMetrics.pendingPersons}`],
          ['Complimentary', `${allMetrics.complimentaryRegistrations} / ${allMetrics.complimentaryPersons}`],
          ['Door', `${allMetrics.doorRegistrations} / ${allMetrics.doorPersons}`],
          ['Checked in', `${allMetrics.checkedInRegistrations} / ${allMetrics.checkedInPersons}`],
          ['Missing ticket', allMetrics.missingTicketRegistrations],
          ['Filtered regs', filteredMetrics.totalRegistrations],
          ['Filtered persons', filteredMetrics.totalPersons],
          ['Selected rows', selectedIds.size],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#EEDFD6] bg-white px-4 py-3">
            <p className="text-lg font-bold text-[#2B1723]">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
          <input
            type="text"
          placeholder="Search guest, buyer, attendee, email, phone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-9 pr-4 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
          />
        </div>

        <div className="flex overflow-x-auto pb-2 sm:pb-0">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  activeTab === tab
                    ? 'bg-[#2B1723] text-white'
                    : 'bg-white text-[#8C766A] hover:bg-[#F2E8E1]'
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
              {['paid', 'pending', 'complimentary', 'door'].map((status) => (
                <option key={status} value={status}>{formatPaymentLabel(status)}</option>
              ))}
            </select>
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
            searchQuery || activeTab !== 'All'
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
    </div>
  )
}
