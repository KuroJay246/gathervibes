import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  MessageSquareText,
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
import { formatEventDate, toDateInput, upcomingEvents } from '../utils/dateUtils'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'
import { buildFinanceSummary, formatCurrency } from '../utils/financeUtils'
import { getWorkingEventDisplayName, hasSelectedWorkingEvent } from '../utils/eventDefaults'
import { isApprovedAdmin } from '../utils/accessRoles'
import { buildEventReadiness } from '../utils/eventReadiness'
import {
  eventStatusLabel,
  formatDaysUntilEvent,
  hydrateEventForPlanning,
  isCompletedEvent,
  isEventDayStatus,
} from '../utils/eventPlanning'
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
    <div className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3">
      <p className="text-xl font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#816D62]">{detail}</p>}
    </div>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function PriorityItem({ item }) {
  return (
    <Link to={item.to} className="block rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
          <p className="mt-2 text-xs leading-5 text-[#816D62]">{item.summary}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
          item.statusLabel === 'Needs attention' ? 'bg-[#FFF1F1] text-[#A32626]' : 'bg-[#FFF4DF] text-[#7A5818]'
        }`}>
          {item.statusLabel}
        </span>
      </div>
      <p className="mt-3 text-xs font-bold text-[#9A5260]">{item.linkLabel}</p>
    </Link>
  )
}

function ActionLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#EFE2DA] px-4 text-sm font-bold text-[#2B1723] hover:bg-[#FFF8F2]">
      <Icon className="size-4 text-[#9A5260]" />
      {label}
    </Link>
  )
}

function TimelineList({ timeline = [] }) {
  const items = Array.isArray(timeline) ? timeline.filter((item) => item?.time || item?.label) : []
  if (items.length === 0) {
    return <p className="rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm text-[#816D62]">No event-day timeline has been added yet.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.timelineId || `${item.time}-${item.label}`} className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
          <p className="text-sm font-bold text-[#2B1723]">{item.time || 'Time not set'}</p>
          <p className="mt-2 text-sm leading-6 text-[#6B564C]">{item.label || 'No description'}</p>
        </div>
      ))}
    </div>
  )
}

const CLOCK_FORMATTER = new Intl.DateTimeFormat('en-BB', {
  hour: 'numeric',
  minute: '2-digit',
})

const PLANNING_ACTIONS = [
  { to: '/registrations', label: 'Add Registration', icon: Users },
  { to: '/payments', label: 'Record Payment', icon: CreditCard },
  { to: '/operations', label: 'Add Expense or Commitment', icon: ReceiptText },
  { to: '/operations', label: 'Add Supplier or Sponsor', icon: ReceiptText },
  { to: '/events', label: 'Add Task', icon: CalendarDays },
  { to: '/communications', label: 'Build Message', icon: MessageSquareText },
  { to: '/event-review', label: 'Review Event Readiness', icon: ClipboardCheck },
]

const EVENT_DAY_ACTIONS = [
  { to: '/tickets', label: 'Ticket Lookup', icon: TicketCheck },
  { to: '/check-in', label: 'Open Check-In', icon: ClipboardCheck },
  { to: '/operations', label: 'Urgent Contacts and Commitments', icon: ReceiptText },
  { to: '/event-review', label: 'Open Reports', icon: CreditCard },
]

const COMPLETED_ACTIONS = [
  { to: '/event-review', label: 'Open Final Report', icon: CheckCircle2 },
  { to: '/operations', label: 'Review Baker Payments', icon: ReceiptText },
  { to: '/events', label: 'Open Event Plan', icon: CalendarDays },
]

function formatClock(value) {
  return CLOCK_FORMATTER.format(value)
}

export function DashboardPage() {
  const { activeEvent, clearActiveEvent, setActiveEvent } = useActiveEvent()
  const { access, assignedEvents = [] } = useAuth()
  const [allEvents, setAllEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())

  const adminUser = isApprovedAdmin(access)
  const visibleEvents = adminUser ? allEvents : assignedEvents
  const visibleEventsLoaded = adminUser ? eventsLoaded : true
  const selectedEvent = activeEvent ? visibleEvents.find((event) => event.eventId === activeEvent.eventId) || activeEvent : null
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

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(new Date()), 60000)
    return () => window.clearInterval(intervalId)
  }, [])

  const upcoming = useMemo(() => upcomingEvents(visibleEvents), [visibleEvents])
  const hydratedEvent = useMemo(() => hydrateEventForPlanning(selectedEvent || {}), [selectedEvent])
  const metrics = useMemo(() => buildRegistrationMetrics(registrations, selectedEvent), [registrations, selectedEvent])
  const financeSummary = useMemo(() => buildFinanceSummary(registrations, selectedEvent), [registrations, selectedEvent])
  const readiness = useMemo(
    () => buildEventReadiness(selectedEvent, registrations, operationsEntries),
    [operationsEntries, registrations, selectedEvent],
  )
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(selectedEvent?.eventId), [selectedEvent?.eventId])
  const completedEvent = isCompletedEvent(hydratedEvent)
  const eventDayMode = isEventDayStatus(hydratedEvent)
  const capacityLabel = hydratedEvent?.capacity
    ? `${metrics.capacityUsed} of ${hydratedEvent.capacity} guests`
    : 'Capacity not set'
  const urgentContacts = hydratedEvent.partnerRecords
    .filter((record) => record.phone || record.email)
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Overview</p>
            <h2 className="mt-2 break-words font-serif text-3xl text-[#2B1723]">{getWorkingEventDisplayName(activeEvent)}</h2>
            <p className="mt-2 text-sm leading-6 text-[#816D62]">
              {activeEvent
                ? `${formatEventDate(activeEvent.eventDate)} · ${hydratedEvent.venueName || hydratedEvent.location || 'Venue not set'} · ${eventStatusLabel(activeEvent.status)}`
                : 'Select a Working Event to see planning progress, event-day actions, and final reporting for that event.'}
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
          <h2 className="font-serif text-2xl text-[#2B1723]">Choose or create an event</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#816D62]">
            Start from Events to create the next gathering, set the Working Event, and open the organizer planning workflow. Every route after that will stay scoped to the selected event.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/events" className="inline-flex min-h-11 items-center rounded-xl bg-[#9A5260] px-5 text-xs font-bold text-white">
              Plan a New Event
            </Link>
            <Link to="/events" className="inline-flex min-h-11 items-center rounded-xl border border-[#E7D6CC] bg-white px-5 text-xs font-bold text-[#5A443B]">
              Open Events
            </Link>
          </div>
        </section>
      ) : completedEvent ? (
        <>
          <Section eyebrow="Completed Event" title="Historical event overview">
            <div className="rounded-2xl border border-[#E9EFFB] bg-[#F6F9FF] p-4 text-sm leading-6 text-[#415F91]">
              This event is completed. Upcoming-event reminders, ticket prompts, and patron payment follow-up are no longer treated as active organizer work.
              {selectedEvent?.eventId === 'zhaPxi31cpqLAW0cuS20' && ' CPB remains a completed historical event. Patron totals stay locked while baker payments can still be managed from Operations.'}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Status" value={eventStatusLabel(selectedEvent.status)} />
              <Metric label="Registration records" value={metrics.totalRegistrations} />
              <Metric label="Guests" value={metrics.totalPersons} />
              <Metric label="Payments received" value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)} />
              <Metric label="Paid event expenses" value={formatCurrency(readiness.planningOverview.operationsSettlement.paidExpenses, financeSummary.currency)} />
              <Metric label="Outstanding commitments" value={formatCurrency(readiness.planningOverview.totalOutstandingCommitments, financeSummary.currency)} />
            </div>
          </Section>

          {evidenceAudit && (
            <Section eyebrow="Historical Reference" title="Financial audit history">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="App payments received" value={formatCurrency(evidenceAudit.ticketIncome.appPaymentsReceived, financeSummary.currency)} />
                <Metric label="Verified ticket income" value={formatCurrency(evidenceAudit.ticketIncome.directlyVerifiedAmount, financeSummary.currency)} />
                <Metric label="Baker paid" value={formatCurrency(evidenceAudit.operations.bakerPaidOrganizerReported, financeSummary.currency)} />
                <Metric label="Baker outstanding" value={formatCurrency(evidenceAudit.operations.bakerOutstandingOrganizerReported, financeSummary.currency)} />
              </div>
            </Section>
          )}

          <Section eyebrow="Closeout" title="Next actions for a completed event">
            <div className="grid gap-3 md:grid-cols-3">
              {COMPLETED_ACTIONS.map((action) => <ActionLink key={action.label} {...action} />)}
            </div>
          </Section>
        </>
      ) : eventDayMode ? (
        <>
          <Section eyebrow="Event Day Mode" title="Run the event from one place">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Current time" value={formatClock(currentTime)} detail="Local device time" />
              <Metric label="Registrations" value={metrics.totalRegistrations} />
              <Metric label="Guests" value={metrics.totalPersons} />
              <Metric label="Checked-in registrations" value={metrics.checkedInRegistrations} />
              <Metric label="Checked-in guests" value={metrics.checkedInPersons} />
              <Metric label="Open event-day tasks" value={readiness.planningOverview.tasks.open} detail={`${readiness.planningOverview.tasks.overdue} overdue`} />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {EVENT_DAY_ACTIONS.map((action) => <ActionLink key={action.label} {...action} />)}
            </div>
          </Section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Section eyebrow="Urgent Contacts" title="Who to call quickly">
              {urgentContacts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm text-[#816D62]">
                  No supplier, sponsor, venue, or helper contacts with phone or email are recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {urgentContacts.map((contact) => (
                    <div key={contact.partnerId} className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                      <p className="text-sm font-bold text-[#2B1723]">{contact.name}</p>
                      <p className="mt-1 text-xs text-[#816D62]">{contact.company || contact.role || contact.recordType}</p>
                      <p className="mt-2 text-sm text-[#6B564C]">{contact.phone || contact.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section eyebrow="Timeline" title="What happens next">
              <TimelineList timeline={hydratedEvent.operationsPlan.timeline} />
            </Section>
          </section>
        </>
      ) : (
        <>
          <Section eyebrow="Event Summary" title="What event am I working on?">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Days remaining" value={formatDaysUntilEvent(selectedEvent.eventDate)} />
              <Metric label="Status" value={eventStatusLabel(selectedEvent.status)} detail={hydratedEvent.registrationRequired ? 'Registration required' : 'Registration optional'} />
              <Metric label="Venue" value={hydratedEvent.venueName || 'Not set'} detail={hydratedEvent.location || 'Location not set'} />
              <Metric label="Capacity" value={hydratedEvent.capacity || 'Not set'} detail={capacityLabel} />
              <Metric label="Tasks completed" value={`${readiness.planningOverview.tasks.completed} / ${readiness.planningOverview.tasks.total || 0}`} detail={`${readiness.planningOverview.tasks.overdue} overdue`} />
              <Metric label="Readiness" value={readiness.planningOverview.readiness.readinessLabel} detail={`${readiness.planningOverview.readiness.needsAttentionCount} item${readiness.planningOverview.readiness.needsAttentionCount === 1 ? '' : 's'} need attention`} />
            </div>
          </Section>

          <section className="grid gap-3 md:grid-cols-4" aria-label="Key event numbers">
            <Metric label="Registration records" value={metrics.totalRegistrations} detail="Form entries" />
            <Metric label="Guests" value={metrics.totalPersons} detail="From persons attending" />
            <Metric label="Payments received" value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)} />
            <Metric label="Capacity used" value={hydratedEvent?.capacity ? `${metrics.capacityPercent}%` : 'Not set'} detail={capacityLabel} />
          </section>

          <Section eyebrow="Financial Snapshot" title="Money received, planned, and still owed">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Projected registration income" value={formatCurrency(readiness.planningOverview.budgets.projectedRegistrationIncome, financeSummary.currency)} />
              <Metric label="Payments received" value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)} />
              <Metric label="Outstanding registration balance" value={formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)} />
              <Metric label="Paid event expenses" value={formatCurrency(readiness.planningOverview.operationsSettlement.paidExpenses, financeSummary.currency)} />
              <Metric label="Outstanding commitments" value={formatCurrency(readiness.planningOverview.totalOutstandingCommitments, financeSummary.currency)} />
              <Metric label="Projected cash position" value={formatCurrency(readiness.planningOverview.projectedCashPosition, financeSummary.currency)} detail="Planning view, not final profit" />
            </div>
          </Section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Section eyebrow="Needs Attention" title="What should I do next?">
              {readiness.actionItems.length === 0 ? (
                <p className="rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
                  No urgent planning blockers are currently visible for this event.
                </p>
              ) : (
                <div className="space-y-3">
                  {readiness.actionItems.slice(0, 6).map((item) => <PriorityItem key={item.key} item={item} />)}
                </div>
              )}
            </Section>

            <Section eyebrow="Quick Actions" title="Common organizer actions">
              <div className="grid gap-2">
              {PLANNING_ACTIONS.map((action) => <ActionLink key={action.label} {...action} />)}
              </div>
            </Section>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Section eyebrow="Planning Progress" title="How prepared is this event?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Completed tasks" value={readiness.planningOverview.tasks.completed} />
                <Metric label="Overdue tasks" value={readiness.planningOverview.tasks.overdue} />
                <Metric label="Upcoming deadlines" value={readiness.planningOverview.tasks.upcoming} />
                <Metric label="Readiness items left" value={readiness.planningOverview.readiness.needsAttentionCount} />
                <Metric label="Supplier and sponsor records" value={readiness.planningOverview.partners.totalRecords} />
                <Metric label="Confirmed sponsor cash" value={formatCurrency(readiness.planningOverview.partners.confirmedCashSponsors, financeSummary.currency)} />
              </div>
            </Section>

            <Section eyebrow="Upcoming Events" title="What else is coming up?">
              <div className="space-y-3">
                {!visibleEventsLoaded ? (
                  <p className="py-4 text-sm text-[#816D62]">Loading events...</p>
                ) : upcoming.length === 0 ? (
                  <p className="py-4 text-sm text-[#816D62]">No upcoming events.</p>
                ) : upcoming.slice(0, 4).map((event) => {
                  const selected = event.eventId === activeEvent.eventId
                  return (
                    <div key={event.eventId} className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] px-4 py-3">
                      <CalendarDays className="size-5 shrink-0 text-[#9A5260]" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2B1723]">{event.eventName}</p>
                        <p className="mt-0.5 text-xs text-[#816D62]">{formatEventDate(event.eventDate)} · {event.venueName || event.location || 'Location not set'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{formatDaysUntilEvent(event.eventDate)}</p>
                        {selected ? (
                          <span className="text-[10px] font-bold text-[#17623A]">Selected</span>
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
            </Section>
          </section>
        </>
      )}
    </div>
  )
}
