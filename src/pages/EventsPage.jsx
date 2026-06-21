import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Edit3,
  MapPin,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { DeleteEventDialog } from '../components/events/DeleteEventDialog'
import { EventFormModal } from '../components/events/EventFormModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useActiveEvent } from '../events/useActiveEvent'
import { createEvent, deleteEvent, subscribeToEvents, updateEvent } from '../services/eventService'
import { formatEventDate } from '../utils/dateUtils'

const statusStyles = {
  draft: 'bg-[#F1ECE8] text-[#725F55]',
  upcoming: 'bg-[#FFF2D8] text-[#8A641E]',
  active: 'bg-[#E7F6ED] text-[#2F855A]',
  completed: 'bg-[#E9EFFB] text-[#415F91]',
  cancelled: 'bg-[#FFF0F0] text-[#B53D3D]',
}

const currency = new Intl.NumberFormat('en-BB', {
  style: 'currency',
  currency: 'BBD',
  minimumFractionDigits: 2,
})

function titleCase(value = '') {
  return value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function friendlyFirebaseError(error) {
  if (error?.code === 'permission-denied') {
    return 'Your account is signed in but is not approved by the Firestore admin allowlist.'
  }
  if (error?.code === 'unavailable') return 'Firestore is temporarily unavailable. Check your connection and try again.'
  if (error?.code === 'unauthenticated') return 'Your session has expired. Sign in again to continue.'
  return error?.message || 'Something went wrong. Please try again.'
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${statusStyles[status] || statusStyles.draft}`}>
      {titleCase(status)}
    </span>
  )
}

export function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [formEvent, setFormEvent] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()
  const { activeEvent, setActiveEvent, clearActiveEvent } = useActiveEvent()

  useEffect(() => {
    return subscribeToEvents(
      (nextEvents) => {
        setEvents(nextEvents)
        setLoading(false)
      },
      (error) => {
        setLoadError(friendlyFirebaseError(error))
        setLoading(false)
      },
    )
  }, [reloadKey])

  useEffect(() => {
    if (!loading && activeEvent && !events.some((event) => event.eventId === activeEvent.eventId)) {
      clearActiveEvent()
    }
  }, [activeEvent, clearActiveEvent, events, loading])

  useEffect(() => {
    if (!success) return undefined
    const timeoutId = window.setTimeout(() => setSuccess(''), 4500)
    return () => window.clearTimeout(timeoutId)
  }, [success])

  const totals = useMemo(() => ({
    events: events.length,
    upcoming: events.filter((event) => ['upcoming', 'active'].includes(event.status)).length,
    capacity: events.reduce((total, event) => total + (Number(event.capacity) || 0), 0),
  }), [events])

  function openCreate() {
    setFormEvent(undefined)
    setFormOpen(true)
  }

  function openEdit(event) {
    setFormEvent(event)
    setFormOpen(true)
  }

  async function handleSave(values) {
    try {
      if (formEvent) {
        await updateEvent(formEvent.eventId, values, user)
        if (activeEvent?.eventId === formEvent.eventId) {
          setActiveEvent({ ...formEvent, ...values, eventId: formEvent.eventId })
        }
        setSuccess(`${values.eventName.trim()} was updated.`)
      } else {
        await createEvent(values, user)
        setSuccess(`${values.eventName.trim()} was created.`)
      }
      setFormOpen(false)
      setFormEvent(undefined)
    } catch (error) {
      throw new Error(friendlyFirebaseError(error))
    }
  }

  function requestDelete(event) {
    setDeleteError('')
    setDeleteTarget(event)
  }

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError('')

    try {
      await deleteEvent(deleteTarget, user)
      if (activeEvent?.eventId === deleteTarget.eventId) clearActiveEvent()
      setSuccess(`${deleteTarget.eventName} was deleted.`)
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(friendlyFirebaseError(error))
    } finally {
      setDeleting(false)
    }
  }

  function chooseActiveEvent(event) {
    setActiveEvent(event)
    setSuccess(`${event.eventName} is now the active event.`)
  }

  function retryEvents() {
    setLoading(true)
    setLoadError('')
    setReloadKey((key) => key + 1)
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="fixed right-4 top-4 z-[90] flex max-w-sm items-center gap-3 rounded-2xl border border-[#BEE0CB] bg-white px-4 py-3.5 shadow-[0_18px_50px_rgba(43,23,35,0.16)] sm:right-6" role="status">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E7F6ED] text-[#2F855A]"><Check className="size-4" strokeWidth={2.5} /></span>
          <p className="flex-1 text-xs font-semibold leading-5 text-[#365C45]">{success}</p>
          <button type="button" onClick={() => setSuccess('')} className="rounded-lg p-1 text-[#7A9884] hover:bg-[#E7F6ED]" aria-label="Dismiss success message"><X className="size-4" /></button>
        </div>
      )}

      <section className="flex flex-col gap-5 rounded-[26px] border border-[#EEDFD6] bg-white p-6 shadow-[0_10px_32px_rgba(84,53,67,0.05)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#FCEEF1] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#A85F6B]">
            <Sparkles className="size-3.5" /> Phase 2 live
          </div>
          <h2 className="font-serif text-3xl text-[#2B1723]">Your gatherings</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#806C61]">Create each event once, keep its details current, and select the event your team is working on.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B]">
          <Plus className="size-4" strokeWidth={2.5} /> Create event
        </button>
      </section>

      {!loading && !loadError && events.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Event totals">
          <div className="rounded-2xl border border-[#EEDFD6] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A48A7B]">All events</p><p className="mt-2 font-serif text-3xl">{totals.events}</p></div>
          <div className="rounded-2xl border border-[#EEDFD6] bg-white p-5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A48A7B]">Upcoming / active</p><p className="mt-2 font-serif text-3xl">{totals.upcoming}</p></div>
          <div className="rounded-2xl border border-[#E6D4B4] bg-[#F8E9CB] p-5"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#86662C]">Planned capacity</p><p className="mt-2 font-serif text-3xl text-[#4E3928]">{totals.capacity.toLocaleString('en-BB')}</p></div>
        </section>
      )}

      {loading && <LoadingState message="Gathering your events…" />}
      {!loading && loadError && <ErrorState message={loadError} onRetry={retryEvents} />}
      {!loading && !loadError && events.length === 0 && <EmptyState onCreate={openCreate} />}

      {!loading && !loadError && events.length > 0 && (
        <section className="overflow-hidden rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
          <div className="flex items-center justify-between border-b border-[#EFE2DA] px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-[#3A2630]">Event calendar</h3>
              <p className="mt-1 text-[11px] text-[#8A7468]">{events.length} {events.length === 1 ? 'event' : 'events'} in Firestore</p>
            </div>
            <MoreHorizontal className="size-5 text-[#B49B8D]" />
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#FFF9F5] text-[9px] font-bold uppercase tracking-[0.18em] text-[#927C70]">
                <tr><th className="px-6 py-3.5">Event</th><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Capacity</th><th className="px-4 py-3.5">Price</th><th className="px-6 py-3.5 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-[#F1E6DF]">
                {events.map((event) => {
                  const isActive = activeEvent?.eventId === event.eventId
                  return (
                    <tr key={event.eventId} className={isActive ? 'bg-[#FFF8F2]' : 'hover:bg-[#FFFCFA]'}>
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-[#B76E79] text-white' : 'bg-[#FCEEF1] text-[#B76E79]'}`}><CalendarDays className="size-[17px]" /></span><div><p className="text-sm font-bold text-[#3A2630]">{event.eventName}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#8A7468]"><MapPin className="size-3" />{event.location}</p></div></div></td>
                      <td className="px-4 py-4 text-xs text-[#6D594F]">{formatEventDate(event.eventDate)}</td>
                      <td className="px-4 py-4"><StatusBadge status={event.status} /></td>
                      <td className="px-4 py-4 text-xs font-semibold text-[#6D594F]">{Number(event.capacity).toLocaleString('en-BB')}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-[#6D594F]">{currency.format(Number(event.ticketPrice) || 0)}</td>
                      <td className="px-6 py-4"><div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => chooseActiveEvent(event)} disabled={isActive} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${isActive ? 'bg-[#E7F6ED] text-[#2F855A]' : 'border border-[#E1D1C8] text-[#806C61] hover:bg-[#FFF8F2]'}`}>{isActive ? 'Active event' : 'Set active'}</button>
                        <button type="button" onClick={() => openEdit(event)} className="rounded-lg p-2 text-[#8C766A] hover:bg-[#FCEEF1] hover:text-[#A85F6B]" aria-label={`Edit ${event.eventName}`}><Edit3 className="size-4" /></button>
                        <button type="button" onClick={() => requestDelete(event)} className="rounded-lg p-2 text-[#9A7777] hover:bg-[#FFF0F0] hover:text-[#C53030]" aria-label={`Delete ${event.eventName}`}><Trash2 className="size-4" /></button>
                      </div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#F1E6DF] md:hidden">
            {events.map((event) => {
              const isActive = activeEvent?.eventId === event.eventId
              return (
                <article key={event.eventId} className={`p-5 ${isActive ? 'bg-[#FFF8F2]' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-serif text-lg text-[#35212B]">{event.eventName}</h4>{isActive && <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F6ED] px-2 py-1 text-[8px] font-bold uppercase text-[#2F855A]"><CheckCircle2 className="size-3" /> Active</span>}</div><p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#806C61]"><MapPin className="size-3.5" /> {event.location}</p></div>
                    <StatusBadge status={event.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center"><div><p className="text-[8px] font-bold uppercase tracking-wider text-[#A48A7B]">Date</p><p className="mt-1 text-[10px] font-semibold text-[#59454E]">{formatEventDate(event.eventDate, { year: undefined })}</p></div><div><p className="text-[8px] font-bold uppercase tracking-wider text-[#A48A7B]">Capacity</p><p className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-[#59454E]"><UsersRound className="size-3" /> {event.capacity}</p></div><div><p className="text-[8px] font-bold uppercase tracking-wider text-[#A48A7B]">Price</p><p className="mt-1 text-[10px] font-semibold text-[#59454E]">{currency.format(Number(event.ticketPrice) || 0)}</p></div></div>
                  <div className="mt-4 flex gap-2"><button type="button" onClick={() => chooseActiveEvent(event)} disabled={isActive} className={`flex-1 rounded-lg py-2.5 text-[10px] font-bold ${isActive ? 'bg-[#E7F6ED] text-[#2F855A]' : 'border border-[#E1D1C8] text-[#806C61]'}`}>{isActive ? 'Active event' : 'Set active'}</button><button type="button" onClick={() => openEdit(event)} className="rounded-lg border border-[#E1D1C8] p-2.5 text-[#806C61]" aria-label={`Edit ${event.eventName}`}><Edit3 className="size-4" /></button><button type="button" onClick={() => requestDelete(event)} className="rounded-lg border border-[#F0D3D3] p-2.5 text-[#C53030]" aria-label={`Delete ${event.eventName}`}><Trash2 className="size-4" /></button></div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {formOpen && <EventFormModal event={formEvent} onClose={() => setFormOpen(false)} onSave={handleSave} />}
      {deleteTarget && <DeleteEventDialog event={deleteTarget} deleting={deleting} error={deleteError} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={confirmDelete} />}
    </div>
  )
}
