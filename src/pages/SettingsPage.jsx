import { useMemo, useRef, useState } from 'react'
import { Check, Copy, LogOut } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { DEFAULT_FINANCE_SETTINGS, formatPaymentMethod } from '../utils/financeUtils'
import { ACCESS_ROLES, listApprovedAccessEntries, roleCapabilitySummary } from '../utils/accessRoles'
import { PROTECTED_OWNER_EMAIL } from '../config/protectedOwner'
import { TARGET_UIDS } from '../tutorial/tutorialSteps'

const SETTINGS_TABS = [
  ['account', 'Account'],
  ['workspace', 'Workspace'],
  ['defaults', 'Event Defaults'],
  ['access', 'Organizer Access'],
  ['help', 'Tutorial & Help'],
  ['integrations', 'Integrations'],
  ['event-day', 'Tickets & Check-In'],
  ['data', 'Data & Messages'],
  ['advanced', 'Advanced'],
]

const INTEGRATION_ROWS = [
  {
    label: 'Google Forms receiver',
    status: 'Packaged but Not Deployed',
    description: 'The signed receiver package exists, but production intake still uses manual Response Inbox review unless the receiver is separately deployed and configured.',
    action: 'No organizer action required for normal manual intake.',
  },
  {
    label: 'Google Sheets',
    status: 'Manual Workflow',
    description: 'Download a Sheet as CSV or Excel, then upload the downloaded file in Import Center.',
    action: 'No live Google Sheets sync or OAuth connection is active.',
  },
  {
    label: 'Gmail',
    status: 'Disconnected',
    description: 'Message Builder prepares text only and does not send email.',
    action: 'Use your normal email tool after copying message text.',
  },
  {
    label: 'Message Builder',
    status: 'Manual Workflow',
    description: 'Create, preview, and copy messages for external sending.',
    action: 'No delivery status is tracked in the app.',
  },
  {
    label: 'PDF',
    status: 'Text-table fallback only',
    description: 'Readable text-based PDF tables may be used where supported.',
    action: 'Scanned PDFs and OCR are not supported.',
  },
  {
    label: 'Online payments',
    status: 'Not Connected',
    description: 'Registration payment records are tracked manually inside the event workspace.',
    action: 'No payment gateway is connected.',
  },
]

const ROLE_SUMMARY_ROWS = [
  ['Protected Owner', ACCESS_ROLES['owner-admin'].summary],
  ['Approved Organizer', ACCESS_ROLES.admin.summary],
  ['Event Manager', ACCESS_ROLES['event-manager'].summary],
  ['Viewer', ACCESS_ROLES.viewer.summary],
  ['Scanner', ACCESS_ROLES.scanner.summary],
  ['Operations Helper', ACCESS_ROLES['operations-helper'].summary],
]

function SettingsSection({ eyebrow, title, description, children }) {
  return (
    <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B564C]">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function SettingRow({ label, value, description, scope, timing = 'Active now' }) {
  return (
    <div className="grid gap-2 border-b border-[#F2E8E1] py-4 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(10rem,0.65fr)_minmax(14rem,1fr)] md:gap-6">
      <div>
        <p className="text-sm font-bold text-[#2B1723]">{label}</p>
        {scope && <p className="mt-1 text-xs font-semibold text-[#7A655A]">{scope}</p>}
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-bold text-[#2B1723]">{value || 'Not set'}</p>
        {description && <p className="mt-1 text-xs leading-5 text-[#6B564C]">{description}</p>}
        <span className="mt-2 inline-flex rounded-full bg-[#EAF6EF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#17623A]">{timing}</span>
      </div>
    </div>
  )
}

function MetricTile({ label, value, description }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#EFE2DA] bg-[#FFFDFB] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A3F4B]">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#6B564C]">{description}</p>
    </div>
  )
}

function StatusPill({ children }) {
  return (
    <span className="inline-flex rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase text-[#5A443B]">
      {children}
    </span>
  )
}

function ProfileAvatar({ user }) {
  if (user?.photoURL) return <img src={user.photoURL} alt="" className="size-16 rounded-full object-cover" referrerPolicy="no-referrer" />
  return <div className="grid size-16 place-items-center rounded-full bg-[#F7DDE6] text-xl font-bold uppercase text-[#2B1723]">{user?.displayName?.slice(0, 1) || user?.email?.slice(0, 1) || 'A'}</div>
}

export function SettingsPage() {
  const { user, signOut, accessControl, currentRole, currentRoleLabel } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [searchParams, setSearchParams] = useSearchParams()
  const [scannerLinkCopied, setScannerLinkCopied] = useState(false)
  const tabRefs = useRef([])
  const approvedEntries = listApprovedAccessEntries(accessControl || {})
  const secondaryOrganizerCount = approvedEntries.filter((entry) => !entry.protectedOwner).length
  const protectedOwnerCount = approvedEntries.some((entry) => entry.protectedOwner) ? 1 : 0
  const approvedOrganizerCount = approvedEntries.filter((entry) => !entry.protectedOwner).length
  const staffProfileCount = 'Managed in staffProfiles'
  const eventAssignmentCount = 'Managed per event'
  const requestedTab = searchParams.get('tab') || 'account'
  const activeTab = SETTINGS_TABS.some(([id]) => id === requestedTab) ? requestedTab : 'account'

  async function copyScannerLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/scanner`)
      setScannerLinkCopied(true)
      window.setTimeout(() => setScannerLinkCopied(false), 1800)
    } catch {
      setScannerLinkCopied(false)
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

  const tabPanels = useMemo(() => ({
    account: (
      <SettingsSection
        eyebrow="Account"
        title="Your organizer account"
        description="Review the account and access level currently signed in to this private workspace."
      >
        <div className="flex items-center gap-4">
          <ProfileAvatar user={user} />
          <div className="min-w-0">
            <p className="break-words text-lg font-bold text-[#2B1723]">{user?.displayName || 'Gather & Savor Organizer'}</p>
            <p className="mt-1 break-words text-sm text-[#6B564C]">{user?.email || 'No email available'}</p>
            <p className="mt-2 inline-flex rounded-full bg-[#EAF6EF] px-3 py-1 text-[10px] font-bold uppercase text-[#17623A]">{currentRoleLabel}</p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[#6B564C]">{roleCapabilitySummary(currentRole)}</p>
        <button type="button" onClick={signOut} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </button>
        {user && TARGET_UIDS.includes(user.uid) && (
          <div className="mt-8 border-t border-[#F2E8E1] pt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B] mb-3">Welcome Experience</p>
            <button 
              type="button" 
              onClick={() => window.dispatchEvent(new CustomEvent('replay-tutorial'))}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] bg-white px-5 text-sm font-bold text-[#5A443B] transition hover:bg-[#FBF8F5]"
            >
              Show Welcome Tour Again
            </button>
          </div>
        )}
      </SettingsSection>
    ),
    workspace: (
      <SettingsSection
        eyebrow="Workspace"
        title="Current working event"
        description="The selected event controls which registrations, payments, tickets, attendance, operations, messages, and reports you see."
      >
        <div className="rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Selected event" value={activeEvent?.eventName || 'No event selected'} scope="Event-specific" description="Change the working event from the event selector before editing event data." />
          <SettingRow label="Workspace" value="Gather & Savor Event Hub" scope="App-wide" description="A private organizer workspace for Gather & Savor Vibes events." />
        </div>
        <Link to="/events" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Manage Events</Link>
      </SettingsSection>
    ),
    defaults: (
      <SettingsSection
        eyebrow="Event Defaults"
        title="Defaults used when event values are missing"
        description="These fallbacks apply automatically. Event-specific values take priority when they are configured."
      >
        <div className="rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Timezone" value="America/Halifax" scope="App-wide fallback" description="Used to interpret event dates and event-day activity." />
          <SettingRow label="Currency" value="BBD" scope="App-wide fallback" description="Used for organizer-facing financial totals when an event has no currency value." />
          <SettingRow label="Ticket prefix" value="GSV" scope="App-wide fallback" description="Used when generating a ticket code for an event without its own prefix." />
          <SettingRow label="Price tiers" value="No fallback tiers" scope="Event-specific" description="Configure ticket tiers on the event before using tier-based prices." timing="Configured per event" />
          <SettingRow label="Default payment method" value={formatPaymentMethod(DEFAULT_FINANCE_SETTINGS.defaultPaymentMethod)} scope="Registration finance" description="Used only when a payment method has not been selected for a new record." />
        </div>
      </SettingsSection>
    ),
    access: (
      <SettingsSection
        eyebrow="Organizer Access"
        title="Account and access summary"
        description="Protected owner and approved organizers remain separate from staff profiles and event assignments. Access is controlled outside this page. This page cannot add, remove, disable, or change anyone's role."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Protected Owner" value={protectedOwnerCount} description="Pinned by verified Firebase UID, not by mutable organizer settings." />
          <MetricTile label="Approved Organizers" value={approvedOrganizerCount} description="Accounts listed in approved organizer access, excluding the protected owner." />
          <MetricTile label="Staff Profiles" value={staffProfileCount} description="Active staff sign in through staffProfiles and do not become approved organizers." />
          <MetricTile label="Event Assignments" value={eventAssignmentCount} description="Staff permissions are assigned per event and role." />
        </div>
        <div className="mt-5 rounded-2xl border border-[#CFE4D7] bg-[#F2FAF5] p-5">
          <p className="text-sm font-bold text-[#174E31]">Protected Owner</p>
          <p className="mt-1 break-words text-sm text-[#315F45]">{PROTECTED_OWNER_EMAIL}</p>
          <p className="mt-3 text-xs leading-5 text-[#315F45]">Permanent owner access is pinned to the verified Firebase account and cannot be removed or disabled in organizer settings.</p>
        </div>
        <div className="mt-4 rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Approved organizer records" value={`${secondaryOrganizerCount} secondary approved organizers`} scope="App-wide" description="Secondary organizers are approved accounts that remain separate from staff profile count and event assignment count." />
          <SettingRow label="Staff profiles" value="Assigned-event access only" scope="Staff profile source" description="Staff profiles identify helpers such as scanners, event managers, viewers, and Operations helpers." />
          <SettingRow label="Event assignments" value="Per-event roles" scope="Event assignment source" description="Assignments connect a staff profile to one event and one role. Helper access does not grant Settings or full organizer access." />
          <SettingRow label="Access changes" value="Managed by a release administrator" scope="App-wide" description="Contact the protected owner when an organizer or staff assignment must change." timing="No editable control here" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {ROLE_SUMMARY_ROWS.map(([label, summary]) => (
            <article key={label} className="rounded-2xl border border-[#EFE2DA] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-[#2B1723]">{label}</p>
                <StatusPill>Role</StatusPill>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6B564C]">{summary}</p>
            </article>
          ))}
        </div>
      </SettingsSection>
    ),
    help: (
      <SettingsSection
        eyebrow="Tutorial and Help"
        title="Replay guided help"
        description="Use this area when an organizer needs the current product walkthrough again. The tutorial teaches the current app and does not create business records."
      >
        <div className="rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Guided tutorial" value={user && TARGET_UIDS.includes(user.uid) ? 'Available for this account' : 'Available to approved tutorial accounts'} scope="Onboarding" description="Replay starts the Tutorial V3 walkthrough from the beginning without deleting event data." timing="Manual replay" />
          <SettingRow label="Safe practice" value="No business writes required" scope="Tutorial" description="Write-heavy lessons demonstrate where controls live and do not require creating payments, tickets, imports, check-ins, or Operations entries." />
        </div>
        {user && TARGET_UIDS.includes(user.uid) ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('replay-tutorial'))}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white"
          >
            Show Welcome Tour Again
          </button>
        ) : (
          <p className="mt-5 rounded-2xl border border-[#EFE2DA] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#6B564C]">This signed-in account is not configured for the guided tutorial replay control.</p>
        )}
      </SettingsSection>
    ),
    integrations: (
      <SettingsSection
        eyebrow="Integrations"
        title="Connection status"
        description="These statuses describe what currently works. Disconnected optional integrations are not setup errors unless you choose to add them later."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {INTEGRATION_ROWS.map((item) => (
            <article key={item.label} className="min-w-0 rounded-2xl border border-[#EFE2DA] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                <StatusPill>{item.status}</StatusPill>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6B564C]">{item.description}</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#5A443B]">{item.action}</p>
            </article>
          ))}
        </div>
      </SettingsSection>
    ),
    'event-day': (
      <SettingsSection
        eyebrow="Tickets & Check-In"
        title="Event-day behavior"
        description="Ticket and attendance controls use the selected event and preserve an audit trail."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/scanner" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E7345] px-4 text-xs font-bold text-white hover:bg-[#17623A]">Open Scanner Mode</Link>
          <button type="button" onClick={copyScannerLink} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#5A443B] hover:bg-[#FBF8F5]">
            {scannerLinkCopied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {scannerLinkCopied ? 'Scanner Link Copied' : 'Copy Scanner Link'}
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Ticket QR format" value="Ticket code only" scope="App-wide" description="QR codes do not contain names, email addresses, phone numbers, or payment details." />
          <SettingRow label="Scanner check-in" value="Requires a deliberate Check In action" scope="Event-specific" description="Scanning a valid ticket does not silently record attendance." />
          <SettingRow label="Undo check-in" value="Organizer-only audited correction" scope="Event-specific" description="Normal scanner users cannot undo attendance or check guests out." />
        </div>
      </SettingsSection>
    ),
    data: (
      <SettingsSection
        eyebrow="Data & Messages"
        title="Imports, finance, and communications"
        description="These workflows remain separate so one action cannot silently change another part of the event record."
      >
        <div className="rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Guest imports" value="CSV, Excel, or pasted table" scope="Selected event" description="Every import requires column matching, validation, and a preview before records are saved." />
          <SettingRow label="Registration payments" value="Managed in Payments" scope="Selected event" description="Guest charges and received amounts remain separate from event expenses and commitments." />
          <SettingRow label="Operations" value="Managed in Operations" scope="Selected event" description="Expenses, commitments, and in-kind support do not enter registration-payment totals." />
          <SettingRow label="Message Builder" value="Draft and copy only" scope="Selected event" description="The app does not automatically send email, WhatsApp, or text messages." />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/imports" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Open Import Center</Link>
          <Link to="/communications" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] bg-white px-5 text-sm font-bold text-[#5A443B]">Open Message Builder</Link>
        </div>
      </SettingsSection>
    ),
    advanced: (
      <SettingsSection
        eyebrow="Advanced"
        title="Advanced and administration"
        description="Read-only technical information and administrator-only paths are separated from routine settings. No credentials or private attendee data are shown."
      >
        <div className="rounded-2xl border border-[#EFE2DA] p-4 sm:p-5">
          <SettingRow label="Application connection" value={isFirebaseConfigured ? 'Configured' : 'Needs attention'} scope="App-wide" description="The organizer workspace can load its Firebase configuration." timing={isFirebaseConfigured ? 'Active now' : 'Not active'} />
          <SettingRow label="Project" value={firebaseProjectId || 'Configured during release'} scope="Release setting" description="Identifies the Firebase project used by this build." />
          <SettingRow label="Public access" value="Disabled" scope="App-wide" description="There is no public attendee, vendor, or payment portal." />
          <SettingRow label="Search indexing" value="Blocked" scope="App-wide" description="Private organizer pages are not intended for search engines." />
          <SettingRow label="Offline data caching" value="Disabled" scope="App-wide" description="Private event responses are not stored by the service worker." />
        </div>
        <div className="mt-5 rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4">
          <p className="text-sm font-bold text-[#5F4A2A]">Administrative caution</p>
          <p className="mt-2 text-xs leading-5 text-[#715D46]">No destructive Settings control is exposed here. Event deletes, bulk registration actions, imports, check-ins, and Operations changes remain in their own workflows with confirmations and audit logs.</p>
        </div>
        <Link to="/qa" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">Open System QA</Link>
      </SettingsSection>
    ),
  }), [activeEvent?.eventName, approvedOrganizerCount, currentRole, currentRoleLabel, protectedOwnerCount, scannerLinkCopied, secondaryOrganizerCount, signOut, user])

  return (
    <div data-tour-id="settings-workspace" className="min-w-0 space-y-6">
      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-4 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-5">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Settings categories">
          {SETTINGS_TABS.map(([id, label], index) => (
            <button
              key={id}
              ref={(element) => { tabRefs.current[index] = element }}
              id={`settings-tab-${id}`}
              type="button"
              role="tab"
              tabIndex={activeTab === id ? 0 : -1}
              aria-selected={activeTab === id}
              aria-controls={`settings-panel-${id}`}
              onClick={() => setSearchParams({ tab: id })}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#9A5260]/30 ${activeTab === id ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#5A443B] hover:bg-[#EFE2DA]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <div id={`settings-panel-${activeTab}`} role="tabpanel" aria-labelledby={`settings-tab-${activeTab}`} tabIndex="0">
        {tabPanels[activeTab]}
      </div>
    </div>
  )
}
