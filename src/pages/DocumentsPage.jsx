import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { AssignedEventGate } from '../components/AssignedEventGate'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useActiveEvent } from '../events/useActiveEvent'
import { useAuth } from '../auth/useAuth'
import { canManageTasks, isApprovedAdmin } from '../utils/accessRoles'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_FILTERS,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  buildDocumentSummary,
  createEmptyDocumentDraft,
  documentTaskPrefill,
  effectiveDocumentStatus,
  externalHostname,
  filterDocuments,
  normalizeExternalUrl,
} from '../utils/documentRegistry'
import { createDocumentReference, deleteDocumentReference, subscribeToDocuments, updateDocumentReference, updateDocumentStatus } from '../services/documentService'

function friendlyDocumentError(error, action = 'document reference') {
  if (error?.code === 'permission-denied') return `${action} was blocked by Firestore authorization or document-record validation. Confirm Protected Owner and Working Event status in System QA.`
  if (error?.code === 'unauthenticated') return 'Your session expired. Sign in again to continue.'
  return error?.message || `${action} could not be completed.`
}

function statusClass(status) {
  if (['Approved', 'Current', 'Received'].includes(status)) return 'bg-[#EAF6EF] text-[#17623A]'
  if (['Expired', 'Replaced'].includes(status)) return 'bg-[#FFF1F1] text-[#A32626]'
  if (['Requested', 'Under Review', 'Expiring Soon'].includes(status)) return 'bg-[#FFF4DF] text-[#7A5818]'
  return 'bg-[#F1ECE8] text-[#725F55]'
}

function Field({ label, children, span = '' }) {
  return (
    <label className={span}>
      <span className="text-xs font-bold text-[#5A443B]">{label}</span>
      {children}
    </label>
  )
}

function DocumentForm({ draft, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => createEmptyDocumentDraft(draft))
  const urlInvalid = form.url.trim() && !normalizeExternalUrl(form.url)

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!form.title.trim() || urlInvalid) return
    void onSave(form)
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{form.documentId ? 'Edit reference' : 'New reference'}</p>
          <h2 className="mt-1 font-serif text-2xl text-[#2B1723]">{form.documentId ? 'Update document reference' : 'Add document reference'}</h2>
          <p className="mt-2 text-xs leading-5 text-[#80685B]">This stores metadata and external links only. No file is uploaded to Gather & Savor.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-[#80685B] hover:bg-[#FFF8F2]" aria-label="Close document form"><X className="size-5" /></button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 rounded-2xl bg-[#FFF8F2] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Basic information</p>
          <p className="mt-1 text-xs leading-5 text-[#80685B]">Required: document title. Category, status, type, and required state help the organizer decide what still needs follow-up.</p>
        </div>
        <Field label="Title" span="lg:col-span-2">
          <input value={form.title} onChange={(event) => setField('title', event.target.value)} required maxLength={180} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(event) => setField('category', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {DOCUMENT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {DOCUMENT_STATUSES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Document type">
          <select value={form.documentType} onChange={(event) => setField('documentType', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            {DOCUMENT_TYPES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field label="Required">
          <select value={form.required ? 'yes' : 'no'} onChange={(event) => setField('required', event.target.value === 'yes')} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <div className="lg:col-span-2 rounded-2xl bg-[#FFF8F2] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Where is the document?</p>
          <p className="mt-1 text-xs leading-5 text-[#80685B]">Use a URL or location note to point to the external source. Gather & Savor does not upload, copy, scan, or delete the file.</p>
        </div>
        <Field label="External URL" span="lg:col-span-2">
          <input value={form.url} onChange={(event) => setField('url', event.target.value)} placeholder="https://drive.google.com/..." className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
          {urlInvalid && <span className="mt-1 block text-xs font-semibold text-[#A32626]">Enter a valid http or https URL, or leave this blank.</span>}
        </Field>
        <Field label="Provider or source">
          <input value={form.provider} onChange={(event) => setField('provider', event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="External location">
          <input value={form.storageLocation} onChange={(event) => setField('storageLocation', event.target.value)} maxLength={240} placeholder="Drive folder, binder, email thread reference..." className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <div className="lg:col-span-2 rounded-2xl bg-[#FFF8F2] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Linked records</p>
          <p className="mt-1 text-xs leading-5 text-[#80685B]">Links provide context only. They do not change contact access, complete a task, update money, or alter any external document.</p>
        </div>
        <Field label="Linked contact ID">
          <input value={form.linkedContactId} onChange={(event) => setField('linkedContactId', event.target.value)} maxLength={128} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Linked organization ID">
          <input value={form.linkedOrganizationId} onChange={(event) => setField('linkedOrganizationId', event.target.value)} maxLength={128} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Linked task ID">
          <input value={form.linkedTaskId} onChange={(event) => setField('linkedTaskId', event.target.value)} maxLength={128} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Linked Operations entry ID">
          <input value={form.linkedOperationId} onChange={(event) => setField('linkedOperationId', event.target.value)} maxLength={128} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <div className="lg:col-span-2 rounded-2xl bg-[#FFF8F2] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Dates and notes</p>
          <p className="mt-1 text-xs leading-5 text-[#80685B]">Use due, expiry, version, description, and notes to keep follow-up visible without changing any related record automatically.</p>
        </div>
        <Field label="Due date">
          <input type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Expiry date">
          <input type="date" value={form.expiryDate} onChange={(event) => setField('expiryDate', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Version label">
          <input value={form.versionLabel} onChange={(event) => setField('versionLabel', event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Description" span="lg:col-span-2">
          <textarea value={form.description} onChange={(event) => setField('description', event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
        <Field label="Notes" span="lg:col-span-2">
          <textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">Cancel</button>
        <button type="submit" disabled={saving || !form.title.trim() || Boolean(urlInvalid)} className="rounded-xl bg-[#9A5260] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save reference'}</button>
      </div>
    </form>
  )
}

function DocumentCard({ documentRecord, canEdit, onEdit, onStatus, onDelete, onCopy, onTask, onMessage }) {
  const status = effectiveDocumentStatus(documentRecord)
  const host = externalHostname(documentRecord.url)
  return (
    <article className="rounded-[22px] border border-[#EEDFD6] bg-white p-4 shadow-[0_6px_18px_rgba(84,53,67,0.035)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(status)}`}>{status}</span>
            {documentRecord.required && <span className="rounded-full bg-[#FFF1F1] px-2.5 py-1 text-[10px] font-bold uppercase text-[#A32626]">Required</span>}
            <span className="rounded-full bg-[#F8E9CB] px-2.5 py-1 text-[10px] font-bold uppercase text-[#7A5818]">{documentRecord.category}</span>
          </div>
          <h3 className="mt-3 break-words font-serif text-xl text-[#2B1723]">{documentRecord.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#80685B]">
            <span>{documentRecord.documentType}</span>
            {host && <span className="break-all">Host: {host}</span>}
            {documentRecord.dueDate && <span>Due {documentRecord.dueDate}</span>}
            {documentRecord.expiryDate && <span>Expires {documentRecord.expiryDate}</span>}
            {documentRecord.linkedContactId && <span>Contact: {documentRecord.linkedContactId}</span>}
            {documentRecord.linkedOrganizationId && <span>Organization: {documentRecord.linkedOrganizationId}</span>}
          </div>
          {documentRecord.description && <p className="mt-3 text-sm leading-6 text-[#5F493F]">{documentRecord.description}</p>}
          {documentRecord.notes && <p className="mt-3 rounded-xl bg-[#FFF8F2] px-3 py-2 text-xs leading-5 text-[#6B564C]">{documentRecord.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
          {documentRecord.url && <a href={documentRecord.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2B1723] px-3 text-xs font-bold text-white"><ExternalLink className="size-4" /> Open Link</a>}
          {documentRecord.url && <button type="button" onClick={() => onCopy(documentRecord)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]"><Copy className="size-4" /> Copy Link</button>}
          <button type="button" onClick={() => onTask(documentRecord)} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create Follow-Up Task</button>
          {(documentRecord.linkedContactId || documentRecord.linkedOrganizationId) && <button type="button" onClick={() => onMessage(documentRecord)} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Prepare Message</button>}
          {canEdit && ['Received', 'Approved', 'Replaced', 'Not Required'].map((nextStatus) => (
            <button key={nextStatus} type="button" onClick={() => onStatus(documentRecord, nextStatus)} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Mark {nextStatus}</button>
          ))}
          {canEdit && <button type="button" onClick={() => onEdit(documentRecord)} className="grid size-10 place-items-center rounded-xl border border-[#E7D6CC] text-[#6B564C]" aria-label={`Edit ${documentRecord.title}`}><Pencil className="size-4" /></button>}
          {canEdit && <button type="button" onClick={() => onDelete(documentRecord)} className="grid size-10 place-items-center rounded-xl border border-[#F0D3D3] text-[#A32626]" aria-label={`Delete ${documentRecord.title}`}><Trash2 className="size-4" /></button>}
        </div>
      </div>
    </article>
  )
}

export function DocumentsPage() {
  const { activeEvent } = useActiveEvent()
  const { access, user } = useAuth()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formDocument, setFormDocument] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [saving, setSaving] = useState(false)
  const canEdit = isApprovedAdmin(access)
  const canCreateTask = canManageTasks(access, activeEvent?.eventId)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setDocuments([])
    setError('')
    setLoading(Boolean(activeEvent?.eventId))
    if (!activeEvent?.eventId) {
      setLoading(false)
      return undefined
    }
    return subscribeToDocuments(
      activeEvent.eventId,
      (nextDocuments) => {
        setDocuments(nextDocuments)
        setLoading(false)
      },
      (nextError) => {
        setError(friendlyDocumentError(nextError, 'Document references'))
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  const summary = useMemo(() => buildDocumentSummary(documents), [documents])
  const visibleDocuments = useMemo(() => filterDocuments(documents, filter), [documents, filter])

  async function saveDocument(values) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (formDocument?.documentId) {
        await updateDocumentReference(activeEvent, formDocument, values, user)
        setSuccess('Document reference updated.')
      } else {
        await createDocumentReference(activeEvent, values, user)
        setSuccess('Document reference added.')
      }
      setFormDocument(null)
    } catch (saveError) {
      setError(friendlyDocumentError(saveError, 'Document reference'))
    } finally {
      setSaving(false)
    }
  }

  async function markStatus(documentRecord, status) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateDocumentStatus(activeEvent, documentRecord, status, user)
      setSuccess(`Document marked ${status}.`)
    } catch (statusError) {
      setError(friendlyDocumentError(statusError, 'Document status'))
    } finally {
      setSaving(false)
    }
  }

  async function removeDocument(documentRecord) {
    setDeleteCandidate(documentRecord)
  }

  async function confirmRemoveDocument() {
    const documentRecord = deleteCandidate
    if (!documentRecord) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await deleteDocumentReference(activeEvent, documentRecord, user)
      setSuccess('Document reference removed. External file was not deleted.')
      setDeleteCandidate(null)
    } catch (deleteError) {
      setError(friendlyDocumentError(deleteError, 'Document reference'))
    } finally {
      setSaving(false)
    }
  }

  async function copyLink(documentRecord) {
    await navigator.clipboard.writeText(documentRecord.url)
    setSuccess('Link copied. No external file was opened or changed.')
  }

  function createTask(documentRecord) {
    if (!canCreateTask) return
    const prefill = documentTaskPrefill(documentRecord)
    const params = new URLSearchParams(Object.entries(prefill).filter(([, value]) => value))
    navigate(`/tasks?${params.toString()}`)
  }

  function prepareMessage(documentRecord) {
    const params = new URLSearchParams({
      context: 'document',
      subject: `Follow-up: ${documentRecord.title}`,
      recipientLabel: documentRecord.linkedContactId || documentRecord.linkedOrganizationId,
    })
    navigate(`/communications?${params.toString()}`)
  }

  return (
    <AssignedEventGate purpose="Documents">
      <div data-route="documents" data-tour-id="documents-workspace" className="space-y-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Event documents</p>
            <h2 className="mt-2 font-serif text-3xl text-[#2B1723]">Documents, Links & Evidence</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
              Track external document references for <strong>{activeEvent?.eventName || 'the selected Working Event'}</strong>. This stores metadata and links only; no files are uploaded here.
            </p>
          </div>
          {canEdit && <button type="button" onClick={() => setFormDocument(createEmptyDocumentDraft())} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9A5260] px-5 text-xs font-bold text-white shadow-lg shadow-[#9A5260]/20"><Plus className="size-4" /> Add Document</button>}
        </header>

        {success && <div role="status" className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{success}</div>}
        {error && <ErrorState message={error} />}
        {formDocument && canEdit && <DocumentForm draft={formDocument} saving={saving} onCancel={() => setFormDocument(null)} onSave={saveDocument} />}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Document summary">
          {[
            ['Total references', summary.total],
            ['Required', summary.required],
            ['Required missing', summary.missingRequired],
            ['Expiring soon', summary.expiringSoon],
            ['Expired', summary.expired],
          ].map(([label, value]) => (
            <button key={label} type="button" onClick={() => setFilter(label === 'Required missing' ? 'Missing / Needed' : label === 'Expiring soon' ? 'Expiring Soon' : label === 'Expired' ? 'Expired' : 'All')} className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3 text-left hover:bg-[#FFF8F2]">
              <p className="text-2xl font-bold text-[#2B1723]">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
            </button>
          ))}
        </section>

        <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_FILTERS.map((option) => <button key={option} type="button" onClick={() => setFilter(option)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter === option ? 'bg-[#2B1723] text-white' : 'border border-[#E5D7CF] text-[#80685B]'}`}>{option}</button>)}
          </div>
        </section>

        {loading ? <LoadingState message="Loading document references..." /> : visibleDocuments.length === 0 ? (
          <EmptyState icon={FileText} title="No document references match" description="Add agreement links, receipt references, permit records, or other event evidence when they are needed for the selected Working Event." />
        ) : (
          <div className="space-y-3">
            {visibleDocuments.map((documentRecord) => (
              <DocumentCard key={documentRecord.documentId} documentRecord={documentRecord} canEdit={canEdit && !saving} onEdit={setFormDocument} onStatus={markStatus} onDelete={removeDocument} onCopy={copyLink} onTask={createTask} onMessage={prepareMessage} />
            ))}
          </div>
        )}

        <section className="rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#6B564C]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 size-5 shrink-0 text-[#1E7345]" />
            <p><strong>Storage boundary:</strong> this register stores title, status, dates, relationships, notes, and external URLs only. It does not upload, copy, scan, OCR, or delete external files.</p>
          </div>
        </section>
        <ConfirmDialog
          open={Boolean(deleteCandidate)}
          title="Delete document reference?"
          recordName={deleteCandidate?.title}
          message="This removes the reference from the Working Event. It does not delete or change the external file."
          confirmLabel="Delete Reference"
          pending={saving}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={confirmRemoveDocument}
        />
      </div>
    </AssignedEventGate>
  )
}
