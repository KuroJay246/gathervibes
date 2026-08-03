import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, Plus, UserRoundCheck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import {
  ARRIVAL_STATUSES,
  RUN_OF_SHOW_CATEGORIES,
  RUN_OF_SHOW_STATUSES,
  buildRunOfShowSummary,
  buildTimelineState,
  createEmptyRunOfShowItem,
  runOfShowTaskPrefill,
  unresolvedDependencies,
  validateRunOfShowItem,
} from '../utils/runOfShow'
import { buildResourceSummary } from '../utils/eventResources'
import {
  createRunOfShowItem,
  deleteRunOfShowItem,
  subscribeToRunOfShow,
  updateRunOfShowItem,
  updateRunOfShowStatus,
} from '../services/runOfShowService'
import { subscribeToEventResources } from '../services/eventResourceService'

function joinList(values = []) {
  return Array.isArray(values) ? values.join(', ') : ''
}

function splitList(value = '') {
  return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean)
}

function RunOfShowForm({ event, item, onSave, onCancel }) {
  const [values, setValues] = useState(createEmptyRunOfShowItem(item || { date: event?.eventDate || '' }))
  const [error, setError] = useState('')

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function submit(eventSubmit) {
    eventSubmit.preventDefault()
    const errors = validateRunOfShowItem(values)
    if (errors.length) {
      setError(errors.join(' '))
      return
    }
    setError('')
    onSave(values)
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-[#E7D6CC] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-[#2B1723]">{item ? 'Edit timeline item' : 'Add timeline item'}</h2>
          <p className="mt-1 text-sm text-[#6B564C]">Times are operational order only. Overlapping items are allowed for parallel activity.</p>
        </div>
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">Cancel</button>
      </div>
      {error && <p className="mt-3 rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-3 py-2 text-sm font-semibold text-[#8A1F1F]">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Title<input value={values.title} onChange={(e) => updateField('title', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Category<select value={values.category} onChange={(e) => updateField('category', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RUN_OF_SHOW_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Date<input type="date" value={values.date} onChange={(e) => updateField('date', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Start<input type="time" value={values.startTime} onChange={(e) => updateField('startTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">End<input type="time" value={values.endTime} onChange={(e) => updateField('endTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Status<select value={values.status} onChange={(e) => updateField('status', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RUN_OF_SHOW_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Location<input value={values.location} onChange={(e) => updateField('location', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Responsible label<input value={values.responsibleLabel} onChange={(e) => updateField('responsibleLabel', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Responsible contact ID<input value={values.responsibleContactId} onChange={(e) => updateField('responsibleContactId', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Responsible organization ID<input value={values.responsibleOrganizationId} onChange={(e) => updateField('responsibleOrganizationId', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Expected arrival<input type="time" value={values.expectedArrivalTime} onChange={(e) => updateField('expectedArrivalTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Arrival status<select value={values.arrivalStatus} onChange={(e) => updateField('arrivalStatus', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{ARRIVAL_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Depends on item IDs<input value={joinList(values.dependencyItemIds)} onChange={(e) => updateField('dependencyItemIds', splitList(e.target.value))} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Linked resource IDs<input value={joinList(values.linkedResourceIds)} onChange={(e) => updateField('linkedResourceIds', splitList(e.target.value))} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723] md:col-span-2">Notes<textarea value={values.notes} onChange={(e) => updateField('notes', e.target.value)} className="min-h-24 rounded-xl border border-[#E7D6CC] px-3 py-2" /></label>
      </div>
      <button type="submit" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Save timeline item</button>
    </form>
  )
}

export function RunOfShowPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [resources, setResources] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeToRunOfShow(activeEvent?.eventId, setItems, (err) => setError(err.message)), [activeEvent?.eventId])
  useEffect(() => subscribeToEventResources(activeEvent?.eventId, setResources, () => {}), [activeEvent?.eventId])

  if (!activeEvent?.eventId) return <section className="rounded-3xl border border-[#E7D6CC] bg-white p-6"><h2 className="font-serif text-2xl">Select a Working Event</h2><p className="mt-2 text-sm text-[#6B564C]">Run of Show is scoped to one event.</p></section>

  const summary = buildRunOfShowSummary(items)
  const timelineState = buildTimelineState(items)
  const resourceSummary = buildResourceSummary(resources)

  async function save(values) {
    if (editing?.itemId) await updateRunOfShowItem(activeEvent, editing, values, user)
    else await createRunOfShowItem(activeEvent, values, user)
    setEditing(null)
    setShowForm(false)
  }

  function createTask(item) {
    const params = new URLSearchParams(runOfShowTaskPrefill(item))
    navigate(`/tasks?${params.toString()}`)
  }

  return (
    <div data-tour-id="run-of-show-workspace" className="space-y-5">
      {error && <p className="rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-3 py-2 text-sm font-semibold text-[#8A1F1F]">{error}</p>}
      <section className="rounded-[2rem] bg-[#2B1723] p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#EBC8CF]">Event-day timeline</p>
            <h2 className="mt-2 font-serif text-3xl">Run of Show</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">A private operational sequence for what happens now, next, and later. Contact responsibility does not grant app access.</p>
          </div>
          <button type="button" onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#2B1723]"><Plus className="size-4" /> Add item</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[['Total', summary.total], ['Confirmed', summary.confirmed], ['In progress', summary.inProgress], ['Delayed', summary.delayed], ['Resource shortages', resourceSummary.shortages]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/65">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#E7D6CC] bg-white p-5">
          <h3 className="flex items-center gap-2 font-serif text-xl"><Clock3 className="size-5 text-[#8A3F4B]" /> Now</h3>
          <p className="mt-2 text-sm text-[#6B564C]">{timelineState.now ? `${timelineState.now.startTime} ${timelineState.now.title}` : 'No current item by clock time. Use chronological sequence below.'}</p>
        </div>
        <div className="rounded-3xl border border-[#E7D6CC] bg-white p-5">
          <h3 className="flex items-center gap-2 font-serif text-xl"><CheckCircle2 className="size-5 text-[#4F7A57]" /> Next</h3>
          <p className="mt-2 text-sm text-[#6B564C]">{timelineState.next ? `${timelineState.next.startTime} ${timelineState.next.title}` : 'No upcoming item found.'}</p>
        </div>
      </section>

      {showForm && <RunOfShowForm key={editing?.itemId || `new-${activeEvent?.eventId || ''}`} event={activeEvent} item={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <section className="space-y-3">
        {items.length === 0 && <div className="rounded-3xl border border-dashed border-[#D9C7BC] bg-white p-6 text-sm text-[#6B564C]">No Run of Show items yet. Add setup, arrivals, programme, service, closing, and breakdown items when the event plan becomes real.</div>}
        {items.map((item) => {
          const blockers = unresolvedDependencies(item, items)
          return (
            <article key={item.itemId} className="rounded-3xl border border-[#E7D6CC] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F5E6C8] px-3 py-1 text-xs font-bold text-[#5A443B]">{item.startTime}{item.endTime ? `-${item.endTime}` : ''}</span>
                    <span className="rounded-full bg-[#F7DDE6] px-3 py-1 text-xs font-bold text-[#8A3F4B]">{item.status}</span>
                    <span className="rounded-full bg-[#EEF4EA] px-3 py-1 text-xs font-bold text-[#4F7A57]">{item.category}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-[#2B1723]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#6B564C]">{item.location || 'Location not set'} · {item.responsibleLabel || item.responsibleContactId || item.responsibleOrganizationId || 'Responsibility not assigned'}</p>
                  {item.expectedArrivalTime && <p className="mt-2 flex items-center gap-2 text-sm text-[#6B564C]"><UserRoundCheck className="size-4" /> Arrival {item.expectedArrivalTime}: {item.arrivalStatus}</p>}
                  {item.linkedResourceIds.length > 0 && <p className="mt-2 flex items-center gap-2 text-sm text-[#6B564C]"><PackageCheck className="size-4" /> Linked resources: {item.linkedResourceIds.join(', ')}</p>}
                  {blockers.length > 0 && <p className="mt-2 flex items-center gap-2 rounded-xl bg-[#FFF6E8] px-3 py-2 text-sm font-semibold text-[#7A4B16]"><AlertTriangle className="size-4" /> Blocked by {blockers.map((entry) => entry.title).join(', ')}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Confirmed', 'In Progress', 'Completed', 'Delayed'].map((status) => <button key={status} type="button" onClick={() => updateRunOfShowStatus(activeEvent, item, status, user, status === 'Delayed' ? { delayReason: item.delayReason || 'Marked delayed by organizer.' } : {})} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">{status}</button>)}
                  <button type="button" onClick={() => { setEditing(item); setShowForm(true) }} className="min-h-10 rounded-xl bg-[#2B1723] px-3 text-xs font-bold text-white">Edit</button>
                  <button type="button" onClick={() => createTask(item)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create task</button>
                  <button type="button" onClick={() => deleteRunOfShowItem(activeEvent, item, user)} className="min-h-10 rounded-xl border border-[#F3C6C6] px-3 text-xs font-bold text-[#8A1F1F]">Delete</button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
      <div className="rounded-3xl border border-[#E7D6CC] bg-white p-5 text-sm text-[#6B564C]">
        Documents, Contacts, Tasks, Operations, and Resources can be linked by ID without rewriting older related records. <Link to="/resources" className="font-bold text-[#8A3F4B]">Open Resources</Link>
      </div>
    </div>
  )
}
