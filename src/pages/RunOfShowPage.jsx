import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { collection, onSnapshot } from 'firebase/firestore'
import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, Plus } from 'lucide-react'
import { ErrorState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { db } from '../lib/firebase'
import { RelationshipSelector } from '../components/RelationshipSelector'
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
import { subscribeToContacts, subscribeToOrganizations } from '../services/contactService'
import { subscribeToDocuments } from '../services/documentService'
import { subscribeToTasks } from '../services/taskService'

function option(id, label, detail = '') {
  return { id, label: detail ? `${label} - ${detail}` : label }
}

function staffOptions(profiles = []) {
  return profiles.map((profile) => option(profile.uid, profile.displayName || profile.email || profile.uid, profile.defaultRole || 'Staff'))
}

function contactOptions(contacts = []) {
  return contacts.map((contact) => option(contact.contactId, contact.displayName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.contactId, contact.category || contact.roleTitle || 'Contact'))
}

function organizationOptions(organizations = []) {
  return organizations.map((organization) => option(organization.organizationId, organization.name || organization.organizationId, organization.category || 'Organization'))
}

function documentOptions(documents = []) {
  return documents.map((documentRecord) => option(documentRecord.documentId, documentRecord.title || documentRecord.documentId, documentRecord.category || documentRecord.status || 'Document'))
}

function taskOptions(tasks = []) {
  return tasks.map((task) => option(task.taskId, task.title || task.taskId, task.status || 'Task'))
}

function resourceOptions(resources = []) {
  return resources.map((resource) => option(resource.resourceId, resource.name || resource.resourceId, resource.status || 'Resource'))
}

function runItemOptions(items = [], currentItemId = '') {
  return items.filter((entry) => entry.itemId !== currentItemId).map((entry) => option(entry.itemId, `${entry.startTime} ${entry.title}`, entry.status))
}

function TimelineList({ title, items, emptyText }) {
  return (
    <div className="rounded-3xl border border-[#E7D6CC] bg-white p-5">
      <h3 className="font-serif text-xl text-[#2B1723]">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.length === 0 && <p className="text-sm text-[#6B564C]">{emptyText}</p>}
        {items.map((item) => (
          <div key={item.itemId} className="flex items-center justify-between gap-3 rounded-2xl bg-[#FFF8F2] px-3 py-2 text-sm">
            <span className="min-w-0 truncate font-semibold text-[#2B1723]">{item.startTime} {item.title}</span>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-[#6B564C]">{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RunOfShowForm({ event, item, resources, items, contacts, organizations, documents, tasks, staffProfiles, onSave, onCancel }) {
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
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">What happens and when</p>
          <p className="mt-1 text-xs text-[#80685B]">Required: title, date, and time. Status is changed manually by the organizer or event-day team.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Title<input value={values.title} onChange={(e) => updateField('title', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Category<select value={values.category} onChange={(e) => updateField('category', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RUN_OF_SHOW_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Date<input type="date" value={values.date} onChange={(e) => updateField('date', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Start<input type="time" value={values.startTime} onChange={(e) => updateField('startTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">End<input type="time" value={values.endTime} onChange={(e) => updateField('endTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Status<select value={values.status} onChange={(e) => updateField('status', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RUN_OF_SHOW_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Location<input value={values.location} onChange={(e) => updateField('location', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Who is responsible?</p>
          <p className="mt-1 text-xs text-[#80685B]">Choose a staff profile, contact, organization, or type a plain-language label. Assigning a contact does not give app access.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Responsible label<input value={values.responsibleLabel} onChange={(e) => updateField('responsibleLabel', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <RelationshipSelector label="Responsible staff" value={values.responsibleStaffUid} onChange={(next) => updateField('responsibleStaffUid', next)} options={staffOptions(staffProfiles)} placeholder="Select staff profile" emptyText="No staff profiles available." />
        <RelationshipSelector label="Responsible contact" value={values.responsibleContactId} onChange={(next) => updateField('responsibleContactId', next)} options={contactOptions(contacts)} placeholder="Select contact" emptyText="No contacts available." />
        <RelationshipSelector label="Responsible organization" value={values.responsibleOrganizationId} onChange={(next) => updateField('responsibleOrganizationId', next)} options={organizationOptions(organizations)} placeholder="Select organization" emptyText="No organizations available." />
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Arrival and follow-up</p>
          <p className="mt-1 text-xs text-[#80685B]">Use arrival fields for suppliers, staff, or items that must arrive before this timeline item can happen.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Expected arrival<input type="time" value={values.expectedArrivalTime} onChange={(e) => updateField('expectedArrivalTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Actual arrival<input type="time" value={values.actualArrivalTime} onChange={(e) => updateField('actualArrivalTime', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Arrival status<select value={values.arrivalStatus} onChange={(e) => updateField('arrivalStatus', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{ARRIVAL_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Linked records</p>
          <p className="mt-1 text-xs text-[#80685B]">Links help you jump to related work. Linking a Task, Resource, or Document does not complete it or change its status.</p>
        </div>
        <RelationshipSelector label="Depends on timeline items" values={values.dependencyItemIds} onChange={(next) => updateField('dependencyItemIds', next)} multiple options={runItemOptions(items, item?.itemId)} placeholder="Add dependency" emptyText="No other timeline items available." />
        <RelationshipSelector label="Linked resources" values={values.linkedResourceIds} onChange={(next) => updateField('linkedResourceIds', next)} multiple options={resourceOptions(resources)} placeholder="Add resource link" emptyText="No resources available." />
        <RelationshipSelector label="Linked task" value={values.linkedTaskId} onChange={(next) => updateField('linkedTaskId', next)} options={taskOptions(tasks)} placeholder="Select task" emptyText="No tasks available." />
        <RelationshipSelector label="Linked documents" values={values.linkedDocumentIds} onChange={(next) => updateField('linkedDocumentIds', next)} multiple options={documentOptions(documents)} placeholder="Add document link" emptyText="No documents available." />
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.criticalForEvent} onChange={(e) => updateField('criticalForEvent', e.target.checked)} /> Critical for event-day readiness</label>
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
  const [contacts, setContacts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [documents, setDocuments] = useState([])
  const [tasks, setTasks] = useState([])
  const [staffProfiles, setStaffProfiles] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  useEffect(() => subscribeToRunOfShow(activeEvent?.eventId, setItems, (err) => setError(err.message)), [activeEvent?.eventId])
  useEffect(() => subscribeToEventResources(activeEvent?.eventId, setResources, () => {}), [activeEvent?.eventId])
  useEffect(() => subscribeToContacts(setContacts, () => {}), [])
  useEffect(() => subscribeToOrganizations(setOrganizations, () => {}), [])
  useEffect(() => subscribeToDocuments(activeEvent?.eventId, setDocuments, () => {}), [activeEvent?.eventId])
  useEffect(() => subscribeToTasks(activeEvent?.eventId, setTasks, () => {}), [activeEvent?.eventId])
  useEffect(() => {
    if (!db) return () => {}
    return onSnapshot(collection(db, 'staffProfiles'), (snapshot) => {
      const rows = snapshot.docs.map((profile) => ({ ...profile.data(), uid: profile.data().uid || profile.id }))
      setStaffProfiles(rows)
    }, () => {})
  }, [])

  if (!activeEvent?.eventId) return <section className="rounded-3xl border border-[#E7D6CC] bg-white p-6"><h2 className="font-serif text-2xl">Select a Working Event</h2><p className="mt-2 text-sm text-[#6B564C]">Run of Show is scoped to one event.</p></section>

  const summary = buildRunOfShowSummary(items)
  const timelineState = buildTimelineState(items)
  const resourceSummary = buildResourceSummary(resources)

  async function save(values) {
    try {
      setError('')
      setSuccess('')
      if (editing?.itemId) {
        await updateRunOfShowItem(activeEvent, editing, values, user)
        setSuccess('Run of Show item updated.')
      } else {
        await createRunOfShowItem(activeEvent, values, user)
        setSuccess('Run of Show item added.')
      }
      setEditing(null)
      setShowForm(false)
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Run of Show could not be saved because Firestore rejected this update. Confirm your account and event scope in System QA.'
        : err?.message || 'Run of Show item could not be saved.')
    }
  }

  async function changeStatus(item, status, values = {}) {
    try {
      setError('')
      setSuccess('')
      await updateRunOfShowStatus(activeEvent, item, status, user, values)
      setSuccess(`Run of Show item marked ${status}.`)
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Run of Show status was not saved because Firestore rejected this update. No local success state was applied.'
        : err?.message || 'Run of Show status could not be updated.')
    }
  }

  async function markArrived(item) {
    try {
      setError('')
      setSuccess('')
      await updateRunOfShowItem(activeEvent, item, { arrivalStatus: 'Arrived', actualArrivalTime: new Date().toTimeString().slice(0, 5) }, user, 'run-of-show.arrival')
      setSuccess('Arrival marked for Run of Show item.')
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Arrival was not saved because Firestore rejected this update. No local success state was applied.'
        : err?.message || 'Arrival could not be updated.')
    }
  }

  async function removeItem(item) {
    setDeleteCandidate(item)
  }

  async function confirmRemoveItem() {
    const item = deleteCandidate
    if (!item) return
    try {
      setError('')
      setSuccess('')
      await deleteRunOfShowItem(activeEvent, item, user)
      setSuccess('Run of Show item deleted.')
      setDeleteCandidate(null)
    } catch (err) {
      setError(err?.code === 'permission-denied'
        ? 'Run of Show item was not deleted because Firestore rejected this update.'
        : err?.message || 'Run of Show item could not be deleted.')
    }
  }

  function createTask(item) {
    const params = new URLSearchParams(runOfShowTaskPrefill(item))
    navigate(`/tasks?${params.toString()}`)
  }

  return (
    <div data-tour-id="run-of-show-workspace" className="space-y-5">
      {success && <div role="status" className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{success}</div>}
      {error && <ErrorState title="Run of Show action could not be completed" message={error} />}
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

      <section className="grid gap-4 xl:grid-cols-3">
        <TimelineList title="Upcoming" items={timelineState.upcoming.slice(0, 5)} emptyText="No upcoming items by clock time." />
        <TimelineList title="Delayed" items={timelineState.delayed} emptyText="No delayed timeline items." />
        <TimelineList title="Recently Completed" items={timelineState.recentlyCompleted} emptyText="No completed items yet." />
      </section>

      {showForm && <RunOfShowForm key={editing?.itemId || `new-${activeEvent?.eventId || ''}`} event={activeEvent} item={editing} resources={resources} items={items} contacts={contacts} organizations={organizations} documents={documents} tasks={tasks} staffProfiles={staffProfiles} onSave={save} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <section className="space-y-3">
        {items.length === 0 && <div className="rounded-3xl border border-dashed border-[#D9C7BC] bg-white p-6 text-sm text-[#6B564C]">No Run of Show items yet. Add setup, arrivals, programme, service, closing, and breakdown items when the event plan becomes real.</div>}
        {items.map((item) => {
          const blockers = unresolvedDependencies(item, items)
          return (
            <article key={item.itemId} className="gsv-record-row">
              <div className="gsv-record-row-main xl:grid-cols-[minmax(14rem,1.2fr)_minmax(32rem,2fr)_auto]">
                <div className="min-w-0">
                  <p className="text-xl font-black text-[#2B1723]">{item.startTime}{item.endTime ? `-${item.endTime}` : ''}</p>
                  <h3 className="gsv-record-title mt-1">{item.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F7DDE6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A3F4B]">{item.status}</span>
                    {item.criticalForEvent && <span className="rounded-full bg-[#FFF1F1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A1F1F]">Critical</span>}
                  </div>
                </div>
                <div className="gsv-record-meta-grid">
                  <div className="gsv-record-meta">
                    <p className="gsv-record-meta-label">Activity</p>
                    <p className="gsv-record-meta-value">{item.category}</p>
                  </div>
                  <div className="gsv-record-meta">
                    <p className="gsv-record-meta-label">Responsible</p>
                    <p className="gsv-record-meta-value">{item.responsibleLabel || item.responsibleContactId || item.responsibleOrganizationId || 'Unassigned'}</p>
                  </div>
                  <div className="gsv-record-meta">
                    <p className="gsv-record-meta-label">Location</p>
                    <p className="gsv-record-meta-value">{item.location || 'Not set'}</p>
                  </div>
                  <div className="gsv-record-meta">
                    <p className="gsv-record-meta-label">Arrival</p>
                    <p className="gsv-record-meta-value">{item.expectedArrivalTime ? `${item.expectedArrivalTime} · ${item.arrivalStatus}${item.actualArrivalTime ? ` at ${item.actualArrivalTime}` : ''}` : 'Not tracked'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Confirmed', 'In Progress', 'Completed', 'Delayed'].map((status) => <button key={status} type="button" onClick={() => changeStatus(item, status, status === 'Delayed' ? { delayReason: item.delayReason || 'Marked delayed by organizer.' } : {})} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">{status}</button>)}
                  {item.expectedArrivalTime && item.arrivalStatus !== 'Arrived' && <button type="button" onClick={() => markArrived(item)} className="min-h-10 rounded-xl border border-[#D7E6CF] px-3 text-xs font-bold text-[#4F7A57]">Mark arrived</button>}
                  <button type="button" onClick={() => { setEditing(item); setShowForm(true) }} className="min-h-10 rounded-xl bg-[#2B1723] px-3 text-xs font-bold text-white">Edit</button>
                  <button type="button" onClick={() => createTask(item)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create task</button>
                  <button type="button" onClick={() => removeItem(item)} className="min-h-10 rounded-xl border border-[#F3C6C6] px-3 text-xs font-bold text-[#8A1F1F]">Delete</button>
                </div>
              </div>
              {(item.linkedResourceIds.length > 0 || blockers.length > 0 || item.notes) && (
                <div className="gsv-secondary-detail">
                  {item.linkedResourceIds.length > 0 && <p className="flex items-center gap-2"><PackageCheck className="size-4" /> Linked resources: {item.linkedResourceIds.join(', ')}</p>}
                  {blockers.length > 0 && <p className="mt-1 flex items-center gap-2 font-semibold text-[#7A4B16]"><AlertTriangle className="size-4" /> Blocked by {blockers.map((entry) => entry.title).join(', ')}</p>}
                  {item.notes && <p className="mt-1">{item.notes}</p>}
                </div>
              )}
            </article>
          )
        })}
      </section>
      <div className="rounded-3xl border border-[#E7D6CC] bg-white p-5 text-sm text-[#6B564C]">
        Documents, Contacts, Tasks, Operations, and Resources can be linked by ID without rewriting older related records. <Link to="/resources" className="font-bold text-[#8A3F4B]">Open Resources</Link>
      </div>
      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Delete Run of Show item?"
        recordName={deleteCandidate?.title}
        message={`This removes the item from the event-day sequence for ${activeEvent?.eventName || 'the Working Event'}.`}
        confirmLabel="Delete Item"
        pending={false}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={confirmRemoveItem}
      />
    </div>
  )
}
