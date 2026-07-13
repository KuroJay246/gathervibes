import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { DEFAULT_FINANCE_SETTINGS, formatPaymentMethod } from '../utils/financeUtils'
import { ACCESS_ROLES, ROLE_ORDER, listApprovedAccessEntries, roleCapabilitySummary } from '../utils/accessRoles'

const SETTINGS_TABS = [
  ['profile', 'Profile'],
  ['workspace', 'Workspace'],
  ['events', 'Events & Defaults'],
  ['access', 'Access Summary'],
  ['scanner', 'Scanner & Tickets'],
  ['imports', 'Imports'],
  ['finance', 'Finance & Operations'],
  ['messages', 'Message Builder'],
  ['security', 'Security'],
]

function SettingsSection({ eyebrow, title, children }) {
  return (
    <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F2E8E1] py-3 last:border-b-0">
      <span className="text-sm font-semibold text-[#6B564C]">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-bold text-[#2B1723]">{value || 'Not set'}</span>
    </div>
  )
}

function ProfileAvatar({ user }) {
  if (user?.photoURL) return <img src={user.photoURL} alt="" className="size-16 rounded-full object-cover" referrerPolicy="no-referrer" />
  return <div className="grid size-16 place-items-center rounded-full bg-[#F7DDE6] text-xl font-bold uppercase text-[#2B1723]">{user?.displayName?.slice(0, 1) || user?.email?.slice(0, 1) || 'A'}</div>
}

function Pill({ children, tone = 'plain' }) {
  const className = tone === 'warning' ? 'bg-[#FFF4DF] text-[#986F26]' : tone === 'success' ? 'bg-[#EAF6EF] text-[#2F855A]' : 'bg-[#F7F1ED] text-[#6B564C]'
  return <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${className}`}>{children}</span>
}

export function SettingsPage() {
  const { user, signOut, accessControl, currentRole, currentRoleLabel } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [searchParams, setSearchParams] = useSearchParams()
  const approvedEntries = listApprovedAccessEntries(accessControl || {})
  const rolesConfigured = Boolean(accessControl?.rolesByEmail && Object.keys(accessControl.rolesByEmail).length > 0)
  const requestedTab = searchParams.get('tab') || 'profile'
  const activeTab = SETTINGS_TABS.some(([id]) => id === requestedTab) ? requestedTab : 'profile'

  const tabPanels = useMemo(() => ({
    profile: (
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <SettingsSection eyebrow="My Profile" title="Signed-in account">
          <div className="flex items-center gap-4">
            <ProfileAvatar user={user} />
            <div className="min-w-0">
              <p className="break-words text-lg font-bold text-[#2B1723]">{user?.displayName || 'Gather & Savor Admin'}</p>
              <p className="mt-1 break-words text-sm text-[#816D62]">{user?.email || 'No email available'}</p>
              <p className="mt-2 inline-flex rounded-full bg-[#EAF6EF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2F855A]">{currentRoleLabel}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-[#EFE2DA] p-4">
            <InfoRow label="Auth provider" value={user?.providerData?.[0]?.providerId || 'Firebase Auth'} />
            <InfoRow label="Role label" value={currentRoleLabel} />
            <InfoRow label="Role source" value={rolesConfigured ? 'rolesByEmail' : 'approvedEmails fallback'} />
          </div>
          <button type="button" onClick={signOut} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white">
            <LogOut className="size-4" />
            Log out
          </button>
        </SettingsSection>
        <SettingsSection eyebrow="Connection" title="Workspace connection">
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <InfoRow label="Firebase project" value={firebaseProjectId || 'Configured at build time'} />
            <InfoRow label="Firebase config" value={isFirebaseConfigured ? 'Loaded' : 'Missing'} />
            <InfoRow label="App access" value="Private approved-account workspace" />
          </div>
        </SettingsSection>
      </div>
    ),
    workspace: (
      <SettingsSection eyebrow="Workspace" title="Working Event context">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="App name" value="Gather & Savor Event Hub" />
          <InfoRow label="Organization" value="Gather & Savor Vibes" />
          <InfoRow label="Current Working Event" value={activeEvent?.eventName || 'No event selected'} />
          <InfoRow label="Event scoping" value="Registrations, tickets, check-in, messages, operations, and reports use the selected event." />
        </div>
      </SettingsSection>
    ),
    events: (
      <SettingsSection eyebrow="Events & Defaults" title="Current defaults">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Default timezone" value="America/Halifax" />
          <InfoRow label="Default currency" value="BBD fallback" />
          <InfoRow label="Default ticket prefix" value="GSV fallback" />
          <InfoRow label="Price tiers fallback" value="No tiers until configured on the event" />
          <InfoRow label="Default payment method" value={formatPaymentMethod(DEFAULT_FINANCE_SETTINGS.defaultPaymentMethod)} />
        </div>
      </SettingsSection>
    ),
    access: (
      <SettingsSection eyebrow="Access Summary" title="Approved accounts and staff boundaries">
        <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
          Approved admin access is controlled by <code>settings/accessControl.approvedEmails</code>. Staff and scanner helpers are not added to that allowlist as a shortcut.
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Pill tone="success">Approved admin allowlist active</Pill>
          <Pill>Access request actions disabled</Pill>
          <Pill>Role editing is not exposed</Pill>
          <Pill>Staff profile editing disabled</Pill>
          <Pill>Assignment editing disabled</Pill>
          <Pill tone="warning">Lead scanner disabled</Pill>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-[#EFE2DA]">
          {approvedEntries.length === 0 ? (
            <p className="p-4 text-sm text-[#816D62]">No approved emails were loaded.</p>
          ) : approvedEntries.map((entry) => (
            <div key={entry.email} className="flex flex-col gap-1 border-b border-[#F2E8E1] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-all text-sm font-bold text-[#2B1723]">{entry.email}</p>
              <span className="w-fit rounded-full bg-[#F7F1ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{ACCESS_ROLES[entry.role]?.label || 'Admin'}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ROLE_ORDER.map((roleId) => (
            <div key={roleId} className="rounded-2xl border border-[#EFE2DA] p-4">
              <p className="text-sm font-bold text-[#2B1723]">{ACCESS_ROLES[roleId].label}</p>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">{ACCESS_ROLES[roleId].summary}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-[#816D62]">{roleCapabilitySummary(currentRole)}</p>
      </SettingsSection>
    ),
    scanner: (
      <SettingsSection eyebrow="Scanner & Tickets" title="Event-day access settings">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/scanner" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E7345] px-4 text-xs font-bold text-white hover:bg-[#17623A]">Open Scanner Mode</Link>
          <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/scanner`)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]">Copy Scanner Link</button>
        </div>
        <div className="mt-5 rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Scanner route" value="/scanner" />
          <InfoRow label="QR payload" value="GSV:TICKET:{ticketCode}" />
          <InfoRow label="Scanner check-in" value="Requires explicit Check In tap" />
          <InfoRow label="Scanner undo/check-out" value="Disabled for normal scanner use" />
          <InfoRow label="Admin correction" value="Admin-only audited Undo Check-In where implemented" />
        </div>
      </SettingsSection>
    ),
    imports: (
      <SettingsSection eyebrow="Imports" title="Preview-first data import">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="CSV import" value="Active, preview before write" />
          <InfoRow label="XLSX import" value="Active with read-excel-file/browser" />
          <InfoRow label="SheetJS xlsx" value="Absent" />
          <InfoRow label="Google Sheets connection" value="Manual export/import only" />
        </div>
      </SettingsSection>
    ),
    finance: (
      <SettingsSection eyebrow="Finance & Operations" title="Financial boundaries">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Registration payments" value="Guest-facing payment fields on registration records" />
          <InfoRow label="Operations Ledger" value="Sponsor income, vendor or supplier payments, expenses, refunds, reimbursements, and adjustments" />
          <InfoRow label="Payment processing" value="No payment gateway is connected" />
        </div>
      </SettingsSection>
    ),
    messages: (
      <SettingsSection eyebrow="Message Builder" title="Copy-only messaging">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Message creation" value="Templates, segments, editable draft, and copy packet" />
          <InfoRow label="Automatic sending" value="Disabled" />
          <InfoRow label="Prompt helper" value="Copies a drafting prompt only" />
          <InfoRow label="Delivery tracking" value="No delivery status is tracked" />
        </div>
      </SettingsSection>
    ),
    security: (
      <SettingsSection eyebrow="Security" title="Private admin protections">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Public access" value="No public attendee, vendor, or payment portal" />
          <InfoRow label="Search indexing" value="Blocked by robots and private-app headers" />
          <InfoRow label="Service worker" value="Lifecycle-only; no private-data fetch caching" />
          <InfoRow label="Destructive actions" value="No CPB reset, audit-log deletion, or external sending controls here" />
        </div>
      </SettingsSection>
    ),
  }), [activeEvent?.eventName, approvedEntries, currentRole, currentRoleLabel, rolesConfigured, signOut, user])

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-4 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-5">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Settings categories">
          {SETTINGS_TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`settings-panel-${id}`}
              onClick={() => setSearchParams({ tab: id })}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-[#B76E79]/30 ${activeTab === id ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C] hover:bg-[#EFE2DA]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      <div id={`settings-panel-${activeTab}`} role="tabpanel">
        {tabPanels[activeTab]}
      </div>
    </div>
  )
}
