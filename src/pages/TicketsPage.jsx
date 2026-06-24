import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, RefreshCw, Search, TicketCheck, Trash2, Wand2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { clearTicketAssignment, saveTicketAssignment } from '../services/ticketService'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { TicketQrCode } from '../components/tickets/TicketQrCode'
import { buildTicketPrefix, generateSequentialTicketCode, generateTicketCode, normalizeTicketCode, searchableRegistrationText } from '../utils/ticketUtils'
import { formatPaymentLabel, normalizePaymentStatus, paymentStatusMatches } from '../utils/paymentStatus'
import { calculateRegistrationFinance, formatCurrency } from '../utils/financeUtils'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'no-ticket', label: 'Missing Ticket' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'outstanding', label: 'Outstanding Balance' },
  { value: 'door', label: 'Door Paid' },
  { value: 'door-list', label: 'To Pay at Door' },
  { value: 'checked-in', label: 'Checked In' },
  { value: 'not-checked-in', label: 'Not Checked In' },
  { value: 'complimentary', label: 'Complimentary' },
  { value: 'review-needed', label: 'Review Needed' },
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

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) && registration.attendeeNames.length > 0
    ? registration.attendeeNames.join(', ')
    : ''
}

function ticketNeedsReview(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  return finance.needsFinanceReview || registration.financeReviewRequired || !registration.ticketCode
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
  const [showPrintableQrs, setShowPrintableQrs] = useState(false)

  const existingCodes = useMemo(
    () => new Set(registrations.map((registration) => normalizeTicketCode(registration.ticketCode)).filter(Boolean)),
    [registrations],
  )
  const ticketPrefix = buildTicketPrefix(activeEvent)

  const filteredRegistrations = registrations.filter((registration) => {
    if (filter === 'no-ticket' && registration.ticketCode) return false
    if (filter === 'assigned' && registration.ticketStatus !== 'assigned') return false
    if (filter === 'checked-in' && !registration.checkedIn) return false
    if (filter === 'not-checked-in' && registration.checkedIn) return false
    
    if (['paid', 'pending', 'complimentary'].includes(filter) && !paymentStatusMatches(registration.paymentStatus, filter)) return false
    if (filter === 'door' && !paymentStatusMatches(registration.paymentStatus, 'door')) return false
    if (filter === 'door-list' && !paymentStatusMatches(registration.paymentStatus, 'door-list')) return false
    if (filter === 'review-needed' && !ticketNeedsReview(registration, activeEvent)) return false
    if (filter === 'outstanding') {
      const fin = calculateRegistrationFinance(registration, activeEvent)
      if (!fin.balanceDue || fin.balanceDue <= 0) return false
    }

    if (!searchQuery.trim()) return true
    // the existing searchableRegistrationText likely covers most of these, but let's make sure
    const q = searchQuery.trim().toLowerCase()
    return [
      searchableRegistrationText(registration),
      registration.ticketCode,
      registration.fullName,
      registration.buyerName,
      attendeeNamesText(registration),
      registration.email,
      registration.phone,
      registration.groupName,
      registration.paymentStatus,
      registration.priceTier,
    ].some((value) => String(value || '').toLowerCase().includes(q))
  })
  const assignedRegistrations = useMemo(
    () => filteredRegistrations.filter((registration) => registration.ticketStatus === 'assigned' && registration.ticketCode),
    [filteredRegistrations],
  )

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
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draftCode}
              onChange={(event) => setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: event.target.value.toUpperCase() }))}
              placeholder={registration.ticketCode || `${ticketPrefix}-001`}
              className="min-h-10 rounded-lg border border-[#E5D7CF] bg-white px-3 text-xs font-bold text-[#2B1723] focus:border-[#B76E79] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => assignCode(registration, draftCode, 'ticket.regenerate')}
              disabled={savingId === registration.registrationId || !draftCode.trim()}
              className="rounded-lg bg-[#2B1723] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Save manual code
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Regenerate ticket code for ${registration.fullName}?`)) {
                assignCode(registration, generateSequentialTicketCode(existingCodes, activeEvent), 'ticket.regenerate')
              }
            }}
            disabled={savingId === registration.registrationId}
            className="inline-flex items-center gap-2 rounded-lg border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" />
            Generate next {ticketPrefix} code
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
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <input
          value={draftCode}
          onChange={(event) => setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: event.target.value.toUpperCase() }))}
          placeholder={`${ticketPrefix}-001`}
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
          onClick={() => assignCode(registration, generateSequentialTicketCode(existingCodes, activeEvent))}
          disabled={savingId === registration.registrationId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B76E79] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          <Wand2 className="size-3.5" />
          Generate next {ticketPrefix} code
        </button>
        <button
          type="button"
          onClick={() => assignCode(registration, generateTicketCode(existingCodes))}
          disabled={savingId === registration.registrationId}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] disabled:opacity-50"
        >
          Random GSV fallback
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-[#2B1723]">Tickets</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Assigning ticket codes for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs text-[#6B564C]">
          QR codes store ticket codes only. Use Generate next {ticketPrefix} code for event-style sequencing.
        </div>
      </header>

      <section className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        <strong>Advanced ticket filters:</strong> use these to find assigned tickets, missing codes, payment states, check-in state, and review-needed rows. QR codes still contain only <code>GSV:TICKET:ticketCode</code>.
      </section>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Advanced Filters</p>
          <p className="mt-1 text-xs text-[#816D62]">Search ticket code, guest, buyer, attendees, email, phone, group, payment status, or price tier.</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
        </div>
      </section>

      {assignedRegistrations.length > 0 && (
        <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">QR Tickets</p>
              <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Printable QR list</h3>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">
                QR codes encode only the assigned ticket code, not guest contact details.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowPrintableQrs((value) => !value)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
              >
                <Printer className="size-4" />
                {showPrintableQrs ? 'Hide QR list' : 'Show QR list'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white hover:bg-[#3B2430]"
              >
                <Printer className="size-4" />
                Print
              </button>
            </div>
          </div>

          {showPrintableQrs && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assignedRegistrations.map((registration) => (
                <article key={registration.registrationId} className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                  <p className="truncate text-sm font-bold text-[#2B1723]">{registration.fullName}</p>
                  {attendeeNamesText(registration) && <p className="mt-1 truncate text-xs text-[#6B564C]">{attendeeNamesText(registration)}</p>}
                  <p className="mt-1 font-mono text-xs font-bold text-[#6B564C]">{registration.ticketCode}</p>
                  <div className="mt-3">
                    <TicketQrCode ticketCode={registration.ticketCode} compact />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

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
                  <th className="px-4 py-3">Check-in</th>
                  <th className="px-4 py-3 text-right">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8E1]">
                {filteredRegistrations.map((registration) => (
                  <tr key={registration.registrationId}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#2B1723]">{registration.fullName}</div>
                      {Number(registration.personsAttending) > 1 && <div className="mt-1"><TicketBadge tone="neutral">Group of {registration.personsAttending}</TicketBadge></div>}
                      {registration.buyerName && <div className="text-xs font-semibold text-[#8C7567]">Buyer / Contact: {registration.buyerName}</div>}
                      {attendeeNamesText(registration) && <div className="max-w-xs text-xs text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</div>}
                      {registration.groupName && <div className="text-xs text-[#816D62]">{registration.groupName}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#5D4A52]">
                      {registration.email && <div>{registration.email}</div>}
                      {registration.phone && <div>{registration.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const finance = calculateRegistrationFinance(registration, activeEvent)
                        return (
                          <div className="space-y-1">
                            <TicketBadge tone={normalizePaymentStatus(registration.paymentStatus) === 'paid' ? 'green' : normalizePaymentStatus(registration.paymentStatus) === 'pending' || normalizePaymentStatus(registration.paymentStatus) === 'door' ? 'gold' : 'neutral'}>{formatPaymentLabel(registration.paymentStatus)}</TicketBadge>
                            {finance.paymentStatus === 'door' && <TicketBadge tone="gold">Door payment</TicketBadge>}
                            {finance.balanceDue > 0 && <div className="text-xs font-bold text-[#A32626]">Balance {formatCurrency(finance.balanceDue)}</div>}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-sm font-bold text-[#2B1723]">{registration.ticketCode || 'No ticket'}</div>
                      <div className="mt-1"><TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>{titleCase(registration.ticketStatus || 'no-ticket-assigned')}</TicketBadge></div>
                      {registration.ticketStatus === 'assigned' && registration.ticketCode && (
                        <div className="mt-3">
                          <TicketQrCode ticketCode={registration.ticketCode} compact />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><TicketBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{registration.checkedIn ? 'Checked in' : 'Not checked in'}</TicketBadge></td>
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
                    {Number(registration.personsAttending) > 1 && <p className="mt-1 text-xs font-bold text-[#B76E79]">Group of {registration.personsAttending}</p>}
                    {registration.buyerName && <p className="mt-1 text-xs font-semibold text-[#8C7567]">Buyer / Contact: {registration.buyerName}</p>}
                    {attendeeNamesText(registration) && <p className="mt-1 text-xs text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</p>}
                    <p className="mt-1 text-xs text-[#816D62]">{registration.email || registration.phone || 'No contact'}</p>
                  </div>
                  <TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>{registration.ticketStatus === 'assigned' ? 'Assigned' : 'No ticket'}</TicketBadge>
                </div>
                <div className="mt-4 rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Ticket code</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#2B1723]">{registration.ticketCode || 'Not assigned'}</p>
                </div>
                {registration.ticketStatus === 'assigned' && registration.ticketCode && (
                  <div className="mt-3">
                    <TicketQrCode ticketCode={registration.ticketCode} />
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <TicketBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{registration.checkedIn ? 'Checked in' : 'Not checked in'}</TicketBadge>
                  {(() => {
                    const finance = calculateRegistrationFinance(registration, activeEvent)
                    return finance.balanceDue > 0 ? <TicketBadge tone="gold">Balance {formatCurrency(finance.balanceDue)}</TicketBadge> : null
                  })()}
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
