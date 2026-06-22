import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Flame,
  Gift,
  Info,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToEvents } from '../services/eventService'
import { subscribeToRegistrations } from '../services/registrationService'
import { formatEventDate, formatCountdown, upcomingEvents } from '../utils/dateUtils'

// ── Local clock ──────────────────────────────────────────────────────────────

function useLocalClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ── Countdown ticker ─────────────────────────────────────────────────────────

function CountdownBadge({ eventDate }) {
  const [label, setLabel] = useState(() => formatCountdown(eventDate))
  useEffect(() => {
    const tick = () => setLabel(formatCountdown(eventDate))
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [eventDate])
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FCEEF1] px-2.5 py-1 text-[10px] font-bold text-[#B76E79]">
      <Clock className="size-3" />
      {label}
    </span>
  )
}

// ── Registration metrics ─────────────────────────────────────────────────────

function useRegistrationMetrics(eventId) {
  const [regs, setRegs] = useState([])
  useEffect(() => {
    if (!eventId) {
      const clear = () => setRegs([])
      clear()
      return undefined
    }
    return subscribeToRegistrations(eventId, setRegs, () => {})
  }, [eventId])

  return useMemo(() => {
    const total = regs.length
    const paid = regs.filter((r) => r.paymentStatus === 'paid').length
    const pending = regs.filter((r) => r.paymentStatus === 'pending').length
    const complimentary = regs.filter((r) => r.paymentStatus === 'complimentary').length
    const persons = regs.reduce((sum, r) => sum + (r.personsAttending || 1), 0)
    return { total, paid, pending, complimentary, persons }
  }, [regs])
}

// ── Metric pill ──────────────────────────────────────────────────────────────

function MetricPill({ label, value, color }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2.5 ${color}`}>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { activeEvent, clearActiveEvent, setActiveEvent } = useActiveEvent()
  const now = useLocalClock()
  const metrics = useRegistrationMetrics(activeEvent?.eventId)

  const [allEvents, setAllEvents] = useState([])
  const [eventsLoaded, setEventsLoaded] = useState(false)

  useEffect(() => {
    return subscribeToEvents(
      (events) => { setAllEvents(events); setEventsLoaded(true) },
      () => setEventsLoaded(true),
    )
  }, [])

  const upcoming = useMemo(() => upcomingEvents(allEvents), [allEvents])

  // Capacity progress (for selected event)
  const selectedFull = activeEvent
    ? allEvents.find((e) => e.eventId === activeEvent.eventId)
    : null
  const capacity = selectedFull?.capacity || 0
  const capacityPct = capacity > 0 ? Math.min(100, Math.round((metrics.persons / capacity) * 100)) : 0

  // Price tiers for selected event
  const priceTiers = selectedFull?.priceTiers

  const dateLabel = new Intl.DateTimeFormat('en-BB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now)

  const timeLabel = new Intl.DateTimeFormat('en-BB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  }).format(now)

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#2B1723] px-6 py-8 text-white shadow-[0_18px_50px_rgba(43,23,35,0.15)] sm:px-9 sm:py-10 lg:px-12">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-[#C98291]/20 blur-3xl" />
        <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-[#F5E6C8]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            {/* Live clock */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F5E6C8]/15 bg-[#F5E6C8]/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-[#F5E6C8]">
              <Clock className="size-3.5 shrink-0" />
              <span id="dashboard-date">{dateLabel}</span>
              <span className="opacity-50">·</span>
              <span id="dashboard-time" className="font-mono">{timeLabel}</span>
            </div>

            <h2 className="font-serif text-3xl leading-tight sm:text-4xl lg:text-[42px]">
              {activeEvent ? 'Working on ' : 'The table is set for your'}
              <span className="italic text-[#E9B7C0]"> {activeEvent?.eventName || 'next gathering.'}</span>
            </h2>
            {activeEvent && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
                <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatEventDate(activeEvent.eventDate)}</span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{activeEvent.location}</span>
              </p>
            )}
          </div>

          <Link
            to="/events"
            className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#C57C88]"
          >
            {activeEvent ? 'Manage events' : 'Create an event'}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── Two-column layout ─────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* Selected / Working Event card */}
          <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
            <div className="mb-1 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Working Event</p>
                <h3 className="mt-1.5 font-serif text-2xl text-[#2B1723]">
                  {activeEvent ? activeEvent.eventName : 'No event selected'}
                </h3>
              </div>
              {activeEvent && (
                <button
                  id="clear-selected-event"
                  type="button"
                  onClick={clearActiveEvent}
                  className="shrink-0 rounded-xl border border-[#E1D1C8] p-2 text-[#9B867A] transition hover:bg-[#FFF0F0] hover:text-[#C53030]"
                  aria-label="Clear selected event"
                  title="Clear selected event"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Workspace explanation */}
            <div className="mb-5 flex items-start gap-2 rounded-xl bg-[#FFF8F2] px-3 py-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-[#B76E79]" />
              <p className="text-[11px] leading-5 text-[#8A7468]">
                The <strong>selected event</strong> is only your current workspace focus. It does not change the event status or affect other admins.
                {activeEvent && (
                  <> To change it, <Link to="/events" className="font-bold text-[#B76E79] underline underline-offset-2">select another event</Link> from the Events page.</>
                )}
              </p>
            </div>

            {activeEvent ? (
              <>
                {/* Registration metrics */}
                {metrics.total > 0 && (
                  <div className="mb-5 grid grid-cols-4 gap-2">
                    <MetricPill label="Total" value={metrics.total} color="bg-[#FFF8F2] text-[#4E3A2C]" />
                    <MetricPill label="Paid" value={metrics.paid} color="bg-[#EAF6EF] text-[#2F5C3E]" />
                    <MetricPill label="Pending" value={metrics.pending} color="bg-[#FFFBEA] text-[#7A5700]" />
                    <MetricPill label="Comp" value={metrics.complimentary} color="bg-[#F3EEFF] text-[#5E3D8C]" />
                  </div>
                )}

                {/* Capacity bar */}
                {capacity > 0 && (
                  <div className="mb-5">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[#8A7468]">
                      <span className="font-bold text-[#3A2630]">Capacity</span>
                      <span>{metrics.persons} / {capacity} persons ({capacityPct}%)</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#F2E8E1]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${capacityPct >= 90 ? 'bg-[#C53030]' : capacityPct >= 70 ? 'bg-[#D4890A]' : 'bg-[#B76E79]'}`}
                        style={{ width: `${capacityPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Price tier summary */}
                {Array.isArray(priceTiers) && priceTiers.length > 0 && (
                  <div>
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#B76E79]">Price tiers</p>
                    <div className="flex flex-wrap gap-2">
                      {priceTiers.map((tier, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${tier.status === 'sold-out' ? 'bg-[#FFF4F4] text-[#A32626] line-through' : tier.status === 'hidden' ? 'bg-[#F3F3F3] text-[#888]' : 'bg-[#FFF8F2] text-[#4E3A2C]'}`}
                        >
                          {tier.name === 'Complimentary' ? <Gift className="size-3" /> : null}
                          {tier.name}
                          <span className="opacity-60">·</span>
                          {tier.price === 0 ? 'Free' : `$${tier.price}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {metrics.total === 0 && (
                  <p className="text-xs leading-5 text-[#8A7468]">No registrations yet for this event. <Link to="/registrations" className="font-bold text-[#B76E79]">Add registrations</Link> or <Link to="/imports" className="font-bold text-[#B76E79]">import a CSV</Link>.</p>
                )}
              </>
            ) : (
              <p className="text-xs leading-5 text-[#8A7468]">
                Select an event from the <Link to="/events" className="font-bold text-[#B76E79]">Events page</Link> to see its registrations, capacity, and price tiers here.
              </p>
            )}
          </article>

          {/* Upcoming events */}
          <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">On the calendar</p>
                <h3 className="mt-1.5 font-serif text-2xl text-[#2B1723]">Upcoming events</h3>
              </div>
              <Link to="/events" className="text-xs font-bold text-[#B76E79] hover:underline">View all</Link>
            </div>

            {!eventsLoaded ? (
              <p className="py-4 text-center text-xs text-[#A08578]">Loading…</p>
            ) : upcoming.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] px-5 py-8 text-center">
                <CalendarDays className="mx-auto mb-3 size-8 text-[#DFC9BC]" />
                <p className="text-sm font-bold text-[#3A2630]">No upcoming events</p>
                <p className="mt-1 text-xs text-[#8A7468]">Create an event and set its status to upcoming or active.</p>
                <Link to="/events" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#B76E79] px-4 py-2 text-xs font-bold text-white">
                  Create an event <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[#F5ECE6]">
                {upcoming.slice(0, 5).map((ev) => {
                  const isSelected = activeEvent?.eventId === ev.eventId
                  return (
                    <li key={ev.eventId} className="group flex items-center gap-4 py-3.5">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${isSelected ? 'bg-[#B76E79] text-white' : 'bg-[#FFF0EE] text-[#B76E79]'}`}>
                        <CalendarDays className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#2B1723]">{ev.eventName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#8A7468]">
                          <span>{formatEventDate(ev.eventDate)}</span>
                          {ev.location && <><span className="opacity-40">·</span><span>{ev.location}</span></>}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <CountdownBadge eventDate={ev.eventDate} />
                        {!isSelected && (
                          <button
                            type="button"
                            id={`select-event-${ev.eventId}`}
                            onClick={() => setActiveEvent(ev)}
                            className="text-[10px] font-bold text-[#B76E79] opacity-0 transition group-hover:opacity-100 hover:underline"
                          >
                            Select
                          </button>
                        )}
                        {isSelected && (
                          <span className="text-[10px] font-bold text-[#2F855A]">Selected</span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Foundation status */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1" aria-label="Workspace status">
            {[
              { label: 'Private sign-in', detail: 'Google sign-in with email allowlist', icon: LockKeyhole },
              { label: 'Protected workspace', detail: 'Every route requires approved admin access', icon: ShieldCheck },
              { label: 'Firestore rules', detail: 'Default-deny with strict schema validation', icon: Database },
              { label: 'Mobile-ready PWA', detail: 'Installable on Firebase Hosting', icon: Flame },
            ].map(({ label, detail, icon: Icon }) => (
              <article key={label} className="flex items-center gap-3 rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_12px_rgba(84,53,67,0.04)]">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FCEEF1] text-[#B76E79]">
                  <Icon className="size-[16px]" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#3A2630]">{label}</p>
                  <p className="mt-0.5 truncate text-[11px] leading-4 text-[#8A7468]">{detail}</p>
                </div>
                <CheckCircle2 className="ml-auto size-4 shrink-0 text-[#2F855A]" />
              </article>
            ))}
          </section>

          {/* Quick links */}
          <article className="rounded-[24px] border border-[#E6D4B4] bg-[#F8E9CB] p-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Quick navigation</p>
            <h3 className="mt-1.5 font-serif text-xl text-[#4E3928]">Workspace</h3>
            <ul className="mt-5 space-y-2">
              {[
                { to: '/events', label: 'Events', sub: 'Create and manage events' },
                { to: '/registrations', label: 'Registrations', sub: 'Guest list for selected event' },
                { to: '/imports', label: 'Import CSV', sub: 'Upload or paste a spreadsheet' },
              ].map(({ to, label, sub }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-[#4E3928] transition hover:bg-white/90"
                  >
                    <div>
                      <p className="text-sm font-bold">{label}</p>
                      <p className="mt-0.5 text-[11px] text-[#7A6548]">{sub}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#A08550]" />
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-[#E6D4B4] pt-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Future phases</p>
              <ul className="mt-2 space-y-1">
                {[
                  { label: 'Ticket assignment', phase: 'Phase 4' },
                  { label: 'Door check-in', phase: 'Phase 5' },
                  { label: 'Communications', phase: 'Phase 6' },
                  { label: 'AI writing', phase: 'Phase 7' },
                ].map(({ label, phase }) => (
                  <li key={label} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[11px]">
                    <span className="text-[#7A6548]">{label}</span>
                    <span className="rounded-full bg-[#E6D4B4] px-2 py-0.5 text-[9px] font-bold text-[#86662C]">{phase}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/40 px-3 py-2.5">
              <Users className="mt-0.5 size-3.5 shrink-0 text-[#86662C]" />
              <p className="text-[11px] leading-5 text-[#7A6548]">
                This is a private admin workspace — not a public attendee app, not a native Android or iOS application.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
