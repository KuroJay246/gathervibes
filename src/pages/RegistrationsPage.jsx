import { useState, useEffect } from 'react'
import { Plus, Search, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations, createRegistration, updateRegistration, deleteRegistration } from '../services/registrationService'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { RegistrationCard } from '../components/registrations/RegistrationCard'
import { RegistrationFormModal } from '../components/registrations/RegistrationFormModal'
import { DeleteRegistrationDialog } from '../components/registrations/DeleteRegistrationDialog'
import { Link } from 'react-router-dom'

const TABS = ['All', 'Paid', 'Pending', 'Complimentary', 'Door List']

function titleCase(value = '') {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
    if (activeTab !== 'All' && reg.paymentStatus !== activeTab.toLowerCase().replace(' ', '-')) return false
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      reg.fullName?.toLowerCase().includes(query)
      || reg.email?.toLowerCase().includes(query)
      || reg.phone?.toLowerCase().includes(query)
    )
  })

  async function handleSave(data) {
    setSaving(true)
    setSuccess('')
    try {
      if (editingRegistration) {
        await updateRegistration(editingRegistration.registrationId, activeEvent.eventId, data, user)
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
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1E7345]">Phase 3</p>
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
            Import CSV
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
          <input
            type="text"
            placeholder="Search name, email, phone…"
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
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Party</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Ticket status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E8E1]">
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.registrationId}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#2B1723]">{reg.fullName}</div>
                        {reg.groupName && <div className="text-xs text-[#816D62]">{reg.groupName}</div>}
                      </td>
                      <td className="px-4 py-3 text-[#5D4A52]">
                        {reg.email && <div>{reg.email}</div>}
                        {reg.phone && <div>{reg.phone}</div>}
                      </td>
                      <td className="px-4 py-3">{reg.personsAttending}</td>
                      <td className="px-4 py-3">{titleCase(reg.paymentStatus)}</td>
                      <td className="px-4 py-3 text-xs text-[#816D62]">{titleCase(reg.ticketStatus)}</td>
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
