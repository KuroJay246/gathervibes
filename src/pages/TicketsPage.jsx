import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Search, TicketCheck, Trash2, Wand2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { clearTicketAssignment, saveTicketAssignment } from '../services/ticketService'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { generateTicketCode, normalizeTicketCode, searchableRegistrationText } from '../utils/ticketUtils'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'no-ticket', label: 'No ticket' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'complimentary', label: 'Complimentary' },
]

function titleCase(value = '') {
  return value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function TicketBadge({ children, tone = 'neutral' }) {
  const tones = {
    green: 'bg-[#E5F3EC] text-[#1E7345]',
    gold: 'bg-[#FFF4DF] text-[#986F26]',
    blush: 'bg-[#FCEEF1] text-[#A32626]',
    neutral: 'bg-[#F7F1ED] text-[#8C766A]',
  }
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

function useRegistrationList(activeEvent) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    setError('')
    return subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setRegistrations(data)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error('Ticket registration fetch error:', err)
        setError('Could not load registrations for ticket assignment.')
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  return { registrations, loading, error }
}

export function TicketsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const { registrations, loading, error } = useRegistrationList(activeEvent)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [draftCodes, setDraftCodes] = useState({})
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const existingCodes = useMemo(
    () => new Set(registrations.map((registration) => normalizeTicketCode(registration.ticketCode)).filter(Boolean)),
    [registrations],
  )

  const filteredRegistrations = registrations.filter((registration) => {
    if (filter === 'no-ticket' && registration.ticketStatus === 'assigned') return false
    if (filter === 'assigned' && registration.ticketStatus !== 'assigned') return false
    if (['paid', 'pending', 'complimentary'].includes(filter) && registration.paymentStatus !== filter) return false

    if (!searchQuery.trim()) return true
    return searchableRegistrationText(registration).includes(searchQuery.trim().toLowerCase())
  })

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={TicketCheck}
        title="No selected event"
        description="Select a Working Event before assigning ticket codes."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading ticket assignments…" />

  async function assignCode(registration, code, action = 'ticket.assign') {
    setSavingId(registration.registrationId)
    setMessage('')
    setActionError('')
    try {
      await saveTicketAssignment(registration, code, registrations, user, action)
      setMessage(action === 'ticket.regenerate' ? 'Ticket code regenerated.' : 'Ticket code assigned.')
      setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: '' }))
    } catch (err) {
      setActionError(err.message || 'Ticket assignment failed.')
    } finally {
      setSavingId('')
    }
  }

  async function handleClear(registration) {
    if (!window.confirm(`Clear ticket code for ${registration.fullName}?`)) return
    setSavingId(registration.registrationId)
    setMessage('')
    setActionError('')
    try {
      await clearTicketAssignment(registration, user)
      setMessage('Ticket code cleared.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setActionError('Ticket code could not be cleared.')
    } finally {
      setSavingId('')
    }
  }

  function renderActions(registration) {
    const assigned = registration.ticketStatus === 'assigned' && registration.ticketCode
    const draftCode = draftCodes[registration.registrationId] || ''

    if (assigned) {
      return (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Regenerate ticket code for ${registration.fullName}?`)) {
                assignCode(registration, generateTicketCode(existingCodes), 'ticket.regenerate')
              }
            }}
            disabled={savingId === registration.registrationId}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" />
            Regenerate
          </button>
          <button
            type="button"
            onClick={() => handleClear(registration)}
            disabled={savingId === registration.registrationId}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FCEEF1] px-3 py-2 text-xs font-bold text-[#A32626] hover:bg-[#F8DDE3] disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <input
          value={draftCode}
          onChange={(event) => setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: event.target.value.toUpperCase() }))}
          placeholder="GSV-XXXXXX"
          className="min-h-10 rounded-lg border border-[#E5D7CF] bg-white px-3 text-xs font-bold text-[#2B1723] focus:border-[#B76E79] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => assignCode(registration, draftCode)}
          disabled={savingId === registration.registrationId || !draftCode.trim()}
          className="rounded-lg bg-[#2B1723] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          Assign
        </button>
        <button
          type="button"
          onClick={() => assignCode(registration, generateTicketCode(existingCodes))}
          disabled={savingId === registration.registrationId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B76E79] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <Wand2 className="size-3.5" />
          Generate
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1E7345]">Phase 4.5</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Tickets</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Assigning ticket codes for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs text-[#6B564C]">
          Codes are private admin references. No guest accounts or public ticket purchase flow is active.
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name, email, phone, ticket code…"
            className="w-full rounded-xl border border-[#E5D7CF] bg-white py-3 pl-9 pr-4 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
          />
        </div>
        <div className="flex overflow-x-auto pb-2 lg:pb-0">
          <div className="flex gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${filter === item.value ? 'bg-[#2B1723] text-white' : 'bg-white text-[#8C766A] hover:bg-[#F2E8E1]'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredRegistrations.length === 0 ? (
        <EmptyState icon={TicketCheck} title="No ticket records found" description="Try another filter or search term." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-[#EEDFD6] bg-white shadow-[0_4px_16px_rgba(43,23,35,0.03)] xl:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3 text-right">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8E1]">
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.registrationId}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#2B1723]">{registration.fullName}</div>
                      {registration.groupName && <div className="text-xs text-[#816D62]">{registration.groupName}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#5D4A52]">
                      {registration.email && <div>{registration.email}</div>}
                      {registration.phone && <div>{registration.phone}</div>}
                    </td>
                    <td className="px-4 py-3"><TicketBadge tone={registration.paymentStatus === 'paid' ? 'green' : registration.paymentStatus === 'pending' ? 'gold' : 'neutral'}>{titleCase(registration.paymentStatus)}</TicketBadge></td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-bold text-[#2B1723]">{registration.ticketCode || 'No ticket'}</div>
                      <div className="mt-1"><TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>{titleCase(registration.ticketStatus || 'no-ticket-assigned')}</TicketBadge></div>
                    </td>
                    <td className="px-4 py-3 text-right">{renderActions(registration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 xl:hidden">
            {filteredRegistrations.map((registration) => (
              <article key={registration.registrationId} className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-[#2B1723]">{registration.fullName}</h3>
                    <p className="mt-1 text-xs text-[#816D62]">{registration.email || registration.phone || 'No contact'}</p>
                  </div>
                  <TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>{registration.ticketStatus === 'assigned' ? 'Assigned' : 'No ticket'}</TicketBadge>
                </div>
                <div className="mt-4 rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Ticket code</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#2B1723]">{registration.ticketCode || 'Not assigned'}</p>
                </div>
                <div className="mt-4">{renderActions(registration)}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
