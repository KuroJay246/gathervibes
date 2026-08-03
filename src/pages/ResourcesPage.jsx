import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertTriangle, ClipboardList, PackageCheck, Plus, Truck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import {
  RESOURCE_CATEGORIES,
  RESOURCE_SOURCE_TYPES,
  RESOURCE_STATUSES,
  buildResourceSummary,
  createEmptyResource,
  resourceTaskPrefill,
  validateEventResource,
} from '../utils/eventResources'
import {
  createEventResource,
  deleteEventResource,
  subscribeToEventResources,
  updateEventResource,
  updateEventResourceStatus,
} from '../services/eventResourceService'
import { subscribeToRunOfShow } from '../services/runOfShowService'

function joinList(values = []) {
  return Array.isArray(values) ? values.join(', ') : ''
}

function splitList(value = '') {
  return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean)
}

function ResourceForm({ resource, onSave, onCancel }) {
  const [values, setValues] = useState(createEmptyResource(resource))
  const [error, setError] = useState('')

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function submit(eventSubmit) {
    eventSubmit.preventDefault()
    const errors = validateEventResource(values)
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
          <h2 className="font-serif text-xl text-[#2B1723]">{resource ? 'Edit resource' : 'Add resource'}</h2>
          <p className="mt-1 text-sm text-[#6B564C]">Track equipment, supplies, packing, pickup, return, and supplier responsibility without changing financial totals.</p>
        </div>
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C]">Cancel</button>
      </div>
      {error && <p className="mt-3 rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-3 py-2 text-sm font-semibold text-[#8A1F1F]">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Name<input value={values.name} onChange={(e) => updateField('name', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Category<select value={values.category} onChange={(e) => updateField('category', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Source<select value={values.sourceType} onChange={(e) => updateField('sourceType', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_SOURCE_TYPES.map((sourceType) => <option key={sourceType}>{sourceType}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Status<select value={values.status} onChange={(e) => updateField('status', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Needed<input type="number" min="0" value={values.quantityNeeded} onChange={(e) => updateField('quantityNeeded', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Confirmed<input type="number" min="0" value={values.quantityConfirmed} onChange={(e) => updateField('quantityConfirmed', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Unit<input value={values.unit} onChange={(e) => updateField('unit', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Location<input value={values.location} onChange={(e) => updateField('location', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Supplier label<input value={values.supplierLabel} onChange={(e) => updateField('supplierLabel', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Supplier contact ID<input value={values.supplierContactId} onChange={(e) => updateField('supplierContactId', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Supplier organization ID<input value={values.supplierOrganizationId} onChange={(e) => updateField('supplierOrganizationId', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Pickup due<input type="date" value={values.pickupDueDate} onChange={(e) => updateField('pickupDueDate', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Return due<input type="date" value={values.returnDueDate} onChange={(e) => updateField('returnDueDate', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Linked Run of Show IDs<input value={joinList(values.linkedRunOfShowItemIds)} onChange={(e) => updateField('linkedRunOfShowItemIds', splitList(e.target.value))} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Linked document IDs<input value={joinList(values.linkedDocumentIds)} onChange={(e) => updateField('linkedDocumentIds', splitList(e.target.value))} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.packingRequired} onChange={(e) => updateField('packingRequired', e.target.checked)} /> Packing required</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.pickupRequired} onChange={(e) => updateField('pickupRequired', e.target.checked)} /> Pickup required</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.returnRequired} onChange={(e) => updateField('returnRequired', e.target.checked)} /> Return required</label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723] md:col-span-2">Notes<textarea value={values.notes} onChange={(e) => updateField('notes', e.target.value)} className="min-h-24 rounded-xl border border-[#E7D6CC] px-3 py-2" /></label>
      </div>
      <button type="submit" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Save resource</button>
    </form>
  )
}

export function ResourcesPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const navigate = useNavigate()
  const [resources, setResources] = useState([])
  const [runItems, setRunItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeToEventResources(activeEvent?.eventId, setResources, (err) => setError(err.message)), [activeEvent?.eventId])
  useEffect(() => subscribeToRunOfShow(activeEvent?.eventId, setRunItems, () => {}), [activeEvent?.eventId])

  if (!activeEvent?.eventId) return <section className="rounded-3xl border border-[#E7D6CC] bg-white p-6"><h2 className="font-serif text-2xl">Select a Working Event</h2><p className="mt-2 text-sm text-[#6B564C]">Resources are scoped to one event.</p></section>

  const summary = buildResourceSummary(resources)
  const runItemNames = new Map(runItems.map((item) => [item.itemId, item.title]))

  async function save(values) {
    if (editing?.resourceId) await updateEventResource(activeEvent, editing, values, user)
    else await createEventResource(activeEvent, values, user)
    setEditing(null)
    setShowForm(false)
  }

  function createTask(resource) {
    const params = new URLSearchParams(resourceTaskPrefill(resource))
    navigate(`/tasks?${params.toString()}`)
  }

  return (
    <div data-tour-id="resources-workspace" className="space-y-5">
      {error && <p className="rounded-xl border border-[#F3C6C6] bg-[#FFF1F1] px-3 py-2 text-sm font-semibold text-[#8A1F1F]">{error}</p>}
      <section className="rounded-[2rem] bg-[#FFF8F2] p-5 shadow-sm ring-1 ring-[#E7D6CC] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8A3F4B]">Equipment, supplies, and event resources</p>
            <h2 className="mt-2 font-serif text-3xl text-[#2B1723]">Resources</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#6B564C]">Track what must be confirmed, packed, brought on site, collected, and returned. This does not change Operations or registration payment calculations.</p>
          </div>
          <button type="button" onClick={() => { setEditing(null); setShowForm(true) }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white"><Plus className="size-4" /> Add resource</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[['Total', summary.total], ['Confirmed', summary.confirmed], ['Shortages', summary.shortages], ['Packed', summary.packed], ['On site', summary.onSite], ['Return overdue', summary.returnOverdue]].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4"><p className="text-xs text-[#6B564C]">{label}</p><p className="mt-1 text-2xl font-bold text-[#2B1723]">{value}</p></div>
          ))}
        </div>
      </section>

      {showForm && <ResourceForm key={editing?.resourceId || `new-${activeEvent?.eventId || ''}`} resource={editing} onSave={save} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <section className="grid gap-3">
        {resources.length === 0 && <div className="rounded-3xl border border-dashed border-[#D9C7BC] bg-white p-6 text-sm text-[#6B564C]">No resources yet. Add equipment, supplies, documents/print, safety, packing, pickup, or return needs when the plan becomes real.</div>}
        {resources.map((resource) => (
          <article key={resource.resourceId} className="rounded-3xl border border-[#E7D6CC] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F5E6C8] px-3 py-1 text-xs font-bold text-[#5A443B]">{resource.category}</span>
                  <span className="rounded-full bg-[#F7DDE6] px-3 py-1 text-xs font-bold text-[#8A3F4B]">{resource.status}</span>
                  <span className="rounded-full bg-[#EEF4EA] px-3 py-1 text-xs font-bold text-[#4F7A57]">{resource.sourceType}</span>
                </div>
                <h3 className="mt-3 text-lg font-bold text-[#2B1723]">{resource.name}</h3>
                <p className="mt-1 text-sm text-[#6B564C]">{resource.quantityConfirmed} of {resource.quantityNeeded} {resource.unit || 'needed'} confirmed · {resource.location || 'Location not set'}</p>
                {resource.shortage > 0 && <p className="mt-2 flex items-center gap-2 rounded-xl bg-[#FFF6E8] px-3 py-2 text-sm font-semibold text-[#7A4B16]"><AlertTriangle className="size-4" /> Short by {resource.shortage}</p>}
                <p className="mt-2 flex items-center gap-2 text-sm text-[#6B564C]"><Truck className="size-4" /> {resource.supplierLabel || resource.supplierContactId || resource.supplierOrganizationId || 'Supplier not set'}</p>
                {resource.linkedRunOfShowItemIds.length > 0 && <p className="mt-2 flex items-center gap-2 text-sm text-[#6B564C]"><ClipboardList className="size-4" /> Run of Show: {resource.linkedRunOfShowItemIds.map((id) => runItemNames.get(id) || id).join(', ')}</p>}
                {(resource.packingRequired || resource.pickupRequired || resource.returnRequired) && <p className="mt-2 flex items-center gap-2 text-sm text-[#6B564C]"><PackageCheck className="size-4" /> {resource.packingRequired ? 'Pack. ' : ''}{resource.pickupRequired ? `Pickup ${resource.pickupDueDate || 'due date not set'}. ` : ''}{resource.returnRequired ? `Return ${resource.returnDueDate || 'due date not set'}.` : ''}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {['Confirmed', 'Received', 'Packed', 'On Site', 'Returned'].map((status) => <button key={status} type="button" onClick={() => updateEventResourceStatus(activeEvent, resource, status, user)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">{status}</button>)}
                <button type="button" onClick={() => { setEditing(resource); setShowForm(true) }} className="min-h-10 rounded-xl bg-[#2B1723] px-3 text-xs font-bold text-white">Edit</button>
                <button type="button" onClick={() => createTask(resource)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create task</button>
                <button type="button" onClick={() => deleteEventResource(activeEvent, resource, user)} className="min-h-10 rounded-xl border border-[#F3C6C6] px-3 text-xs font-bold text-[#8A1F1F]">Delete</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
