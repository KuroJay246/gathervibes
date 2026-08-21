import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Printer, RefreshCw, Search, TicketCheck, Trash2, Wand2, X } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { clearTicketAssignment, saveTicketAssignment } from '../services/ticketService'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { TicketQrCode } from '../components/tickets/TicketQrCode'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { generateSequentialTicketCode, generateTicketCode, getTicketPrefix, normalizeTicketCode, searchableRegistrationText } from '../utils/ticketUtils'
import { formatPaymentLabel, normalizePaymentStatus, paymentStatusMatches } from '../utils/paymentStatus'
import { calculateRegistrationFinance, formatCurrency } from '../utils/financeUtils'
import { InfoHint } from '../components/ui/InfoHint'
import { PageTabs } from '../components/ui/PageTabs'

const FILTER_GROUPS = [
  {
    label: 'Ticket Status',
    items: [
      { value: 'all', label: 'All Tickets' },
      { value: 'assigned', label: 'Assigned' },
      { value: 'no-ticket', label: 'Missing Ticket Code' },
    ],
  },
  {
    label: 'Payment Status',
    items: [
      { value: 'paid', label: 'Paid' },
      { value: 'pending', label: 'Pending' },
      { value: 'outstanding', label: 'Outstanding Balance' },
      { value: 'door', label: 'Door Paid' },
      { value: 'door-list', label: 'To Pay at Door' },
      { value: 'complimentary', label: 'Complimentary' },
    ],
  },
  {
    label: 'Check-In Status',
    items: [
      { value: 'checked-in', label: 'Checked In' },
      { value: 'not-checked-in', label: 'Not Checked In' },
    ],
  },
  {
    label: 'Review',
    items: [
      { value: 'review-needed', label: 'Needs Review' },
    ],
  },
]

function titleCase(value = '') {
  return value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function TicketBadge({ children, tone = 'neutral' }) {
  const tones = {
    green: 'bg-[#E5F3EC] text-[#1E7345]',
    gold: 'bg-[#FFF4DF] text-[#7A5818]',
    blush: 'bg-[#FCEEF1] text-[#A32626]',
    neutral: 'bg-[#F7F1ED] text-[#80685B]',
  }
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) && registration.attendeeNames.length > 0
    ? registration.attendeeNames.join(', ')
    : ''
}

function CompactMetric({ label, value, help }) {
  return (
    <article className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#2B1723]">{value}</p>
      {help && <p className="mt-2 text-xs leading-5 text-[#816D62]">{help}</p>}
    </article>
  )
}

function ticketNeedsReview(registration = {}, event = {}) {
  const finance = calculateRegistrationFinance(registration, event)
  return finance.needsFinanceReview || registration.financeReviewRequired || !registration.ticketCode
}

function useRegistrationList(activeEvent) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setRegistrations([])
      setError('')
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
  }, [activeEvent?.eventId, reloadKey])

  function retry() {
    setLoading(true)
    setError('')
    setReloadKey((current) => current + 1)
  }

  return { registrations, loading, error, retry }
}

export function TicketsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const { registrations, loading, error, retry } = useRegistrationList(activeEvent)
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [draftCodes, setDraftCodes] = useState({})
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [showPrintableQrs, setShowPrintableQrs] = useState(false)
  const [selectedRegistrationId, setSelectedRegistrationId] = useState('')
  const [ticketConfirmation, setTicketConfirmation] = useState(null)
  const requestedWorkspace = searchParams.get('workspace') || 'records'
  const activeWorkspace = ['records', 'assignment-delivery', 'review-tools'].includes(requestedWorkspace) ? requestedWorkspace : 'records'

  function setTicketWorkspace(workspace) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (workspace === 'records') next.delete('workspace')
      else next.set('workspace', workspace)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSearchQuery('')
    setFilter('all')
    setDraftCodes({})
    setSavingId('')
    setMessage('')
    setActionError('')
    setShowPrintableQrs(false)
    setSelectedRegistrationId('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  const existingCodes = useMemo(
    () => new Set(registrations.map((registration) => normalizeTicketCode(registration.ticketCode)).filter(Boolean)),
    [registrations],
  )
  const ticketPrefix = getTicketPrefix(activeEvent)

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
  const selectedRegistration = filteredRegistrations.find((registration) => registration.registrationId === selectedRegistrationId)
    || filteredRegistrations[0]
    || null
  const ticketMetrics = useMemo(() => {
    const allAssigned = registrations.filter((registration) => registration.ticketStatus === 'assigned' && registration.ticketCode)
    const checkedInAssigned = allAssigned.filter((registration) => registration.checkedIn)
    const needsReview = registrations.filter((registration) => ticketNeedsReview(registration, activeEvent))
    return {
      registrations: registrations.length,
      ticketsIssued: allAssigned.length,
      ticketsNotIssued: registrations.length - allAssigned.length,
      checkedInTickets: checkedInAssigned.length,
      unusedTickets: Math.max(0, allAssigned.length - checkedInAssigned.length),
      reviewNeeded: needsReview.length,
    }
  }, [activeEvent, registrations])

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={TicketCheck}
        title="No selected event"
        description="Select a Working Event before assigning ticket codes."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading ticket assignments…" />
  if (error) return <ErrorState message={error} onRetry={retry} />

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
    setTicketConfirmation({ action: 'clear', registration })
  }

  async function confirmTicketAction() {
    const pendingAction = ticketConfirmation
    if (!pendingAction?.registration) return
    const registration = pendingAction.registration
    if (pendingAction.action === 'regenerate') {
      setTicketConfirmation(null)
      await assignCode(registration, generateSequentialTicketCode(existingCodes, activeEvent), 'ticket.regenerate')
      return
    }
    setSavingId(registration.registrationId)
    setMessage('')
    setActionError('')
    try {
      await clearTicketAssignment(registration, user)
      setMessage('Ticket code cleared.')
      setTicketConfirmation(null)
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
              id={`ticket-manual-code-${registration.registrationId}`}
              name={`ticketManualCode-${registration.registrationId}`}
              aria-label={`Manual ticket code for ${registration.fullName}`}
              value={draftCode}
              onChange={(event) => setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: event.target.value.toUpperCase() }))}
              placeholder={registration.ticketCode || `${ticketPrefix}-001`}
              className="min-h-10 rounded-lg border border-[#E5D7CF] bg-white px-3 text-xs font-bold text-[#2B1723] focus:border-[#9A5260] focus:outline-none"
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
            onClick={() => setTicketConfirmation({ action: 'regenerate', registration })}
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
          id={`ticket-assign-code-${registration.registrationId}`}
          name={`ticketAssignCode-${registration.registrationId}`}
          aria-label={`Ticket code to assign to ${registration.fullName}`}
          value={draftCode}
          onChange={(event) => setDraftCodes((prev) => ({ ...prev, [registration.registrationId]: event.target.value.toUpperCase() }))}
          placeholder={`${ticketPrefix}-001`}
          className="min-h-10 rounded-lg border border-[#E5D7CF] bg-white px-3 text-xs font-bold text-[#2B1723] focus:border-[#9A5260] focus:outline-none"
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
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#9A5260] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
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
    <div data-tour-id="tickets-workspace" className="space-y-6">
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

      <section aria-label="Ticket summary" className="gsv-compact-metric-grid">
        <CompactMetric label="Registrations" value={ticketMetrics.registrations} />
        <CompactMetric label="Tickets Issued" value={ticketMetrics.ticketsIssued} />
        <CompactMetric label="Tickets Not Yet Issued" value={ticketMetrics.ticketsNotIssued} />
        <CompactMetric label="Checked-In Tickets" value={ticketMetrics.checkedInTickets} />
        <CompactMetric label="Unused Tickets" value={ticketMetrics.unusedTickets} />
        <CompactMetric label="Ticket Records Needing Review" value={ticketMetrics.reviewNeeded} />
      </section>

      <section className="gsv-section-card" data-tour-id="tickets-workspace-tabs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Ticket workspace</p>
            <h3 className="mt-1 font-serif text-xl text-[#2B1723]">
              {activeWorkspace === 'records' ? 'Ticket Records' : activeWorkspace === 'assignment-delivery' ? 'Assignment & Delivery' : 'Review & Tools'}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#816D62]">
              Ticket Records remain the normal workflow. Assignment controls change ticket codes only; Review & Tools contains filters, QR printing, and recovery work.
            </p>
          </div>
          <PageTabs
            tabs={[
              { id: 'records', label: 'Ticket Records' },
              { id: 'assignment-delivery', label: 'Assignment & Delivery' },
              { id: 'review-tools', label: 'Review & Tools' },
            ]}
            active={activeWorkspace}
            onChange={setTicketWorkspace}
            label="Ticket workspaces"
            idPrefix="tickets"
            controlsPanels={false}
          />
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        <p className="font-semibold text-[#6B564C]">
          Showing {filteredRegistrations.length} registration{filteredRegistrations.length === 1 ? '' : 's'} for <strong>{activeEvent.eventName}</strong>.
        </p>
        <p>
          Assigned tickets in this view: <strong>{assignedRegistrations.length}</strong>.
        </p>
      </section>

      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      {activeWorkspace === 'assignment-delivery' && (
        <section className="gsv-section-card" data-tour-id="ticket-assignment-delivery">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Assignment & Delivery</p>
          <h3 className="mt-1 font-serif text-xl text-[#2B1723]">What ticket actions change</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-4">
              <p className="text-sm font-bold text-[#2B1723]">Generate or assign</p>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">Creates or replaces the ticket code on the registration record for this Working Event.</p>
            </div>
            <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-4">
              <p className="text-sm font-bold text-[#2B1723]">QR state</p>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">QR uses only <code>GSV:TICKET:ticketCode</code>. It does not store contact, payment, or guest names.</p>
            </div>
            <div className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-4">
              <p className="text-sm font-bold text-[#2B1723]">Delivery reference</p>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">This app prepares ticket codes and QR access. It does not send email, SMS, or payment messages.</p>
            </div>
          </div>
        </section>
      )}

      {activeWorkspace === 'review-tools' && (
      <section className="gsv-section-card space-y-4" data-tour-id="ticket-filter-workspace">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Ticket review</p>
            <h3 className="mt-1 font-serif text-xl text-[#2B1723]">Find the ticket records that need work</h3>
            <p className="mt-1 text-xs leading-5 text-[#816D62]">
              Search ticket code, guest, buyer, attendees, email, phone, group, payment status, or price tier. These controls filter the visible ticket records below.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => { setFilter('all'); setSearchQuery(''); }}
            className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-[#80685B] hover:bg-[#F2E8E1] transition"
          >
            <X className="size-3" /> Clear filters
          </button>
        </div>
        <div className="grid gap-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
            <input
              id="ticket-search"
              name="ticketSearch"
              aria-label="Search ticket records"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search keyword..."
              className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-9 pr-4 text-sm focus:border-[#9A5260] focus:outline-none focus:ring-1 focus:ring-[#9A5260]"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {FILTER_GROUPS.map((group) => (
              <div key={group.label} className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{group.label}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${filter === item.value ? 'bg-[#2B1723] text-white' : 'bg-white text-[#80685B] hover:bg-[#F2E8E1] border border-[#E5D7CF]'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {activeWorkspace === 'review-tools' && assignedRegistrations.length > 0 && (
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
          {selectedRegistration && (
            <section className="gsv-section-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Ticket details</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">{selectedRegistration.fullName}</h3>
                  <p className="mt-2 text-sm text-[#816D62]">
                    {selectedRegistration.buyerName || 'No buyer name'} · {selectedRegistration.email || selectedRegistration.phone || 'No contact'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <TicketBadge tone={selectedRegistration.ticketStatus === 'assigned' ? 'green' : 'blush'}>
                    {selectedRegistration.ticketStatus === 'assigned' ? 'Ticket issued' : 'Ticket not issued'}
                  </TicketBadge>
                  <TicketBadge tone={selectedRegistration.checkedIn ? 'green' : 'neutral'}>
                    {selectedRegistration.checkedIn ? 'Checked in' : 'Not checked in'}
                  </TicketBadge>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="rounded-2xl bg-[#FBF8F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Ticket</p>
                  <p className="mt-2 font-mono text-lg font-bold text-[#2B1723]">{selectedRegistration.ticketCode || 'Not assigned'}</p>
                  <p className="mt-2 text-xs text-[#816D62]">Event: {activeEvent.eventName}</p>
                </div>
                <div className="rounded-2xl bg-[#FBF8F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Guest</p>
                  <p className="mt-2 text-sm font-semibold text-[#2B1723]">{selectedRegistration.fullName}</p>
                  <p className="mt-2 text-xs text-[#816D62]">Guests covered: {selectedRegistration.personsAttending || 1}</p>
                  {attendeeNamesText(selectedRegistration) && <p className="mt-2 text-xs text-[#816D62]">Attendees: {attendeeNamesText(selectedRegistration)}</p>}
                </div>
                <div className="rounded-2xl bg-[#FBF8F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Attendance</p>
                  <p className="mt-2 text-sm font-semibold text-[#2B1723]">{selectedRegistration.checkedIn ? 'Checked in' : 'Not checked in'}</p>
                  <p className="mt-2 text-xs text-[#816D62]">Use Check-In to record attendance for this Working Event.</p>
                </div>
                <div className="rounded-2xl bg-[#FBF8F5] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Actions</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPrintableQrs(true)}
                      className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
                    >
                      View ticket QR
                    </button>
                    <Link to="/check-in" className="rounded-xl bg-[#2B1723] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[#3B2430]">
                      Open Check-In
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="hidden overflow-hidden rounded-2xl border border-[#EEDFD6] bg-white shadow-[0_4px_16px_rgba(43,23,35,0.03)] xl:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#80685B]">
                  <th className="px-4 py-3">Registrant / attendee</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Ticket code</th>
                  <th className="px-4 py-3">Ticket status</th>
                  <th className="px-4 py-3">Attendance</th>
                  <th className="px-4 py-3">Source / payment</th>
                  <th className="px-4 py-3 text-right">Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8E1]">
                {filteredRegistrations.map((registration) => (
                  <tr
                    key={registration.registrationId}
                    className={selectedRegistration?.registrationId === registration.registrationId ? 'bg-[#FFF8F2]' : ''}
                  >
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setSelectedRegistrationId(registration.registrationId)} className="text-left">
                        <div className="font-medium text-[#2B1723]">{registration.fullName}</div>
                      </button>
                      {registration.buyerName && <div className="text-xs font-semibold text-[#80685B]">Buyer / Contact: {registration.buyerName}</div>}
                      {attendeeNamesText(registration) && <div className="max-w-xs text-xs text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#5D4A52]">{registration.personsAttending || 1}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-[#2B1723]">{registration.ticketCode || 'Not assigned'}</td>
                    <td className="px-4 py-3">
                      <TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>
                        {titleCase(registration.ticketStatus || 'no-ticket-assigned')}
                      </TicketBadge>
                    </td>
                    <td className="px-4 py-3"><TicketBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{registration.checkedIn ? 'Checked in' : 'Not checked in'}</TicketBadge></td>
                    <td className="px-4 py-3">
                      {(() => {
                        const finance = calculateRegistrationFinance(registration, activeEvent)
                        return (
                          <div className="space-y-1">
                            {registration.groupName && <div className="text-xs text-[#816D62]">{registration.groupName}</div>}
                            <TicketBadge tone={normalizePaymentStatus(registration.paymentStatus) === 'paid' ? 'green' : normalizePaymentStatus(registration.paymentStatus) === 'pending' || normalizePaymentStatus(registration.paymentStatus) === 'door' ? 'gold' : 'neutral'}>{formatPaymentLabel(registration.paymentStatus)}</TicketBadge>
                            {finance.balanceDue > 0 && <div className="text-xs font-bold text-[#A32626]">Balance {formatCurrency(finance.balanceDue)}</div>}
                          </div>
                        )
                      })()}
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
                    {Number(registration.personsAttending) > 1 && <p className="mt-1 text-xs font-bold text-[#9A5260]">Group of {registration.personsAttending}</p>}
                    {registration.buyerName && <p className="mt-1 text-xs font-semibold text-[#80685B]">Buyer / Contact: {registration.buyerName}</p>}
                    {attendeeNamesText(registration) && <p className="mt-1 text-xs text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</p>}
                    <p className="mt-1 text-xs text-[#816D62]">{registration.email || registration.phone || 'No contact'}</p>
                  </div>
                  <TicketBadge tone={registration.ticketStatus === 'assigned' ? 'green' : 'blush'}>{registration.ticketStatus === 'assigned' ? 'Assigned' : 'No ticket'}</TicketBadge>
                </div>
                <div className="mt-4 rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Ticket code</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#2B1723]">{registration.ticketCode || 'Not assigned'}</p>
                </div>
                {registration.ticketStatus === 'assigned' && registration.ticketCode && (
                  <details className="mt-3 rounded-xl border border-[#F2E8E1] bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-[#80685B]">Show QR code</summary>
                    <div className="border-t border-[#F2E8E1] p-3">
                    <TicketQrCode ticketCode={registration.ticketCode} />
                    </div>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <TicketBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{registration.checkedIn ? 'Checked in' : 'Not checked in'}</TicketBadge>
                  {(() => {
                    const finance = calculateRegistrationFinance(registration, activeEvent)
                    return finance.balanceDue > 0 ? <TicketBadge tone="gold">Balance {formatCurrency(finance.balanceDue)}</TicketBadge> : null
                  })()}
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegistrationId(registration.registrationId)}
                    className="flex-1 rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
                  >
                    View Ticket
                  </button>
                  <Link to="/check-in" className="flex-1 rounded-xl bg-[#2B1723] px-3 py-2 text-center text-xs font-bold text-white hover:bg-[#3B2430]">
                    Check-In
                  </Link>
                </div>
                <div className="mt-4">{renderActions(registration)}</div>
              </article>
            ))}
          </div>
        </>
      )}
      <ConfirmDialog
        open={Boolean(ticketConfirmation)}
        title={ticketConfirmation?.action === 'regenerate' ? 'Regenerate ticket code?' : 'Clear ticket code?'}
        recordName={ticketConfirmation?.registration?.fullName}
        message={ticketConfirmation?.action === 'regenerate'
          ? `This replaces the current ticket code for ${activeEvent?.eventName || 'the Working Event'}. QR codes still use the existing ticket-code-only payload format.`
          : `This removes the ticket code from this registration in ${activeEvent?.eventName || 'the Working Event'}.`}
        confirmLabel={ticketConfirmation?.action === 'regenerate' ? 'Regenerate Code' : 'Clear Ticket'}
        pending={Boolean(savingId)}
        onCancel={() => setTicketConfirmation(null)}
        onConfirm={confirmTicketAction}
      />
    </div>
  )
}
