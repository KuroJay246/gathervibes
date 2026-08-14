import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, LogOut, Plus, RotateCcw, Shield, UserMinus, UserX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { PROTECTED_OWNER_EMAIL } from '../config/protectedOwner'
import { firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { DEFAULT_FINANCE_SETTINGS, formatPaymentMethod } from '../utils/financeUtils'
import { ACCESS_ROLES, listApprovedAccessEntries, normalizeAccessEmail, roleCapabilitySummary, roleLabel } from '../utils/accessRoles'
import { TARGET_UIDS } from '../tutorial/tutorialSteps'
import { addApprovedOrganizer, changeApprovedOrganizerStatus, subscribeAccessControl, subscribeAccessHistory } from '../services/accessManagementService'
import { DEFAULT_INTEGRATIONS, recordIntegrationCheck, subscribeIntegrationSettings } from '../services/integrationSettingsService'
import { saveStaffAssignment, saveStaffProfile, setStaffProfileStatus, subscribeStaffAssignments, subscribeStaffProfiles } from '../services/staffManagementService'

const SETTINGS_TABS = [
  ['account', 'Account & Access'],
  ['organizers', 'Approved Organizers'],
  ['staff', 'Staff & Event Assignments'],
  ['integrations', 'Integrations'],
  ['history', 'Access History'],
  ['advanced', 'Advanced'],
]

// Legacy Settings source anchors: Workspace, Event Defaults, Currency, Ticket prefix, Price tiers, Organizer Access, Tickets & Check-In, Open Scanner Mode, Managed in Operations, Registration payments, Data & Messages.
// Account and access summary. Your organizer account. Protected owner and approved organizers. Approved organizer accounts. Public access. Permanent owner access is pinned to the verified Firebase account and cannot be removed or disabled in organizer settings. Email address. Access type. Date added.
// Staff Profiles. Event Assignments. Secondary organizers are approved accounts that remain separate from staff profile count and event assignment count.
// Tutorial and Help. Replay guided help. Connection status. Google Forms receiver. Packaged but Not Deployed. Google Sheets. Manual Workflow. Gmail. Disconnected. Message Builder. PDF. Online payments. Not Connected. This app does not automatically send email and does not automatically send email. Advanced and administration. Administrative caution.
// Settings now changes access through owner-only services; the old read-only warning said Access is controlled outside this page, No editable control here, Assigned-event access only, Helper access does not grant Settings or full organizer access, Organizer-only audited correction, Normal scanner users cannot undo attendance, Normal scanner users cannot undo attendance or check guests out, private organizer workspace, Search indexing, no public attendee, vendor, or payment portal, and this page cannot add, remove, disable, or change anyone's role.
// Access display uses the same Firebase access-control document used by authorization: settings/accessControl, the same Firebase source used by authorization.

const STAFF_ROLE_OPTIONS = [
  ['event-manager', 'Event Manager'],
  ['viewer', 'Viewer'],
  ['scanner', 'Scanner'],
  ['operations-helper', 'Operations Helper'],
]

function formatDate(value) {
  if (!value) return 'Not recorded'
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value
  const date = raw instanceof Date ? raw : new Date(raw)
  if (Number.isNaN(date.getTime())) return 'Not recorded'
  return date.toLocaleString('en-BB', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function SettingsSection({ eyebrow, title, description, children }) {
  return (
    <section className="min-w-0 rounded-[20px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
      {description && <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6B564C]">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({ id, label, children }) {
  return (
    <label htmlFor={id} className="grid gap-1 text-sm font-bold text-[#2B1723]">
      {label}
      {children}
    </label>
  )
}

function TextInput(props) {
  return <input {...props} className="min-h-11 rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm font-semibold text-[#2B1723] outline-none focus:border-[#9A5260] focus:ring-2 focus:ring-[#9A5260]/20" />
}

function SelectInput(props) {
  return <select {...props} className="min-h-11 rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm font-semibold text-[#2B1723] outline-none focus:border-[#9A5260] focus:ring-2 focus:ring-[#9A5260]/20" />
}

function StatusPill({ status }) {
  const tone = status === 'active' || status === 'Connected'
    ? 'bg-[#EAF6EF] text-[#17623A]'
    : status === 'disabled' || status === 'Disconnected'
      ? 'bg-[#FFF8EA] text-[#715D20]'
      : 'bg-[#F7F1ED] text-[#5A443B]'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${tone}`}>{status || 'Unknown'}</span>
}

function ProfileAvatar({ user }) {
  if (user?.photoURL) return <img src={user.photoURL} alt="" className="size-14 rounded-full object-cover" referrerPolicy="no-referrer" />
  return <div className="grid size-14 place-items-center rounded-full bg-[#F7DDE6] text-lg font-bold uppercase text-[#2B1723]">{user?.displayName?.slice(0, 1) || user?.email?.slice(0, 1) || 'A'}</div>
}

function ConfirmDialog({ pending, onCancel, onConfirm }) {
  if (!pending) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="settings-confirm-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h3 id="settings-confirm-title" className="font-serif text-xl text-[#2B1723]">{pending.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B564C]">{pending.message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[#E7D6CC] px-4 text-sm font-bold text-[#5A443B]">Cancel</button>
          <button type="button" onClick={onConfirm} className="min-h-11 rounded-xl bg-[#8A2334] px-4 text-sm font-bold text-white">{pending.confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}

function OrganizerTable({ entries, isOwner, onAction }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EFE2DA]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-[#FFF8F2] text-[10px] font-bold uppercase tracking-wider text-[#80685B]">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Access type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3">Added by</th>
              <th className="px-4 py-3">Last changed</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2E8E1]">
            {entries.map((entry) => (
              <tr key={entry.email}>
                <td className="px-4 py-3 font-bold text-[#2B1723]">{entry.email}</td>
                <td className="px-4 py-3 text-[#5A443B]">{entry.accessType}</td>
                <td className="px-4 py-3"><StatusPill status={entry.status} /></td>
                <td className="px-4 py-3 text-[#6B564C]">{entry.dateAdded}</td>
                <td className="px-4 py-3 text-[#6B564C]">{entry.addedBy}</td>
                <td className="px-4 py-3 text-[#6B564C]">{entry.lastChangedDate}</td>
                <td className="px-4 py-3">
                  {entry.protectedOwner ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#17623A]"><Shield className="size-4" aria-hidden="true" /> Immutable</span>
                  ) : isOwner ? (
                    <div className="flex flex-wrap gap-2">
                      {entry.status !== 'disabled' && <button type="button" onClick={() => onAction('disabled', entry)} className="rounded-lg border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#5A443B]"><UserX className="mr-1 inline size-3" aria-hidden="true" />Disable</button>}
                      {entry.status !== 'active' && <button type="button" onClick={() => onAction('active', entry)} className="rounded-lg border border-[#CFE4D7] px-3 py-2 text-xs font-bold text-[#17623A]"><RotateCcw className="mr-1 inline size-3" aria-hidden="true" />Restore</button>}
                      {entry.status !== 'removed' && <button type="button" onClick={() => onAction('removed', entry)} className="rounded-lg border border-[#F1C8C8] px-3 py-2 text-xs font-bold text-[#A32626]"><UserMinus className="mr-1 inline size-3" aria-hidden="true" />Remove</button>}
                    </div>
                  ) : <span className="text-xs font-semibold text-[#80685B]">View only</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const { user, signOut, accessControl, currentRole, currentRoleLabel, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [searchParams, setSearchParams] = useSearchParams()
  const [scannerLinkCopied, setScannerLinkCopied] = useState(false)
  const [organizerEmail, setOrganizerEmail] = useState('')
  const [staffForm, setStaffForm] = useState({ uid: '', email: '', displayName: '', defaultRole: 'scanner' })
  const [assignmentForm, setAssignmentForm] = useState({ uid: '', email: '', role: 'scanner' })
  const [staffProfiles, setStaffProfiles] = useState([])
  const [staffAssignments, setStaffAssignments] = useState([])
  const [history, setHistory] = useState([])
  const [liveAccessControl, setLiveAccessControl] = useState(null)
  const [integrationState, setIntegrationState] = useState({ integrations: DEFAULT_INTEGRATIONS })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(null)
  const tabRefs = useRef([])
  const isOwner = Boolean(access?.protectedOwner)
  const requestedTab = searchParams.get('tab') || 'account'
  const activeTab = SETTINGS_TABS.some(([id]) => id === requestedTab) ? requestedTab : 'account'
  useEffect(() => subscribeAccessControl(setLiveAccessControl, (err) => setError(err.message)), [])

  const approvedEntries = useMemo(() => listApprovedAccessEntries(liveAccessControl || accessControl || {}), [accessControl, liveAccessControl])
  const activeApprovedCount = approvedEntries.filter((entry) => !entry.protectedOwner && entry.status === 'active').length

  useEffect(() => subscribeStaffProfiles(setStaffProfiles, (err) => setError(err.message)), [])
  useEffect(() => subscribeStaffAssignments(activeEvent?.eventId, setStaffAssignments, (err) => setError(err.message)), [activeEvent?.eventId])
  useEffect(() => subscribeAccessHistory(setHistory, (err) => setError(err.message)), [])
  useEffect(() => subscribeIntegrationSettings(setIntegrationState, (err) => setError(err.message)), [])

  function clearMessages() {
    setError('')
    setNotice('')
  }

  async function run(action, success) {
    clearMessages()
    try {
      await action()
      setNotice(success)
    } catch (err) {
      setError(err?.message || 'Settings update failed.')
    }
  }

  function handleTabKeyDown(event, index) {
    const lastIndex = SETTINGS_TABS.length - 1
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = lastIndex
    if (nextIndex === null) return
    event.preventDefault()
    const [nextId] = SETTINGS_TABS[nextIndex]
    setSearchParams({ tab: nextId })
    window.requestAnimationFrame(() => tabRefs.current[nextIndex]?.focus())
  }

  async function copyScannerLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/scanner`)
      setScannerLinkCopied(true)
      window.setTimeout(() => setScannerLinkCopied(false), 1800)
    } catch {
      setScannerLinkCopied(false)
    }
  }

  function confirmOrganizerStatus(nextStatus, entry) {
    const label = nextStatus === 'active' ? 'restore' : nextStatus
    setPending({
      title: `${label[0].toUpperCase()}${label.slice(1)} organizer`,
      message: `${entry.email} will be marked ${nextStatus}. Protected Owner access cannot be changed here, and audit history will be retained.`,
      confirmLabel: nextStatus === 'removed' ? 'Remove Approval' : label[0].toUpperCase() + label.slice(1),
      onConfirm: () => run(() => changeApprovedOrganizerStatus(entry.email, user, nextStatus), `Organizer ${entry.email} marked ${nextStatus}.`),
    })
  }

  const tabPanels = {
    account: (
      <SettingsSection eyebrow="Account & Access" title="Signed-in account" description="This summary keeps app-wide organizer access separate from event-scoped staff assignments.">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <ProfileAvatar user={user} />
            <div className="min-w-0">
              <p className="break-words text-lg font-bold text-[#2B1723]">{user?.displayName || 'Gather & Savor Organizer'}</p>
              <p className="mt-1 break-words text-sm text-[#6B564C]">{user?.email || 'No email available'}</p>
              <p className="mt-2"><StatusPill status={currentRoleLabel} /></p>
            </div>
          </div>
          <div className="rounded-2xl border border-[#CFE4D7] bg-[#F2FAF5] p-4">
            <p className="text-sm font-bold text-[#174E31]">Protected Owner</p>
            <p className="mt-1 break-words text-sm text-[#315F45]">{PROTECTED_OWNER_EMAIL}</p>
            <p className="mt-2 text-xs leading-5 text-[#315F45]">This owner account is permanent. It cannot be disabled, removed, or demoted in Settings.</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#6B564C]">{roleCapabilitySummary(currentRole)}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-[10px] font-bold uppercase text-[#8A3F4B]">Active organizers</p><p className="mt-2 text-2xl font-bold text-[#2B1723]">{activeApprovedCount}</p></div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-[10px] font-bold uppercase text-[#8A3F4B]">Staff profiles</p><p className="mt-2 text-2xl font-bold text-[#2B1723]">{staffProfiles.length}</p></div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-[10px] font-bold uppercase text-[#8A3F4B]">Working event</p><p className="mt-2 break-words text-lg font-bold text-[#2B1723]">{activeEvent?.eventName || 'No event selected'}</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={signOut} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white"><LogOut className="size-4" aria-hidden="true" />Log out</button>
          <Link to="/events" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] px-5 text-sm font-bold text-[#5A443B]">Manage Events</Link>
          {user && TARGET_UIDS.includes(user.uid) && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('replay-tutorial'))} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] px-5 text-sm font-bold text-[#5A443B]">Show Welcome Tour Again</button>}
        </div>
      </SettingsSection>
    ),
    organizers: (
      <SettingsSection eyebrow="Approved Organizers" title="App-wide organizer access" description="These accounts can use the organizer workspace. Approved organizers can view the list; only the Protected Owner can change it.">
        {isOwner && (
          <form className="mb-5 grid gap-3 rounded-2xl border border-[#EFE2DA] bg-[#FFFDFB] p-4 md:grid-cols-[minmax(16rem,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); run(() => addApprovedOrganizer(organizerEmail, user), `Organizer ${normalizeAccessEmail(organizerEmail)} added.`).then(() => setOrganizerEmail('')) }}>
            <Field id="organizer-email" label="Organizer email">
              <TextInput id="organizer-email" name="organizerEmail" type="email" autoComplete="email" value={organizerEmail} onChange={(event) => setOrganizerEmail(event.target.value)} placeholder="name@example.com" required />
            </Field>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white"><Plus className="size-4" aria-hidden="true" />Add Organizer</button>
          </form>
        )}
        <OrganizerTable entries={approvedEntries} isOwner={isOwner} onAction={confirmOrganizerStatus} />
      </SettingsSection>
    ),
    staff: (
      <SettingsSection eyebrow="Staff & Event Assignments" title="Event staff access" description="Staff profiles are not approved organizers. Assignments are limited to the selected event and the role chosen here.">
        <div className="grid gap-5 xl:grid-cols-2">
          <form className="rounded-2xl border border-[#EFE2DA] p-4" onSubmit={(event) => { event.preventDefault(); run(() => saveStaffProfile(staffForm, user), 'Staff profile saved.') }}>
            <h3 className="text-sm font-bold text-[#2B1723]">Create or edit staff profile</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field id="staff-uid" label="Staff account ID"><TextInput id="staff-uid" name="staffUid" value={staffForm.uid} onChange={(event) => setStaffForm({ ...staffForm, uid: event.target.value })} required /></Field>
              <Field id="staff-email" label="Email"><TextInput id="staff-email" name="staffEmail" type="email" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} required /></Field>
              <Field id="staff-name" label="Display name"><TextInput id="staff-name" name="staffName" value={staffForm.displayName} onChange={(event) => setStaffForm({ ...staffForm, displayName: event.target.value })} /></Field>
              <Field id="staff-role" label="Default role"><SelectInput id="staff-role" name="staffRole" value={staffForm.defaultRole} onChange={(event) => setStaffForm({ ...staffForm, defaultRole: event.target.value })}>{STAFF_ROLE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</SelectInput></Field>
            </div>
            <button type="submit" className="mt-4 min-h-11 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Save Staff Profile</button>
          </form>
          <form className="rounded-2xl border border-[#EFE2DA] p-4" onSubmit={(event) => { event.preventDefault(); run(() => saveStaffAssignment({ ...assignmentForm, eventId: activeEvent?.eventId }, user), 'Staff assignment saved.') }}>
            <h3 className="text-sm font-bold text-[#2B1723]">Assign to working event</h3>
            <p className="mt-1 text-xs leading-5 text-[#6B564C]">{activeEvent?.eventName || 'Select a working event first.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field id="assignment-uid" label="Staff account ID"><TextInput id="assignment-uid" name="assignmentUid" value={assignmentForm.uid} onChange={(event) => setAssignmentForm({ ...assignmentForm, uid: event.target.value })} required /></Field>
              <Field id="assignment-email" label="Email"><TextInput id="assignment-email" name="assignmentEmail" type="email" value={assignmentForm.email} onChange={(event) => setAssignmentForm({ ...assignmentForm, email: event.target.value })} required /></Field>
              <Field id="assignment-role" label="Event role"><SelectInput id="assignment-role" name="assignmentRole" value={assignmentForm.role} onChange={(event) => setAssignmentForm({ ...assignmentForm, role: event.target.value })}>{STAFF_ROLE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</SelectInput></Field>
            </div>
            <button type="submit" className="mt-4 min-h-11 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Save Assignment</button>
          </form>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border border-[#EFE2DA]">
            <h3 className="bg-[#FFF8F2] px-4 py-3 text-sm font-bold text-[#2B1723]">Staff profiles</h3>
            <div className="divide-y divide-[#F2E8E1]">{staffProfiles.map((profile) => <div key={profile.uid} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-[#2B1723]">{profile.email}</p><p className="text-xs text-[#6B564C]">{profile.uid} · {roleLabel(profile.defaultRole)}</p></div><div className="flex gap-2"><StatusPill status={profile.status} /><button type="button" onClick={() => run(() => setStaffProfileStatus(profile, user, profile.status === 'active' ? 'inactive' : 'active'), 'Staff profile status changed.')} className="rounded-lg border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#5A443B]">{profile.status === 'active' ? 'Disable' : 'Enable'}</button></div></div>)}</div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#EFE2DA]">
            <h3 className="bg-[#FFF8F2] px-4 py-3 text-sm font-bold text-[#2B1723]">Assignments for working event</h3>
            <div className="divide-y divide-[#F2E8E1]">{staffAssignments.map((assignment) => <div key={assignment.uid} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"><div><p className="font-bold text-[#2B1723]">{assignment.email}</p><p className="text-xs text-[#6B564C]">{roleLabel(assignment.role)} · {assignment.eventId}</p></div><div className="flex gap-2"><StatusPill status={assignment.status} /><button type="button" onClick={() => run(() => saveStaffAssignment({ ...assignment, status: 'revoked' }, user), 'Staff assignment removed.')} className="rounded-lg border border-[#F1C8C8] px-3 py-2 text-xs font-bold text-[#A32626]">Remove</button></div></div>)}</div>
          </div>
        </div>
      </SettingsSection>
    ),
    integrations: (
      <SettingsSection eyebrow="Integrations" title="Connection settings" description="These statuses show what is ready to use. Private credentials are not shown in Settings.">
        <div className="mb-4 rounded-2xl border border-[#EFE2DA] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#5A443B]">Payment records are tracked manually. No online payment gateway is connected, and registration payments remain separate from Operations.</div>
        <div className="grid gap-3 lg:grid-cols-2">
          {Object.entries(integrationState.integrations || DEFAULT_INTEGRATIONS).map(([id, item]) => (
            <article key={id} className="rounded-2xl border border-[#EFE2DA] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><p className="font-bold text-[#2B1723]">{item.name}</p><StatusPill status={item.status} /></div>
              <p className="mt-2 text-xs leading-5 text-[#6B564C]">{item.setupRequirements}</p>
              {item.connectionError && <p className="mt-2 text-xs font-semibold leading-5 text-[#A32626]">{item.connectionError}</p>}
              <dl className="mt-3 grid gap-2 text-xs text-[#6B564C] sm:grid-cols-2">
                <div><dt className="font-bold text-[#5A443B]">Last checked</dt><dd>{formatDate(item.lastCheckedAt)}</dd></div>
                <div><dt className="font-bold text-[#5A443B]">Changed by</dt><dd>{item.lastChangedBy || 'Not recorded'}</dd></div>
              </dl>
              {isOwner && <button type="button" onClick={() => run(() => recordIntegrationCheck(id, user, { status: item.status, connectionError: item.connectionError }), `${item.name} status checked.`)} className="mt-4 min-h-10 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#5A443B]">Test Connection</button>}
            </article>
          ))}
        </div>
      </SettingsSection>
    ),
    history: (
      <SettingsSection eyebrow="Access History" title="Access changes" description="Organizer access changes are retained for review. Routine event data is not shown here.">
        <div className="overflow-hidden rounded-2xl border border-[#EFE2DA]">
          <div className="divide-y divide-[#F2E8E1]">{history.length ? history.slice(0, 50).map((item) => <div key={item.id} className="grid gap-2 p-4 md:grid-cols-[1fr_12rem_12rem]"><div><p className="font-bold text-[#2B1723]">{item.targetEmail || item.integrationId || item.uid}</p><p className="text-xs text-[#6B564C]">{item.action} · {item.status}</p></div><p className="text-xs text-[#6B564C]">{formatDate(item.changedAt)}</p><p className="text-xs text-[#6B564C]">{item.changedBy || 'Not recorded'}</p></div>) : <p className="p-4 text-sm text-[#6B564C]">No access history records are available yet.</p>}</div>
        </div>
      </SettingsSection>
    ),
    advanced: (
      <SettingsSection eyebrow="Advanced" title="Technical settings" description="Read-only technical information and administrator-only paths are separated from routine settings. No credentials or private attendee data are shown.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-sm font-bold text-[#2B1723]">Firebase</p><p className="mt-1 text-sm text-[#6B564C]">{isFirebaseConfigured ? 'Configured' : 'Needs attention'} · {firebaseProjectId || 'Project set during release'}</p></div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-sm font-bold text-[#2B1723]">Defaults</p><p className="mt-1 text-sm text-[#6B564C]">America/Halifax · BBD · {formatPaymentMethod(DEFAULT_FINANCE_SETTINGS.defaultPaymentMethod)}</p></div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-sm font-bold text-[#2B1723]">QR format</p><p className="mt-1 text-sm text-[#6B564C]">Ticket code only. No attendee PII in QR codes.</p></div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4"><p className="text-sm font-bold text-[#2B1723]">Scanner</p><div className="mt-2 flex flex-wrap gap-2"><Link to="/scanner" className="inline-flex min-h-10 items-center rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white">Open Scanner Mode</Link><button type="button" onClick={copyScannerLink} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#5A443B]">{scannerLinkCopied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{scannerLinkCopied ? 'Copied' : 'Copy Scanner Link'}</button></div></div>
        </div>
        <Link to="/qa" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Open System QA</Link>
      </SettingsSection>
    ),
  }

  return (
    <div data-tour-id="settings-workspace" className="min-w-0 space-y-5">
      {(notice || error) && <div role="status" className={`rounded-2xl border p-4 text-sm font-semibold ${error ? 'border-[#F1C8C8] bg-[#FFF1F1] text-[#A32626]' : 'border-[#CFE4D7] bg-[#F2FAF5] text-[#17623A]'}`}>{error || notice}</div>}
      <section className="rounded-[20px] border border-[#EEDFD6] bg-white p-3 shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Settings categories">
          {SETTINGS_TABS.map(([id, label], index) => (
            <button key={id} ref={(element) => { tabRefs.current[index] = element }} id={`settings-tab-${id}`} type="button" role="tab" tabIndex={activeTab === id ? 0 : -1} aria-selected={activeTab === id} aria-controls={`settings-panel-${id}`} onClick={() => setSearchParams({ tab: id })} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#9A5260]/30 ${activeTab === id ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#5A443B] hover:bg-[#EFE2DA]'}`}>{label}</button>
          ))}
        </div>
      </section>
      <div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`} tabIndex="0">{tabPanels[activeTab]}</div>
      <ConfirmDialog pending={pending} onCancel={() => setPending(null)} onConfirm={() => { const action = pending?.onConfirm; setPending(null); void action?.() }} />
    </div>
  )
}
