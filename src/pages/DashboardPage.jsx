import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileInput,
  FileText,
  MessageSquareText,
  ReceiptText,
  ScrollText,
  TicketCheck,
  Users,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useActiveEvent } from '../events/useActiveEvent'
import { useAuth } from '../auth/useAuth'
import { subscribeToEvents } from '../services/eventService'
import { subscribeToRegistrations } from '../services/registrationService'
import { subscribeToOperationsLedger } from '../services/operationsLedgerService'
import { subscribeToEventResources } from '../services/eventResourceService.js'
import { subscribeToRunOfShow } from '../services/runOfShowService.js'
import { subscribeToTasks } from '../services/taskService.js'
import { formatEventDate, toDateInput, upcomingEvents } from '../utils/dateUtils'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'
import { buildFinanceSummary, formatCurrency } from '../utils/financeUtils'
import { getWorkingEventDisplayName, hasSelectedWorkingEvent } from '../utils/eventDefaults'
import { canViewRoute, isApprovedAdmin } from '../utils/accessRoles'
import { buildEventReadiness } from '../utils/eventReadiness'
import {
  eventStatusLabel,
  formatDaysUntilEvent,
  hydrateEventForPlanning,
  isCompletedEvent,
  isEventDayStatus,
} from '../utils/eventPlanning'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'
import { buildTaskWorkflowSummary } from '../utils/taskWorkflow.js'
import { PageTabs } from '../components/ui/PageTabs'

const HOME_TABS = [
  ['summary', 'Event Summary'],
  ['money', 'Money'],
  ['readiness', 'Readiness'],
  ['upcoming', 'Upcoming'],
]

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

function useEventTasks(eventId) {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setTasks([])
    if (!eventId) return undefined
    return subscribeToTasks(eventId, setTasks, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId])

  return tasks
}

function useRunOfShowItems(eventId) {
  const [items, setItems] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setItems([])
    if (!eventId) return undefined
    return subscribeToRunOfShow(eventId, setItems, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId])

  return items
}

function useEventResources(eventId) {
  const [items, setItems] = useState([])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setItems([])
    if (!eventId) return undefined
    return subscribeToEventResources(eventId, setItems, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [eventId])

  return items
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

function issueExplanationFor(item) {
  const key = item?.key || ''
  const label = item?.label || ''
  const affected = item?.count ?? item?.value ?? item?.total ?? ''
  if (key.includes('run-of-show') || key.includes('timeline') || label.includes('timeline') || label.includes('Run of Show')) {
    return {
      title: item.summary,
      affected,
      happened: 'Schedule items need review before the event-day sequence is dependable.',
      why: 'This can affect the event-day sequence, arrivals, or handoffs.',
      action: 'Review the schedule, confirm the status, and update the delayed item.',
    }
  }
  if (key.includes('resource') || label.includes('Resource')) {
    return {
      title: item.summary,
      affected,
      happened: 'A supply, equipment, service, pickup, return, or quantity record is not fully ready.',
      why: 'The event plan may be missing equipment, supplies, services, or confirmed quantities.',
      action: 'Review the resource record, confirm what is available, and assign the next step.',
    }
  }
  if (key.includes('payment')) {
    return {
      title: item.summary,
      affected,
      happened: 'Some registration payment records still need collection, evidence, or review.',
      why: 'Guest registration money may still need collection, evidence, or a clear organizer review state.',
      action: 'Open Registration Payments and review the affected records.',
    }
  }
  if (key.includes('ticket')) {
    return {
      title: item.summary,
      affected,
      happened: 'One or more expected guests do not have a complete ticket record.',
      why: 'A guest may be paid or expected but still missing a usable ticket code.',
      action: 'Open Tickets and assign or review the ticket records.',
    }
  }
  if (key.includes('data')) {
    return {
      title: item.summary,
      affected,
      happened: 'Some record details are incomplete, repeated, or need organizer confirmation.',
      why: 'Incomplete or repeated contact/payment data can make follow-up and check-in harder.',
      action: 'Open the linked records and correct only the fields you can verify.',
    }
  }
  if (key.includes('operations') || key.includes('partners')) {
    return {
      title: item.summary,
      affected,
      happened: 'An event-level ledger, commitment, partner, or supplier item is still unsettled.',
      why: 'Partner promises, supplier balances, or event-level money may still need review.',
      action: 'Open Operations and check the relevant workspace.',
    }
  }
  return {
    title: item.summary,
    affected,
    happened: 'The event has a planning item that still needs organizer review.',
    why: 'This item may affect planning clarity or the next organizer action.',
    action: 'Open the linked page and review the affected records.',
  }
}

function PriorityItem({ item }) {
  const explanation = issueExplanationFor(item)
  return (
    <Link to={item.to} className="grid gap-3 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 transition hover:border-[#D8B9AF] hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-[#2B1723]">{explanation.title}</p>
          {explanation.affected !== '' && explanation.affected !== undefined && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">
              {explanation.affected} affected
            </span>
          )}
        </div>
        <dl className="mt-3 grid gap-2 text-xs leading-5 text-[#5D4A52] md:grid-cols-3">
          <div>
            <dt className="font-bold text-[#80685B]">What happened</dt>
            <dd>{explanation.happened}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#80685B]">Why it matters</dt>
            <dd>{explanation.why}</dd>
          </div>
          <div>
            <dt className="font-bold text-[#80685B]">What to do next</dt>
            <dd>{explanation.action}</dd>
          </div>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
          item.statusLabel === 'Needs attention' ? 'bg-[#FFF1F1] text-[#A32626]' : 'bg-[#FFF4DF] text-[#7A5818]'
        }`}>
          {item.statusLabel}
        </span>
        <span className="rounded-xl bg-[#2B1723] px-3 py-2 text-xs font-bold text-white">{item.linkLabel}</span>
      </div>
    </Link>
  )
}

function ActionLink({ to, icon: Icon, label, detail }) {
  return (
    <Link to={to} className="flex min-h-12 items-center gap-3 rounded-xl border border-[#EFE2DA] px-4 py-3 text-sm font-bold text-[#2B1723] hover:bg-[#FFF8F2]">
      <Icon className="size-4 shrink-0 text-[#9A5260]" />
      <span>
        <span className="block">{label}</span>
        {detail && <span className="mt-1 block text-xs font-medium leading-5 text-[#80685B]">{detail}</span>}
      </span>
    </Link>
  )
}

function RecommendedStep({ action, reason, feature }) {
  const Icon = action.icon
  return (
    <Link to={action.to} className="flex min-h-14 items-start gap-3 rounded-xl border border-[#EFE2DA] bg-white px-4 py-3 text-sm transition hover:bg-[#FFF8F2]">
      <Icon className="mt-0.5 size-4 shrink-0 text-[#9A5260]" />
      <span className="min-w-0">
        <span className="block font-bold text-[#2B1723]">{action.label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#80685B]">{reason}</span>
        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wider text-[#9A5260]">{feature}</span>
      </span>
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
  { to: '/registrations', label: 'Add Registration', detail: 'Enter or correct a confirmed guest record.', icon: Users },
  { to: '/payments', label: 'Record Payment', detail: 'Update registration payment evidence and balances.', icon: CreditCard },
  { to: '/imports', label: 'Open Import Center', detail: 'Preview CSV, pasted rows, or supported spreadsheets.', icon: FileInput },
  { to: '/operations', label: 'Add Operations Entry', detail: 'Record event expenses, income, reimbursements, or commitments.', icon: ReceiptText },
  { to: '/run-of-show', label: 'Build Run of Show', detail: 'Sequence setup, arrivals, programme steps, and breakdown.', icon: ScrollText },
  { to: '/resources', label: 'Track Resources', detail: 'Manage equipment, supplies, packing, pickup, and returns.', icon: Building2 },
  { to: '/documents', label: 'Add Document', detail: 'Track agreements, receipts, permits, and evidence links.', icon: FileText },
  { to: '/contacts', label: 'Open Contacts', detail: 'Find reusable suppliers, partners, venues, and helpers.', icon: Building2 },
  { to: '/tickets', label: 'View Tickets', detail: 'Prepare ticket codes and QR access.', icon: TicketCheck },
  { to: '/check-in', label: 'Open Check-In', detail: 'Use event-day attendance tools.', icon: ClipboardCheck },
  { to: '/event-review', label: 'View Reports', detail: 'Review read-only event follow-up and summaries.', icon: ClipboardCheck },
  { to: '/events', label: 'Edit Event', detail: 'Update event setup, date, venue, capacity, or status.', icon: CalendarDays },
  { to: '/tasks', label: 'Review Tasks', detail: 'Open deadlines, waiting items, and blockers.', icon: Clock3 },
  { to: '/communications', label: 'Build Message', detail: 'Create and copy manual event messages.', icon: MessageSquareText },
]

const EVENT_DAY_ACTIONS = [
  { to: '/tickets', label: 'Ticket Lookup', icon: TicketCheck },
  { to: '/check-in', label: 'Open Check-In', icon: ClipboardCheck },
  { to: '/run-of-show', label: 'Run of Show', icon: ScrollText },
  { to: '/resources', label: 'Resources', icon: Building2 },
  { to: '/operations', label: 'Urgent Contacts and Commitments', icon: ReceiptText },
  { to: '/event-review', label: 'Open Reports', icon: CreditCard },
]

const COMPLETED_ACTIONS = [
  { to: '/event-review', label: 'Open Final Report', icon: CheckCircle2 },
  { to: '/operations', label: 'Review Supplier Payments', icon: ReceiptText },
  { to: '/events', label: 'Open Event Plan', icon: CalendarDays },
]

function formatClock(value) {
  return CLOCK_FORMATTER.format(value)
}

function dateFromTimestamp(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildRecentActivity({ event, registrations = [], operationsEntries = [] }) {
  const activity = []

  if (event?.updatedAt || event?.createdAt) {
    activity.push({
      key: 'event-updated',
      label: event.eventName || 'Event',
      action: 'Event details updated',
      actor: 'Organizer workspace',
      source: 'Events',
      date: dateFromTimestamp(event.updatedAt || event.createdAt),
      to: '/events',
    })
  }

  registrations.slice(0, 6).forEach((registration) => {
    const date = dateFromTimestamp(registration.updatedAt || registration.createdAt || registration.timestamp)
    if (!date) return
    activity.push({
      key: `registration-${registration.registrationId || registration.id || date.getTime()}`,
      label: registration.fullName || registration.buyerName || 'Registration',
      action: registration.ticketCode ? 'Registration and ticket record updated' : 'Registration record updated',
      actor: registration.updatedByName || registration.updatedBy || registration.createdByName || 'Organizer',
      source: 'Guests & Registrations',
      date,
      to: '/registrations',
    })
  })

  operationsEntries.slice(0, 6).forEach((entry) => {
    const date = dateFromTimestamp(entry.updatedAt || entry.createdAt)
    if (!date) return
    activity.push({
      key: `operations-${entry.entryId || entry.id || date.getTime()}`,
      label: entry.label || 'Operations ledger entry',
      action: 'Operations entry updated',
      actor: entry.updatedByName || entry.updatedBy || entry.createdByName || 'Organizer',
      source: 'Operations',
      date,
      to: '/operations',
    })
  })

  return activity
    .filter((item) => item.date)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 5)
}

export function DashboardPage() {
  const { activeEvent, clearActiveEvent, setActiveEvent } = useActiveEvent()
  const { access, assignedEvents = [] } = useAuth()
  const [allEvents, setAllEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [searchParams, setSearchParams] = useSearchParams()

  const adminUser = isApprovedAdmin(access)
  const visibleEvents = adminUser ? allEvents : assignedEvents
  const visibleEventsLoaded = adminUser ? eventsLoaded : true
  const selectedEvent = activeEvent ? visibleEvents.find((event) => event.eventId === activeEvent.eventId) || activeEvent : null
  const registrations = useEventRegistrations(activeEvent?.eventId)
  const operationsEntries = useEventOperations(activeEvent?.eventId)
  const tasks = useEventTasks(activeEvent?.eventId)
  const runOfShowItems = useRunOfShowItems(activeEvent?.eventId)
  const resources = useEventResources(activeEvent?.eventId)

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
    () => buildEventReadiness(selectedEvent, registrations, operationsEntries, runOfShowItems, resources),
    [operationsEntries, registrations, resources, runOfShowItems, selectedEvent],
  )
  const taskSummary = useMemo(() => buildTaskWorkflowSummary(tasks), [tasks])
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(selectedEvent?.eventId), [selectedEvent?.eventId])
  const completedEvent = isCompletedEvent(hydratedEvent)
  const eventDayMode = isEventDayStatus(hydratedEvent)
  const capacityLabel = hydratedEvent?.capacity
    ? `${metrics.capacityUsed} of ${hydratedEvent.capacity} guests`
    : 'Capacity not set'
  const urgentContacts = hydratedEvent.partnerRecords
    .filter((record) => record.phone || record.email)
    .slice(0, 4)
  const quickActions = useMemo(
    () => PLANNING_ACTIONS.filter((action) => canViewRoute(access, action.to)),
    [access],
  )
  const recommendedSteps = useMemo(() => {
    const byDestination = new Map(quickActions.map((action) => [action.to, action]))
    const issueSteps = readiness.actionItems
      .map((item) => {
        const action = byDestination.get(item.to)
        if (!action) return null
        const explanation = issueExplanationFor(item)
        return {
          key: item.key || action.to,
          action,
          reason: explanation.action,
          feature: action.detail || item.linkLabel || 'Current event',
        }
      })
      .filter(Boolean)
    const seen = new Set()
    const uniqueIssueSteps = issueSteps.filter((step) => {
      if (seen.has(step.action.to)) return false
      seen.add(step.action.to)
      return true
    })
    if (uniqueIssueSteps.length >= 3) return uniqueIssueSteps.slice(0, 3)
    const fallbacks = quickActions
      .filter((action) => !seen.has(action.to))
      .slice(0, 3 - uniqueIssueSteps.length)
      .map((action) => ({
        key: `fallback-${action.to}`,
        action,
        reason: action.detail || 'Useful for the selected Working Event.',
        feature: 'Organizer utility',
      }))
    return [...uniqueIssueSteps, ...fallbacks]
  }, [quickActions, readiness.actionItems])
  const recentActivity = useMemo(
    () => buildRecentActivity({ event: selectedEvent, registrations, operationsEntries }),
    [operationsEntries, registrations, selectedEvent],
  )
  const requestedTab = searchParams.get('tab') || 'summary'
  const activeHomeTab = HOME_TABS.some(([id]) => id === requestedTab) ? requestedTab : 'summary'
  function setHomeTab(tab) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('tab', tab)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <section data-route="dashboard" data-tour-id="overview-summary" className="rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Home</p>
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
              This event is completed. Upcoming-event reminders, ticket prompts, and guest payment follow-up are no longer treated as active organizer work.
              Completed status does not make an event read-only; approved organizers can still make audited corrections through the normal event workflows.
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Metric label="Status" value={eventStatusLabel(selectedEvent.status)} />
              <Metric label="Registration records" value={metrics.totalRegistrations} />
              <Metric label="Guests" value={metrics.totalPersons} />
              <Metric
                label="Payments received"
                value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)}
                detail={`Projected registration income ${formatCurrency(
                  readiness.planningOverview.budgets.projectedRegistrationIncome,
                  financeSummary.currency,
                )} · Outstanding registration balance ${formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)}`}
              />
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
              <Metric label="Open event-day tasks" value={taskSummary.open} detail={`${taskSummary.overdue} overdue`} />
              <Metric label="Run of Show items" value={readiness.runOfShowSummary.total} detail={`${readiness.runOfShowSummary.delayed} delayed`} />
              <Metric label="Resources" value={readiness.resourceSummary.total} detail={`${readiness.resourceSummary.shortages} shortage`} />
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
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div data-tour-id="event-readiness-summary">
            <Section eyebrow="Needs Attention" title="Planning issues to review">
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
            </div>

            <Section eyebrow="Next Steps" title="Recommended now">
              <div className="grid gap-2">
                {recommendedSteps.map((step) => (
                  <RecommendedStep key={step.key} action={step.action} reason={step.reason} feature={step.feature} />
                ))}
              </div>
            </Section>
          </section>

          <section className="phase23v-metric-grid" aria-label="Key event numbers">
            <Metric label="Registration records" value={metrics.totalRegistrations} detail="Form entries" />
            <Metric label="Guests" value={metrics.totalPersons} detail="From persons attending" />
            <Metric
              label="Payments received"
              value={formatCurrency(financeSummary.totalCollected, financeSummary.currency)}
              detail="Registration payments only"
            />
            <Metric label="Payments outstanding" value={formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)} detail="Registration balances only" />
            <Metric label="Capacity used" value={hydratedEvent?.capacity ? `${metrics.capacityPercent}%` : 'Not set'} detail={capacityLabel} />
            <Metric label="Tickets issued" value={registrations.filter((registration) => registration.ticketCode).length} detail="Ticket-code records" />
            <Metric label="Check-Ins" value={metrics.checkedInRegistrations} detail={`${metrics.checkedInPersons} guests checked in`} />
            <Metric label="Run of Show" value={readiness.runOfShowSummary.total} detail={`${readiness.runOfShowSummary.delayed} delayed`} />
            <Metric label="Resources" value={readiness.resourceSummary.total} detail={`${readiness.resourceSummary.shortages} shortage`} />
            <Metric label="Operations expenses recorded" value={formatCurrency(readiness.planningOverview.operationsSettlement.paidExpenses, financeSummary.currency)} detail="Event-level ledger only" />
            <Metric label="Outstanding commitments" value={formatCurrency(readiness.planningOverview.totalOutstandingCommitments, financeSummary.currency)} detail="Operations commitments only" />
          </section>

          <Section eyebrow="Latest Changes" title="Latest changes to this event">
            {recentActivity.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm text-[#816D62]">
                No recent event, registration, or Operations updates are available yet. Activity appears here after existing event-scoped records are created or corrected.
              </p>
            ) : (
              <div className="grid gap-2">
                {recentActivity.map((activity) => (
                  <Link key={activity.key} to={activity.to} className="grid gap-3 rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-3 hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <span className="min-w-0">
                      <span className="gsv-status-pill gsv-status-pill-info">{activity.source}</span>
                      <span className="mt-2 block text-sm font-bold text-[#2B1723]">{activity.action}</span>
                      <span className="mt-1 block truncate text-xs text-[#5D4A52]">{activity.label}</span>
                    </span>
                    <span className="text-xs leading-5 text-[#80685B] sm:text-right">
                      <span className="block font-semibold">{activity.actor}</span>
                      <span>{formatEventDate(activity.date, { hour: 'numeric', minute: '2-digit' })}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <section data-tour-id="home-workspace-tabs" className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Event workspace</p>
                <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">Event Summary, Money, Readiness, and Upcoming</h2>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-[#816D62]">Use these categories for context. Use the linked pages when you need to change records.</p>
              </div>
              <PageTabs tabs={HOME_TABS.map(([id, label]) => ({ id, label }))} active={activeHomeTab} onChange={setHomeTab} label="Home workspace categories" idPrefix="home" />
            </div>

            {activeHomeTab === 'summary' && (
              <section id="home-summary-panel" role="tabpanel" aria-labelledby="home-summary-tab" tabIndex="0" className="mt-5" aria-label="Event Summary details">
                <div className="mt-3 phase23v-metric-grid">
                  <Metric label="Days remaining" value={formatDaysUntilEvent(selectedEvent.eventDate)} />
                  <Metric label="Status" value={eventStatusLabel(selectedEvent.status)} detail={hydratedEvent.registrationRequired ? 'Registration required' : 'Registration optional'} />
                  <Metric label="Venue" value={hydratedEvent.venueName || 'Not set'} detail={hydratedEvent.location || 'Location not set'} />
                  <Metric label="Capacity" value={hydratedEvent.capacity || 'Not set'} detail={capacityLabel} />
                </div>
              </section>
            )}

            {activeHomeTab === 'money' && (
              <section id="home-money-panel" role="tabpanel" aria-labelledby="home-money-tab" tabIndex="0" className="mt-5" aria-label="Financial snapshot">
                <p className="text-sm leading-6 text-[#816D62]">Registration Payments and Operations stay separate. These numbers help you decide where to review next; they are not final event profit.</p>
                <div className="mt-3 phase23v-metric-grid">
                  <Metric label="Projected registration income" value={formatCurrency(readiness.planningOverview.budgets.projectedRegistrationIncome, financeSummary.currency)} />
                  <Metric label="Outstanding registration balance" value={formatCurrency(financeSummary.totalOutstanding, financeSummary.currency)} />
                  <Metric label="Paid event expenses" value={formatCurrency(readiness.planningOverview.operationsSettlement.paidExpenses, financeSummary.currency)} />
                  <Metric label="Outstanding commitments" value={formatCurrency(readiness.planningOverview.totalOutstandingCommitments, financeSummary.currency)} detail="Operations commitments remain separate from registration payments." />
                </div>
              </section>
            )}

            {activeHomeTab === 'readiness' && (
              <section id="home-readiness-panel" role="tabpanel" aria-labelledby="home-readiness-tab" tabIndex="0" className="mt-5">
                <p className="text-sm leading-6 text-[#816D62]">Readiness is based on visible tasks, event setup, resources, run-of-show, registrations, and commitments.</p>
                <div className="phase23v-metric-grid">
                  <Metric label="Completed tasks" value={taskSummary.completed} />
                  <Metric label="Overdue tasks" value={taskSummary.overdue} />
                  <Metric label="Upcoming deadlines" value={taskSummary.dueSoon + taskSummary.dueToday} />
                  <Metric label="Waiting or blocked" value={taskSummary.waiting + taskSummary.blocked} />
                  <Metric label="Readiness items left" value={readiness.planningOverview.readiness.needsAttentionCount} />
                  <Metric label="Supplier and sponsor records" value={readiness.planningOverview.partners.totalRecords} />
                  <Metric label="Confirmed sponsor cash" value={formatCurrency(readiness.planningOverview.partners.confirmedCashSponsors, financeSummary.currency)} />
                </div>
              </section>
            )}

            {activeHomeTab === 'upcoming' && (
              <section id="home-upcoming-panel" role="tabpanel" aria-labelledby="home-upcoming-tab" tabIndex="0" className="mt-5">
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
              </section>
            )}
          </section>
        </>
      )}
    </div>
  )
}
