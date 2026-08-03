import { useEffect, useMemo, useState } from 'react'
import { Building2, Link as LinkIcon, Pencil, Plus, UsersRound, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useActiveEvent } from '../events/useActiveEvent'
import { useAuth } from '../auth/useAuth'
import {
  CONTACT_CATEGORIES,
  CONTACT_STATUSES,
  RELATIONSHIP_TYPES,
  createEmptyContactDraft,
  createEmptyOrganizationDraft,
  createEmptyRelationshipDraft,
  filterContacts,
  findContactDuplicateCandidates,
} from '../utils/contactDirectory'
import {
  createContact,
  createEventContactLink,
  createOrganization,
  subscribeToContacts,
  subscribeToEventContactLinks,
  subscribeToOrganizations,
  updateContact,
  updateOrganization,
} from '../services/contactService'

function Field({ label, children, span = '' }) {
  return (
    <label className={span}>
      <span className="text-xs font-bold text-[#5A443B]">{label}</span>
      {children}
    </label>
  )
}

function ContactForm({ draft, organizations, contacts, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => createEmptyContactDraft(draft))
  const duplicates = useMemo(() => findContactDuplicateCandidates(form, contacts, organizations), [contacts, form, organizations])
  const hasDuplicates = duplicates.contacts.length > 0 || duplicates.organizations.length > 0

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!form.displayName.trim()) return
    void onSave(form)
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{form.contactId ? 'Edit contact' : 'New contact'}</p>
          <h2 className="mt-1 font-serif text-2xl text-[#2B1723]">{form.contactId ? 'Update contact' : 'Add reusable contact'}</h2>
        </div>
        <button type="button" onClick={onCancel} className="rounded-xl p-2 text-[#80685B] hover:bg-[#FFF8F2]" aria-label="Close contact form"><X className="size-5" /></button>
      </div>
      {hasDuplicates && (
        <div role="status" className="mt-4 rounded-xl border border-[#F2D6A3] bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7A5818]">
          Possible Existing Contact: {duplicates.contacts.map((item) => item.displayName).join(', ') || duplicates.organizations.map((item) => item.name).join(', ')}. Review before creating; the app does not auto-merge.
        </div>
      )}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Display name" span="lg:col-span-2"><input value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} required maxLength={180} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="First name"><input value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} maxLength={90} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Last name"><input value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} maxLength={90} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Organization"><select value={form.organizationId} onChange={(event) => setField('organizationId', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="">No organization</option>{organizations.map((org) => <option key={org.organizationId} value={org.organizationId}>{org.name}</option>)}</select></Field>
        <Field label="Role/title"><input value={form.roleTitle} onChange={(event) => setField('roleTitle', event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Category"><select value={form.category} onChange={(event) => setField('category', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{CONTACT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Status"><select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{CONTACT_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} maxLength={320} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} maxLength={64} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Preferred contact method"><input value={form.preferredContactMethod} onChange={(event) => setField('preferredContactMethod', event.target.value)} maxLength={80} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Location"><input value={form.location} onChange={(event) => setField('location', event.target.value)} maxLength={240} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Website"><input value={form.website} onChange={(event) => setField('website', event.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Social link"><input value={form.socialLink} onChange={(event) => setField('socialLink', event.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Notes" span="lg:col-span-2"><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">Cancel</button>
        <button type="submit" disabled={saving || !form.displayName.trim()} className="rounded-xl bg-[#9A5260] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : hasDuplicates ? 'Create New Anyway' : 'Save contact'}</button>
      </div>
    </form>
  )
}

function OrganizationForm({ draft, contacts, organizations, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => createEmptyOrganizationDraft(draft))
  const duplicates = useMemo(() => findContactDuplicateCandidates(form, contacts, organizations), [contacts, form, organizations])

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    void onSave(form)
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{form.organizationId ? 'Edit organization' : 'New organization'}</p><h2 className="mt-1 font-serif text-2xl text-[#2B1723]">{form.organizationId ? 'Update organization' : 'Add organization'}</h2></div><button type="button" onClick={onCancel} className="rounded-xl p-2 text-[#80685B] hover:bg-[#FFF8F2]" aria-label="Close organization form"><X className="size-5" /></button></div>
      {duplicates.organizations.length > 0 && <div role="status" className="mt-4 rounded-xl border border-[#F2D6A3] bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7A5818]">Possible Existing Contact: {duplicates.organizations.map((item) => item.name).join(', ')}. Review before creating; the app does not auto-merge.</div>}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Organization name" span="lg:col-span-2"><input value={form.name} onChange={(event) => setField('name', event.target.value)} required maxLength={180} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Category"><select value={form.category} onChange={(event) => setField('category', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{CONTACT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Primary contact"><select value={form.primaryContactId} onChange={(event) => setField('primaryContactId', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="">No primary contact</option>{contacts.map((contact) => <option key={contact.contactId} value={contact.contactId}>{contact.displayName}</option>)}</select></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} maxLength={320} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={(event) => setField('phone', event.target.value)} maxLength={64} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Website"><input value={form.website} onChange={(event) => setField('website', event.target.value)} maxLength={500} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Status"><select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{CONTACT_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Location"><input value={form.location} onChange={(event) => setField('location', event.target.value)} maxLength={240} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Notes" span="lg:col-span-2"><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">Cancel</button><button type="submit" disabled={saving || !form.name.trim()} className="rounded-xl bg-[#9A5260] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : duplicates.organizations.length ? 'Create New Anyway' : 'Save organization'}</button></div>
    </form>
  )
}

function RelationshipForm({ contacts, organizations, activeEvent, onCancel, onSave, saving }) {
  const [form, setForm] = useState(() => createEmptyRelationshipDraft())
  const targetMissing = !form.contactId && !form.organizationId
  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }
  function submit(event) {
    event.preventDefault()
    if (targetMissing) return
    void onSave(form)
  }
  return (
    <form onSubmit={submit} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Event relationship</p><h2 className="mt-1 font-serif text-2xl text-[#2B1723]">Link contact to {activeEvent?.eventName}</h2></div><button type="button" onClick={onCancel} className="rounded-xl p-2 text-[#80685B] hover:bg-[#FFF8F2]" aria-label="Close relationship form"><X className="size-5" /></button></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Field label="Contact"><select value={form.contactId} onChange={(event) => setField('contactId', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="">No person</option>{contacts.map((contact) => <option key={contact.contactId} value={contact.contactId}>{contact.displayName}</option>)}</select></Field>
        <Field label="Organization"><select value={form.organizationId} onChange={(event) => setField('organizationId', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="">No organization</option>{organizations.map((org) => <option key={org.organizationId} value={org.organizationId}>{org.name}</option>)}</select></Field>
        <Field label="Relationship type"><select value={form.relationshipType} onChange={(event) => setField('relationshipType', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{RELATIONSHIP_TYPES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Role for event"><input value={form.roleForEvent} onChange={(event) => setField('roleForEvent', event.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
        <Field label="Status"><select value={form.status} onChange={(event) => setField('status', event.target.value)} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm">{CONTACT_STATUSES.map((option) => <option key={option}>{option}</option>)}</select></Field>
        <Field label="Primary for event"><select value={form.primaryForEvent ? 'yes' : 'no'} onChange={(event) => setField('primaryForEvent', event.target.value === 'yes')} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="no">No</option><option value="yes">Yes</option></select></Field>
        <Field label="Notes" span="lg:col-span-2"><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} maxLength={1000} rows={3} className="mt-1 w-full rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm" /></Field>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">Cancel</button><button type="submit" disabled={saving || targetMissing} className="rounded-xl bg-[#9A5260] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Link to event'}</button></div>
    </form>
  )
}

export function ContactsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [links, setLinks] = useState([])
  const [filters, setFilters] = useState({ search: '', category: 'All', status: 'All', organizationId: '', eventLinked: 'all' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [formType, setFormType] = useState('')
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    const unsubscribeContacts = subscribeToContacts((rows) => { setContacts(rows); setLoading(false) }, (err) => { setError(err?.message || 'Contacts unavailable.'); setLoading(false) })
    const unsubscribeOrganizations = subscribeToOrganizations(setOrganizations, (err) => setError(err?.message || 'Organizations unavailable.'))
    return () => {
      unsubscribeContacts()
      unsubscribeOrganizations()
    }
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLinks([])
    if (!activeEvent?.eventId) return undefined
    return subscribeToEventContactLinks(activeEvent.eventId, setLinks, () => {})
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  const linkedContactIds = useMemo(() => new Set(links.map((link) => link.contactId).filter(Boolean)), [links])
  const filteredContacts = useMemo(() => {
    const rows = filterContacts(contacts, organizations, filters)
    if (filters.eventLinked === 'linked') return rows.filter((contact) => linkedContactIds.has(contact.contactId))
    if (filters.eventLinked === 'unlinked') return rows.filter((contact) => !linkedContactIds.has(contact.contactId))
    return rows
  }, [contacts, filters, linkedContactIds, organizations])

  async function saveContact(values) {
    setSaving(true)
    try {
      if (editing?.contactId) {
        await updateContact(editing, values, user)
        setSuccess('Contact updated.')
      } else {
        await createContact(values, user)
        setSuccess('Contact created.')
      }
      setFormType('')
      setEditing(null)
    } catch (saveError) {
      setError(saveError?.message || 'Contact could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function saveOrganization(values) {
    setSaving(true)
    try {
      if (editing?.organizationId) {
        await updateOrganization(editing, values, user)
        setSuccess('Organization updated.')
      } else {
        await createOrganization(values, user)
        setSuccess('Organization created.')
      }
      setFormType('')
      setEditing(null)
    } catch (saveError) {
      setError(saveError?.message || 'Organization could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function saveRelationship(values) {
    setSaving(true)
    try {
      await createEventContactLink(activeEvent, values, user)
      setSuccess('Contact relationship linked to Working Event.')
      setFormType('')
    } catch (saveError) {
      setError(saveError?.message || 'Relationship could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function prepareMessage(contact) {
    const params = new URLSearchParams({ context: 'contact', recipientName: contact.displayName, recipientEmail: contact.email || '', recipientPhone: contact.phone || '' })
    navigate(`/communications?${params.toString()}`)
  }

  function createFollowUpTask(contact) {
    const params = new URLSearchParams({
      title: `Follow up with ${contact.displayName}`,
      category: 'Follow-Up',
      responsibleLabel: contact.displayName,
      status: 'Not Started',
      priority: 'Normal',
      notes: `${contact.roleTitle || contact.category || 'Contact'}${contact.email ? ` · ${contact.email}` : ''}${contact.phone ? ` · ${contact.phone}` : ''}`,
    })
    navigate(`/tasks?${params.toString()}`)
  }

  return (
    <div data-route="contacts" className="space-y-6">
      <header className="flex flex-col gap-4 rounded-[28px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Reusable contacts</p>
          <h2 className="mt-2 font-serif text-3xl text-[#2B1723]">Contacts & Partners</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">Keep supplier, venue, partner, sponsor, and helper details reusable across events. These records do not grant app access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setEditing(null); setFormType('contact') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#9A5260] px-5 text-xs font-bold text-white"><Plus className="size-4" /> Add Contact</button>
          <button type="button" onClick={() => { setEditing(null); setFormType('organization') }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-5 text-xs font-bold text-[#6B564C]"><Building2 className="size-4" /> Add Organization</button>
          <button type="button" onClick={() => setFormType('relationship')} disabled={!activeEvent?.eventId} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E7D6CC] px-5 text-xs font-bold text-[#6B564C] disabled:opacity-50"><LinkIcon className="size-4" /> Link to Event</button>
        </div>
      </header>

      {success && <div role="status" className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{success}</div>}
      {error && <ErrorState message={error} />}
      {formType === 'contact' && <ContactForm draft={editing || undefined} contacts={contacts} organizations={organizations} saving={saving} onCancel={() => { setFormType(''); setEditing(null) }} onSave={saveContact} />}
      {formType === 'organization' && <OrganizationForm draft={editing || undefined} contacts={contacts} organizations={organizations} saving={saving} onCancel={() => { setFormType(''); setEditing(null) }} onSave={saveOrganization} />}
      {formType === 'relationship' && <RelationshipForm contacts={contacts} organizations={organizations} activeEvent={activeEvent} saving={saving} onCancel={() => setFormType('')} onSave={saveRelationship} />}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Contact summary">
        <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4"><p className="text-2xl font-bold text-[#2B1723]">{contacts.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">Contacts</p></div>
        <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4"><p className="text-2xl font-bold text-[#2B1723]">{organizations.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">Organizations</p></div>
        <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4"><p className="text-2xl font-bold text-[#2B1723]">{links.length}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">Linked to Working Event</p></div>
        <div className="rounded-2xl border border-[#FFF1F1] bg-[#FFF8F2] p-4"><p className="text-sm font-bold text-[#2B1723]">Access boundary</p><p className="mt-1 text-xs leading-5 text-[#80685B]">Business contacts are not staff assignments and do not grant login access.</p></div>
      </section>

      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <input aria-label="Search contacts" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search name, email, phone, organization..." className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm lg:col-span-2" />
          <select aria-label="Category filter" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option>All</option>{CONTACT_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select>
          <select aria-label="Status filter" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option>All</option>{CONTACT_STATUSES.map((option) => <option key={option}>{option}</option>)}</select>
          <select aria-label="Working Event link filter" value={filters.eventLinked} onChange={(event) => setFilters((current) => ({ ...current, eventLinked: event.target.value }))} className="rounded-xl border border-[#E7D6CC] px-3 py-2 text-sm"><option value="all">All event links</option><option value="linked">Linked to Working Event</option><option value="unlinked">Not linked to Working Event</option></select>
        </div>
      </section>

      {loading ? <LoadingState message="Loading contacts..." /> : filteredContacts.length === 0 ? (
        <EmptyState icon={UsersRound} title="No contacts match" description="Add reusable contacts and organizations so event planning records can point to the same people and businesses." />
      ) : (
        <section className="grid gap-3 xl:grid-cols-2">
          {filteredContacts.map((contact) => {
            const organization = organizations.find((item) => item.organizationId === contact.organizationId)
            return (
              <article key={contact.contactId} className="rounded-[22px] border border-[#EEDFD6] bg-white p-4 shadow-[0_6px_18px_rgba(84,53,67,0.035)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#F8E9CB] px-2.5 py-1 text-[10px] font-bold uppercase text-[#7A5818]">{contact.category}</span><span className="rounded-full bg-[#EAF6EF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#17623A]">{contact.status}</span>{linkedContactIds.has(contact.contactId) && <span className="rounded-full bg-[#E9EFFB] px-2.5 py-1 text-[10px] font-bold uppercase text-[#415F91]">Working Event</span>}</div>
                    <h3 className="mt-3 break-words font-serif text-xl text-[#2B1723]">{contact.displayName}</h3>
                    <p className="mt-1 break-words text-sm text-[#80685B]">{organization?.name || contact.roleTitle || 'No organization linked'}</p>
                    <p className="mt-2 break-all text-xs leading-5 text-[#6B564C]">{contact.email || 'No email'}{contact.phone ? ` · ${contact.phone}` : ' · No phone'}</p>
                    {contact.notes && <p className="mt-3 rounded-xl bg-[#FFF8F2] px-3 py-2 text-xs leading-5 text-[#6B564C]">{contact.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button type="button" onClick={() => createFollowUpTask(contact)} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Create Follow-Up Task</button>
                    <button type="button" onClick={() => prepareMessage(contact)} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] px-3 text-xs font-bold text-[#6B564C]">Message Context</button>
                    <button type="button" onClick={() => { setEditing(contact); setFormType('contact') }} className="grid size-10 place-items-center rounded-xl border border-[#E7D6CC] text-[#6B564C]" aria-label={`Edit ${contact.displayName}`}><Pencil className="size-4" /></button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
