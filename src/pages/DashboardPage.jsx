import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileInput,
  CreditCard,
  ReceiptText,
  TicketCheck,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveEvent } from '../events/useActiveEvent'
import { useAuth } from '../auth/useAuth'
import { subscribeToEvents } from '../services/eventService'
import { subscribeToRegistrations } from '../services/registrationService'
import { subscribeToOperationsLedger } from '../services/operationsLedgerService'
import { formatCountdown, formatEventDate, toDateInput, upcomingEvents } from '../utils/dateUtils'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'
import { buildFinanceSummary, buildPaymentsWorkspace, formatCurrency } from '../utils/financeUtils'
import { getWorkingEventDisplayName, hasSelectedWorkingEvent } from '../utils/eventDefaults'
import { isApprovedAdmin } from '../utils/accessRoles'
import { buildEventReadiness } from '../utils/eventReadiness'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

function useEventRegistrations(eventId) {
  const [rows, setRows] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRows([])
    if (!eventId) return undefined
    return subscribeToRegistrations(eventId, setRows, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId])

  return rows
}

function useEventOperations(eventId) {
  const [entries, setEntries] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setEntries([])
    if (!eventId) return undefined
    return subscribeToOperationsLedger(eventId, setEntries, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId])

  return entries
}

function sameActiveEventSnapshot(activeEvent, nextEvent) {
  if (!activeEvent || !nextEvent) return false
  return (
    activeEvent.eventId === nextEvent.eventId
    && activeEvent.eventName === nextEvent.eventName
    && toDateInput(activeEvent.eventDate) === toDateInput(nextEvent.eventDate)
    && activeEvent.location === nextEvent.location
    && activeEvent.status === nextEvent.status
  )
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3" aria-label={`${label}: ${value}`}>
      <p className="text-xl font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      {detail && <p className="mt-1 text-xs text-[#816D62]">{detail}</p>}
    </div>
  )
}

function ProgressBar({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#F2E8E1]">
      <div
        className={`h-full rounded-full ${safeValue >= 90 ? 'bg-[#C53030]' : safeValue >= 70 ? 'bg-[#D4890A]' : 'bg-[#9A5260]'}`}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  )
}

export function DashboardPage() {
  const { activeEvent, clearActiveEvent, setActiveEvent } = useActiveEvent()
  const { access, assignedEvents = [] } = useAuth()
  const [allEvents, setAllEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

  const adminUser = isApprovedAdmin(access)
  const visibleEvents = adminUser ? allEvents : assignedEvents
  const visibleEventsLoaded = adminUser ? eventsLoaded : true
  const selectedEvent = activeEvent ? visibleEvents.find((event) => event.eventId === activeEvent.eventId) : null
  const registrations = useEventRegistrations(activeEvent?.eventId)
  const operationsEntries = useEventOperations(activeEvent?.eventId)

  useEffect(() => {
    if (!adminUser) return undefined
    return subscribeToEvents(
      (events) => {
        setAllEvents(events)
        setEventsLoaded(true)
      },
      () => setEventsLoaded(true),
    )
  }, [adminUser])

  useEffect(() => {
    if (!hasSelectedWorkingEvent(activeEvent) || !visibleEventsLoaded) return
    const matchedEvent = visibleEvents.find((event) => event.eventId === activeEvent.eventId)
    if (!matchedEvent) {
      clearActiveEvent()
      return
    }
    if (!sameActiveEventSnapshot(activeEvent, matchedEvent)) setActiveEvent(matchedEvent)
  }, [activeEvent, clearActiveEvent, setActiveEvent, visibleEvents, visibleEventsLoaded])

  const upcoming = useMemo(() => upcomingEvents(visibleEvents), [visibleEvents])
  const metrics = useMemo(() => buildRegistrationMetrics(registrations, selectedEvent), [registrations, selectedEvent])
  const financeSummary = useMemo(() => buildFinanceSummary(registrations, selectedEvent), [registrations, selectedEvent])
  const paymentsWorkspace = useMemo(() => buildPaymentsWorkspace(registrations, selectedEvent), [registrations, selectedEvent])
  const readiness = useMemo(
    () => buildEventReadiness(selectedEvent, registrations, operationsEntries),
    [operationsEntries, registrations, selectedEvent],
  )
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(selectedEvent?.eventId), [selectedEvent?.eventId])

  const needsAttention = readiness.actionItems.slice(0, 5)
  const openOperations = operationsEntries.filter((entry) => ['expected', 'pending'].includes(String(entry.status || '').toLowerCase())).length
  const capacityLabel = selectedEvent?.capacity
    ? `${metrics.capacityUsed} / ${selectedEvent.capacity} guests`
    : 'Capacity not set'

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Overview</p>
            <h2 className="mt-2 break-words font-serif text-3xl text-[#2B1723]">
              {getWorkingEventDisplayName(activeEvent)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#816D62]">
              {activeEvent
                ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.location || 'Location not set'} · ${activeEvent.status || 'status not set'}`
                : 'Select a Working Event to see event-scoped numbers and next actions.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/events" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white">
              Change event
            </Link>
            {activeEvent && (
              <button
                type="button"
                id="clear-selected-event"
                onClick={clearActiveEvent}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E1D1C8] bg-white px-4 text-xs font-bold text-[#6B564C]"
              >
                <X className="size-4" />
                Clear selection
              </button>
            )}
          </div>
        </div>
      </section>

      {!activeEvent?.eventId ? (
        <section className="rounded-[24px] border border-dashed border-[#EEDFD6] bg-white p-8 text-center">
          <CalendarDays className="mx-auto mb-3 size-9 text-[#DFC9BC]" />
          <h2 className="font-serif text-2xl text-[#2B1723]">Choose a Working Event</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#816D62]">
            Registrations, tickets, check-in, operations, messages, and reports are scoped to one selected event at a time.
          </p>
          <Link to="/events" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#9A5260] px-5 text-xs font-bold text-white">
            Go to Events
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4" aria-label="Key event numbers">
            <Metric label="Registration records" value={metrics.totalRegistrations} detail="Form entries" />
            <Metric label="Guests" value={metrics.totalPersons} detail="From persons attending" />
            <Metric label="Payments Received" value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)} />
            <Metric label="Capacity used" value={selectedEvent?.capacity ? `${metrics.capacityPercent}%` : 'Not set'} detail={capacityLabel} />
          </section>

          <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6" aria-labelledby="overview-registration-finance-heading">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Registration Finance</p>
                <h2 id="overview-registration-finance-heading" className="mt-2 font-serif text-2xl text-[#2B1723]">Expected, received, and outstanding</h2>
              </div>
              <Link to="/payments" className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#9A5260]">
                Open Payments
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric
                label="Expected Registration Income"
                value={formatCurrency(financeSummary.totalExpected, financeSummary.currency)}
                detail="Explicit registration charges only"
              />
              <Metric
                label="Payments Received"
                value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)}
                detail="Confirmed registration payments"
              />
              <Metric
                label="Outstanding Balance"
                value={formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)}
                detail="Balances still due"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#816D62]">
              These registration totals use explicit ticket price or amount due values only. Operations Ledger money remains separate.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Payment Follow-Up" value={paymentsWorkspace.summary.paymentFollowUpCount} detail="Still unresolved for patron collection" />
              <Metric label="Action Required" value={paymentsWorkspace.summary.actionRequiredCount} detail="Could affect totals or duplicate handling" />
              <Metric label="Internal Cleanup" value={paymentsWorkspace.summary.internalCleanupCount} detail="Resolved records that still need organizer review" />
              <Metric label="Historical Limitations" value={paymentsWorkspace.summary.historicalLimitationCount} detail="Historical metadata gaps kept out of urgent counts" />
              <Metric label="Informational Only" value={paymentsWorkspace.summary.informationalOnlyCount} detail="Visible for audit context only" />
              <Metric label="Paid — Amount Not Recorded" value={paymentsWorkspace.summary.paidAmountNotRecordedCount} detail="Resolved payment without an exact captured amount" />
            </div>
          </section>

          {evidenceAudit && (
            <section className="rounded-[24px] border border-[#D8C5A8] bg-[#FFFCF6] p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6" aria-labelledby="overview-financial-evidence-heading">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7A5818]">Financial Evidence Audit</p>
                  <h2 id="overview-financial-evidence-heading" className="mt-2 font-serif text-2xl text-[#2B1723]">{evidenceAudit.auditStatus}</h2>
                  <p className="mt-2 text-xs leading-5 text-[#715D46]">
                    Documentary evidence is separate from the operational registration totals above.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5818]">
                  Profit {evidenceAudit.finalProfitStatus}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="App Payments Received" value={formatCurrency(evidenceAudit.ticketIncome.appPaymentsReceived, financeSummary.currency)} />
                <Metric label="Directly Verified Audit Receipts" value={formatCurrency(evidenceAudit.ticketIncome.directlyVerifiedAmount, financeSummary.currency)} />
                <Metric label="Amount Inferred" value={formatCurrency(evidenceAudit.ticketIncome.inferredAmount, financeSummary.currency)} />
                <Metric label="Unresolved Difference" value={formatCurrency(evidenceAudit.ticketIncome.documentaryToAppVariance, financeSummary.currency)} />
                <Metric label="Document-Supported Ticket Spaces" value={evidenceAudit.ticketIncome.documentSupportedTickets} />
                <Metric label="Approximate Attendance" value={evidenceAudit.attendance.approximateAttendance} />
                <Metric label="Attendance Evidence Gap" value={evidenceAudit.attendance.attendanceEvidenceGap} />
                <Metric label="Open Corrective Actions" value={evidenceAudit.correctiveActions.length} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#715D46]">
                BBD $4,115 is verified documentary ticket income, not total event revenue. BBD $1,300 remains inferred until bank or 1stPay evidence is matched.
              </p>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Needs Attention</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Priorities for this event</h2>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  readiness.readinessLabel === 'Ready' ? 'bg-[#EAF6EF] text-[#1E7345]' : readiness.readinessLabel === 'Needs attention' ? 'bg-[#FFF1F1] text-[#A32626]' : 'bg-[#FFF7E8] text-[#7A5818]'
                }`}>
                  {readiness.readinessLabel}
                </span>
              </div>

              {needsAttention.length === 0 ? (
                <p className="mt-5 rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
                  No urgent follow-up is detected from the current registration and operations data.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-[#F2E8E1]">
                  {needsAttention.map((item) => (
                    <div key={item.key} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[#816D62]">{item.summary}</p>
                      </div>
                      <Link to={item.to} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#9A5260]">
                        {item.linkLabel}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Quick Actions</p>
              <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Do next</h2>
              <div className="mt-5 grid gap-2">
                {[
                  { to: '/registrations', label: 'Add registration', icon: Users },
                  { to: '/imports', label: 'Import registrations', icon: FileInput },
                  { to: '/payments', label: 'Review payments', icon: CreditCard },
                  { to: '/tickets', label: 'Manage tickets', icon: TicketCheck },
                  { to: '/check-in', label: 'Open check-in', icon: ClipboardCheck },
                  { to: '/operations', label: 'Review Operations', icon: ReceiptText },
                ].map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#EFE2DA] px-4 text-sm font-bold text-[#2B1723] hover:bg-[#FFF8F2]">
                    <Icon className="size-4 text-[#9A5260]" />
                    {label}
                    <ArrowRight className="ml-auto size-4 text-[#B8A49A]" />
                  </Link>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Event Progress</p>
              <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Snapshot</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="mb-2 flex justify-between gap-3 text-xs font-bold text-[#6B564C]">
                    <span>Capacity</span>
                    <span>{capacityLabel}</span>
                  </div>
                  <ProgressBar value={metrics.capacityPercent} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Tickets missing" value={metrics.missingTicketRegistrations} />
                  <Metric label="Open operations" value={openOperations} />
                  <Metric label="Outstanding Balance" value={formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)} />
                  <Metric label="Active finance review" value={paymentsWorkspace.summary.prominentDataReviewCount} />
                </div>
                <p className="text-xs leading-5 text-[#816D62]">
                  Registration payment records and Operations Ledger entries are separate. Use Payments for registration balances and Reports for the read-only event review.
                </p>
                {adminUser && <Link to="/event-review" className="text-xs font-bold text-[#9A5260] hover:underline">Open Reports</Link>}
              </div>
            </article>

            <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Upcoming Events</p>
                  <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Calendar</h2>
                </div>
                {adminUser && <Link to="/events" className="text-xs font-bold text-[#9A5260] hover:underline">View all</Link>}
              </div>
              <div className="mt-5 divide-y divide-[#F2E8E1]">
                {!visibleEventsLoaded ? (
                  <p className="py-4 text-sm text-[#816D62]">Loading events...</p>
                ) : upcoming.length === 0 ? (
                  <p className="py-4 text-sm text-[#816D62]">No upcoming events.</p>
                ) : upcoming.slice(0, 4).map((event) => {
                  const selected = event.eventId === activeEvent.eventId
                  return (
                    <div key={event.eventId} className="flex items-center gap-4 py-3">
                      <CalendarDays className="size-5 shrink-0 text-[#9A5260]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2B1723]">{event.eventName}</p>
                        <p className="mt-0.5 text-xs text-[#816D62]">{formatEventDate(event.eventDate)} · {event.location || 'Location not set'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{formatCountdown(event.eventDate)}</p>
                        {selected ? (
                          <span className="text-[10px] font-bold text-[#2F855A]">Selected</span>
                        ) : (
                          <button type="button" onClick={() => setActiveEvent(event)} className="text-[10px] font-bold text-[#9A5260] hover:underline">
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}
