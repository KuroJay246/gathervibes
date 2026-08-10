import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AlertTriangle, ClipboardList, PackageCheck, Plus, Truck } from 'lucide-react'
import { ErrorState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { RelationshipSelector } from '../components/RelationshipSelector'
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
import { subscribeToContacts, subscribeToOrganizations } from '../services/contactService'
import { subscribeToDocuments } from '../services/documentService'
import { subscribeToOperationsLedger } from '../services/operationsLedgerService'
import { subscribeToTasks } from '../services/taskService'
import { organizerSaveErrorMessage } from '../utils/organizerErrors'

function option(id, label, detail = '') {
  return { id, label: detail ? `${label} - ${detail}` : label }
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

function operationOptions(operations = []) {
  return operations.map((entry) => option(entry.ledgerEntryId, entry.label || entry.ledgerEntryId, `${entry.entryType || 'operation'} ${entry.status || ''}`.trim()))
}

function runItemOptions(items = []) {
  return items.map((item) => option(item.itemId, `${item.startTime} ${item.title}`, item.status))
}

function ResourceForm({ resource, runItems, contacts, organizations, documents, tasks, operationsEntries, onSave, onCancel }) {
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
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Basic information</p>
          <p className="mt-1 text-xs text-[#80685B]">Required: resource name. Use category and source to explain what the event needs and where it is coming from.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Name<input value={values.name} onChange={(e) => updateField('name', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Category<select value={values.category} onChange={(e) => updateField('category', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Source<select value={values.sourceType} onChange={(e) => updateField('sourceType', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_SOURCE_TYPES.map((sourceType) => <option key={sourceType}>{sourceType}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Status<select value={values.status} onChange={(e) => updateField('status', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3">{RESOURCE_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Quantity and location</p>
          <p className="mt-1 text-xs text-[#80685B]">Shortage is based on needed minus confirmed. The app does not order or pay for anything automatically.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Needed<input type="number" min="0" value={values.quantityNeeded} onChange={(e) => updateField('quantityNeeded', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Confirmed<input type="number" min="0" value={values.quantityConfirmed} onChange={(e) => updateField('quantityConfirmed', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
          <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Unit<input value={values.unit} onChange={(e) => updateField('unit', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Location<input value={values.location} onChange={(e) => updateField('location', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Supplier or owner</p>
          <p className="mt-1 text-xs text-[#80685B]">Assign who is providing it. Linking a supplier contact or organization does not give that person app access.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Supplier label<input value={values.supplierLabel} onChange={(e) => updateField('supplierLabel', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <RelationshipSelector label="Supplier contact" value={values.supplierContactId} onChange={(next) => updateField('supplierContactId', next)} options={contactOptions(contacts)} placeholder="Select supplier contact" emptyText="No contacts available." />
        <RelationshipSelector label="Supplier organization" value={values.supplierOrganizationId} onChange={(next) => updateField('supplierOrganizationId', next)} options={organizationOptions(organizations)} placeholder="Select supplier organization" emptyText="No organizations available." />
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Pickup, packing, and return</p>
          <p className="mt-1 text-xs text-[#80685B]">Use these fields when the item must be collected, packed, brought on site, or returned after the event.</p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Pickup due<input type="date" value={values.pickupDueDate} onChange={(e) => updateField('pickupDueDate', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <label className="grid gap-1 text-sm font-semibold text-[#2B1723]">Return due<input type="date" value={values.returnDueDate} onChange={(e) => updateField('returnDueDate', e.target.value)} className="min-h-11 rounded-xl border border-[#E7D6CC] px-3" /></label>
        <div className="md:col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Linked records</p>
          <p className="mt-1 text-xs text-[#80685B]">Links show context only. Linking an Operations entry does not change an amount, and linking a Task does not complete it.</p>
        </div>
        <RelationshipSelector label="Linked Run of Show items" values={values.linkedRunOfShowItemIds} onChange={(next) => updateField('linkedRunOfShowItemIds', next)} multiple options={runItemOptions(runItems)} placeholder="Add timeline link" emptyText="No Run of Show items available." />
        <RelationshipSelector label="Linked documents" values={values.linkedDocumentIds} onChange={(next) => updateField('linkedDocumentIds', next)} multiple options={documentOptions(documents)} placeholder="Add document link" emptyText="No documents available." />
        <RelationshipSelector label="Linked task" value={values.linkedTaskId} onChange={(next) => updateField('linkedTaskId', next)} options={taskOptions(tasks)} placeholder="Select task" emptyText="No tasks available." />
        <RelationshipSelector label="Linked Operations entry" value={values.linkedOperationId} onChange={(next) => updateField('linkedOperationId', next)} options={operationOptions(operationsEntries)} placeholder="Select Operations entry" emptyText="No Operations entries available." />
        <RelationshipSelector label="Linked commitment" value={values.linkedCommitmentId} onChange={(next) => updateField('linkedCommitmentId', next)} options={operationOptions(operationsEntries)} placeholder="Select commitment" emptyText="No commitments available." />
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.packingRequired} onChange={(e) => updateField('packingRequired', e.target.checked)} /> Packing required</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.pickupRequired} onChange={(e) => updateField('pickupRequired', e.target.checked)} /> Pickup required</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.returnRequired} onChange={(e) => updateField('returnRequired', e.target.checked)} /> Return required</label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-sm font-semibold text-[#2B1723]"><input type="checkbox" checked={values.criticalForEvent} onChange={(e) => updateField('criticalForEvent', e.target.checked)} /> Critical for event-day readiness</label>
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
  const [contacts, setContacts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [documents, setDocuments] = useState([])
  const [tasks, setTasks] = useState([])
  const [operationsEntries, setOperationsEntries] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  useEffect(() => subscribeToEventResources(activeEvent?.eventId, setResources, (err) => setError(err.message)), [activeEvent?.eventId])
  useEffect(() => subscribeToRunOfShow(activeEvent?.eventId, setRunItems, () => {}), [activeEvent?.eventId])
  useEffect(() => subscribeToContacts(setContacts, () => {}), [])
  useEffect(() => subscribeToOrganizations(setOrganizations, () => {}), [])
  useEffect(() => subscribeToDocuments(activeEvent?.eventId, setDocuments, () => {}), [activeEvent?.eventId])
  useEffect(() => subscribeToTasks(activeEvent?.eventId, setTasks, () => {}), [activeEvent?.eventId])
  useEffect(() => subscribeToOperationsLedger(activeEvent?.eventId, setOperationsEntries, () => {}), [activeEvent?.eventId])

  if (!activeEvent?.eventId) return <section className="rounded-3xl border border-[#E7D6CC] bg-white p-6"><h2 className="font-serif text-2xl">Select a Working Event</h2><p className="mt-2 text-sm text-[#6B564C]">Resources are scoped to one event.</p></section>

  const summary = buildResourceSummary(resources)
  const runItemNames = new Map(runItems.map((item) => [item.itemId, item.title]))

  async function save(values) {
    try {
      if (editing?.resourceId) await updateEventResource(activeEvent, editing, values, user)
      else await createEventResource(activeEvent, values, user)
      setSuccess(editing?.resourceId ? 'Resource updated.' : 'Resource added.')
      setEditing(null)
      setShowForm(false)
      setError('')
    } catch (err) {
      if (import.meta.env.DEV) console.error('Resource save error:', err)
      setError(organizerSaveErrorMessage(err, 'resource'))
    }
  }

  async function updateStatus(resource, status) {
    try {
      await updateEventResourceStatus(activeEvent, resource, status, user)
      setError('')
      setSuccess(`Resource marked ${status}.`)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Resource status error:', err)
      setError(organizerSaveErrorMessage(err, 'resource status'))
    }
  }

  async function removeResource(resource) {
    setDeleteCandidate(resource)
  }

  async function confirmRemoveResource() {
    const resource = deleteCandidate
    if (!resource) return
    try {
      await deleteEventResource(activeEvent, resource, user)
      setError('')
      setSuccess('Resource deleted.')
      setDeleteCandidate(null)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Resource delete error:', err)
      setError(organizerSaveErrorMessage(err, 'resource'))
    }
  }

  function createTask(resource) {
    const params = new URLSearchParams(resourceTaskPrefill(resource))
    navigate(`/tasks?${params.toString()}`)
  }

  return (
    <div data-tour-id="resources-workspace" className="space-y-5">
      {success && <div role="status" className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{success}</div>}
      {error && <ErrorState title="Resource action could not be completed" message={error} />}
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

      {showForm && <ResourceForm key={editing?.resourceId || `new-${activeEvent?.eventId || ''}`} resource={editing} runItems={runItems} contacts={contacts} organizations={organizations} documents={documents} tasks={tasks} operationsEntries={operationsEntries} onSave={save} onCancel={() => { setShowForm(false); setEditing(null) }} />}

      <section className="grid gap-3">
        {resources.length === 0 && <div className="rounded-3xl border border-dashed border-[#D9C7BC] bg-white p-6 text-sm text-[#6B564C]">No resources yet. Add equipment, supplies, documents/print, safety, packing, pickup, or return needs when the plan becomes real.</div>}
        {resources.map((resource) => (
          <article key={resource.resourceId} className="gsv-record-row">
            <div className="gsv-record-row-main xl:grid-cols-[minmax(15rem,1.25fr)_minmax(34rem,2fr)_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#F7DDE6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A3F4B]">{resource.status}</span>
                  {resource.criticalForEvent && <span className="rounded-full bg-[#FFF1F1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A1F1F]">Critical</span>}
                </div>
                <h3 className="gsv-record-title mt-2">{resource.name}</h3>
                <p className="mt-1 text-xs font-semibold text-[#80685B]">{resource.category}</p>
              </div>
              <div className="gsv-record-meta-grid">
                <div className="gsv-record-meta">
                  <p className="gsv-record-meta-label">Quantity</p>
                  <p className="gsv-record-meta-value">{resource.quantityConfirmed} of {resource.quantityNeeded} {resource.unit || 'needed'}</p>
                </div>
                <div className="gsv-record-meta">
                  <p className="gsv-record-meta-label">Source</p>
                  <p className="gsv-record-meta-value">{resource.sourceType}</p>
                </div>
                <div className="gsv-record-meta">
                  <p className="gsv-record-meta-label">Supplier</p>
                  <p className="gsv-record-meta-value">{resource.supplierLabel || resource.supplierContactId || resource.supplierOrganizationId || 'Not set'}</p>
                </div>
                <div className="gsv-record-meta">
                  <p className="gsv-record-meta-label">Problem</p>
                  <p className={`gsv-record-meta-value ${resource.shortage > 0 ? 'text-[#7A4B16]' : ''}`}>{resource.shortage > 0 ? `Short by ${resource.shortage}` : 'No shortage'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Requested', 'Ordered / Reserved', 'Confirmed', 'Received', 'Packed', 'On Site', 'Returned'].map((status) => <button key={status} type="button" onClick={() => updateStatus(resource, status)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">{status}</button>)}
                <button type="button" onClick={() => { setEditing(resource); setShowForm(true) }} className="min-h-10 rounded-xl bg-[#2B1723] px-3 text-xs font-bold text-white">Edit</button>
                <button type="button" onClick={() => createTask(resource)} className="min-h-10 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create task</button>
                <button type="button" onClick={() => removeResource(resource)} className="min-h-10 rounded-xl border border-[#F3C6C6] px-3 text-xs font-bold text-[#8A1F1F]">Delete</button>
              </div>
            </div>
            {(resource.shortage > 0 || resource.location || resource.linkedRunOfShowItemIds.length > 0 || resource.packingRequired || resource.pickupRequired || resource.returnRequired || resource.notes) && (
              <div className="gsv-secondary-detail">
                {resource.shortage > 0 && <p className="flex items-center gap-2 font-semibold text-[#7A4B16]"><AlertTriangle className="size-4" /> Short by {resource.shortage}</p>}
                {resource.location && <p className="mt-1"><Truck className="mr-2 inline size-4" />Location: {resource.location}</p>}
                {resource.linkedRunOfShowItemIds.length > 0 && <p className="mt-1"><ClipboardList className="mr-2 inline size-4" />Run of Show: {resource.linkedRunOfShowItemIds.map((id) => runItemNames.get(id) || id).join(', ')}</p>}
                {(resource.packingRequired || resource.pickupRequired || resource.returnRequired) && <p className="mt-1"><PackageCheck className="mr-2 inline size-4" />{resource.packingRequired ? 'Pack. ' : ''}{resource.pickupRequired ? `Pickup ${resource.pickupDueDate || 'due date not set'}. ` : ''}{resource.returnRequired ? `Return ${resource.returnDueDate || 'due date not set'}.` : ''}</p>}
                {resource.notes && <p className="mt-1">{resource.notes}</p>}
              </div>
            )}
          </article>
        ))}
      </section>
      <ConfirmDialog
        open={Boolean(deleteCandidate)}
        title="Delete resource?"
        recordName={deleteCandidate?.name}
        message={`This removes the resource from ${activeEvent?.eventName || 'the Working Event'}. It does not change Operations, payments, or tasks automatically.`}
        confirmLabel="Delete Resource"
        pending={false}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={confirmRemoveResource}
      />
    </div>
  )
}
