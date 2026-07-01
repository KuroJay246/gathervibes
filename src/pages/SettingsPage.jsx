import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Database, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { SystemHealthPanel } from '../components/SystemHealthPanel'
import { DEFAULT_FINANCE_SETTINGS, formatPaymentMethod } from '../utils/financeUtils'
import { ACCESS_ROLES, ROLE_ORDER, listApprovedAccessEntries, roleCapabilitySummary } from '../utils/accessRoles'

const ROADMAP_SECTIONS = [
  { title: '1. Closed / shipped phases', items: [
    ['Phase 14B CPB Payment Audit UI Cleanup / Operations Review Fixes', 'Closed'],
    ['Phase 15A Hosting Security Headers + Private Indexing', 'Closed'],
    ['Phase 15B XLSX Dependency Security Review + Roadmap/Access/Ops Update', 'Closed / merged / deployed'],
    ['Phase 16 Live Browser Loading Diagnostics + Ticket/Check-In QA Hardening', 'Closed / merged / deployed'],
    ['Phase 17A Visibility, Counts, Backlog Reorganization, and Staff Access Planning', 'Closed / merged / deployed'],
    ['Phase 17B Staff / Worker Roles Foundation', 'Closed / merged / Hosting-deployed'],
    ['Phase 17C-A Firestore Rules Review + Deployment Readiness', 'Closed / merged / Hosting-deployed / rules not deployed'],
    ['Finance tracker', 'Phase 9 active'],
    ['Communications Pro', 'Phase 11 copy-only'],
    ['Phase 13A AI Draft Lab', 'Complete / draft-only'],
  ] },
  { title: '2. Current active phase', items: [['Phase 17D-A Access & Roles Planning + Scanner Day-of Polish Blueprint', 'Closed / merged-ready / blueprint approved / no access broadening / no live workflow changes']] },
  { title: '3. Next recommended phase', items: [['Phase 17D-B scanner day-of polish', 'Recommended next subphase / scanner polish only'], ['Phase 17D-C Access & Roles read-only/admin UI foundation', 'Later follow-on phase']] },
  { title: '4. High-priority operational backlog', items: [
    ['Clean-account route smoke path for every future feature', 'Required standard'],
    ['Registration/guest count wording consistency', 'Preserved'],
    ['CODEX_TEST-only QA workflows', 'Ongoing'],
  ] },
  { title: '5. Access / staff / worker permissions backlog', items: [
    ['Firestore-enforced staff roles', 'Live after Phase 17C-B rules deploy'],
    ['Scanner/check-in-only role enforcement', 'Live / assigned-event-only / no undo'],
    ['Event manager role', 'Planned surface only'],
    ['Viewer/read-only role', 'Planned surface only'],
    ['Operations helper role', 'Planned surface only'],
    ['Mother/Event Manager simplified view', 'Future planned'],
  ] },
  { title: '6. Event Operations backlog', items: [['Event Operations expansion', 'Future planned']] },
  { title: '7. QA / reliability backlog', items: [
    ['Clean/new approved account regression checks', 'Required standard'],
    ['No selected Working Event regression checks', 'Required standard'],
    ['AppErrorBoundary fallback should not appear on normal protected routes', 'Required standard'],
  ] },
  { title: '8. Deferred integrations', items: [
    ['Google Sheets OAuth', 'Deferred'],
    ['Real AI API integration', 'Deferred'],
    ['Gmail/Outlook OAuth', 'Deferred'],
    ['Automatic email sending', 'Deferred'],
    ['Automatic WhatsApp sending', 'Deferred'],
    ['Cloud Functions', 'Deferred'],
    ['Firebase Storage', 'Deferred'],
    ['Payment gateway integration', 'Deferred'],
  ] },
  { title: '9. Public portals / native app / future long-term ideas', items: [
    ['Public attendee / baker / school portals', 'Deferred'],
    ['Native app / app store build', 'Deferred'],
  ] },
  { title: '10. Explicitly not implemented / out of scope', items: [
    ['Public sitemap / JSON-LD for private admin app', 'Out of scope'],
    ['Public signup or guest accounts', 'Out of scope'],
    ['CPB use for QA', 'Out of scope'],
  ] },
]

const EVENT_OPERATIONS_BACKLOG = [
  'tasks',
  'supplies checklist',
  'vendors/suppliers',
  'sponsors',
  'school tracking',
  'baker/vendor tracking',
  'budget/expense reporting',
  'event-day run sheet',
]

const ACCESS_ROLES_FUTURE_PLAN = [
  'pending access requests',
  'approve/decline staff access',
  'assign role',
  'assign event',
  'revoke access',
  'inactive/revoked status',
  'staffProfiles/{uid}',
  'events/{eventId}/staffAssignments/{uid}',
]

const SETTINGS_TABS = [
  ['profile', 'Profile'],
  ['workspace', 'Workspace'],
  ['events', 'Events & Defaults'],
  ['access', 'Access & Roles'],
  ['scanner', 'Scanner Mode'],
  ['tickets', 'Tickets & Check-In'],
  ['imports', 'Imports & Data'],
  ['finance', 'Finance & Operations'],
  ['communications', 'Communications'],
  ['qa', 'QA & System Health'],
  ['security', 'Security & Privacy'],
  ['roadmap', 'Integrations & Roadmap'],
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

function PillList({ items, tone = 'plain' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`${tone === 'white' ? 'bg-white' : 'bg-[#F7F1ED]'} rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]`}>{item}</span>
      ))}
    </div>
  )
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
        <SettingsSection eyebrow="My Admin Profile" title="Signed-in admin">
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
            <InfoRow label="Role source" value={rolesConfigured ? 'settings/accessControl.rolesByEmail' : 'approvedEmails fallback'} />
          </div>
          <button type="button" onClick={signOut} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-5 py-3 text-sm font-bold text-white">
            <LogOut className="size-4" />
            Log out
          </button>
        </SettingsSection>
        <SettingsSection eyebrow="System Health" title="Connection summary">
          <div className="grid gap-3">
            <InfoRow label="Authentication" value="Google sign-in remains unchanged" />
            <InfoRow label="Firebase project" value={firebaseProjectId || 'Configured at build time'} />
            <InfoRow label="Firebase config" value={isFirebaseConfigured ? 'Loaded' : 'Missing'} />
          </div>
        </SettingsSection>
      </div>
    ),
    workspace: (
      <SettingsSection eyebrow="Workspace" title="Working Event and clean-account state">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="App name" value="Gather & Savor Event Hub" />
          <InfoRow label="Organization" value="Gather & Savor Vibes" />
          <InfoRow label="Current Working Event" value={activeEvent?.eventName || 'No event selected'} />
          <InfoRow label="Clean-account state" value="Routes must not show stale Working Event data" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#806C61]">If no Working Event is selected, protected pages should show a safe no-selected-event state instead of stale counts or data.</p>
      </SettingsSection>
    ),
    events: (
      <SettingsSection eyebrow="Events & Defaults" title="Event configuration fallbacks">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Default timezone" value="America/Halifax" />
          <InfoRow label="Default currency" value="BBD fallback" />
          <InfoRow label="Default ticket prefix" value="GSV fallback" />
          <InfoRow label="priceTiers fallback" value="[]" />
          <InfoRow label="Default payment method" value={formatPaymentMethod(DEFAULT_FINANCE_SETTINGS.defaultPaymentMethod)} />
        </div>
      </SettingsSection>
    ),
    access: (
      <SettingsSection eyebrow="Access & Roles" title="Admin allowlist and future staff access">
        <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
          Approved-admin allowlist remains active owner/admin enforcement. Approved admin allowlist access remains admin-level only; approvedEmails remains admin-level access only. Do not add staff/scanners/helpers to approvedEmails. Temporary event-day helpers should not be added to approvedEmails. Phase 17D-A is closed as the approved planning blueprint for Access & Roles and scanner day-of polish. No live approval, revoke, or lead-scanner workflow is implemented here. Phase 17D-B scanner day-of polish is the recommended next subphase, while Phase 17D-C Access & Roles read-only/admin UI foundation remains later.
        </div>
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A48A7B]">Approved emails and roles</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#EFE2DA]">
            {approvedEntries.length === 0 ? (
              <p className="p-4 text-sm text-[#816D62]">No approved emails were loaded.</p>
            ) : approvedEntries.map((entry) => (
              <div key={entry.email} className="flex flex-col gap-1 border-b border-[#F2E8E1] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="break-all text-sm font-bold text-[#2B1723]">{entry.email}</p>
                <span className="w-fit rounded-full bg-[#F7F1ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{ACCESS_ROLES[entry.role]?.label || 'Admin'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ROLE_ORDER.map((roleId) => (
            <div key={roleId} className="rounded-2xl border border-[#EFE2DA] p-4">
              <p className="text-sm font-bold text-[#2B1723]">{ACCESS_ROLES[roleId].label}</p>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">{ACCESS_ROLES[roleId].summary}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
          <p className="text-sm font-bold text-[#2B1723]">Current role behavior</p>
          <p className="mt-1 text-xs leading-5 text-[#816D62]">{roleCapabilitySummary(currentRole)}</p>
          <p className="mt-2 text-xs leading-5 text-[#8A7468]">Future Access & Roles workflow only: pending access requests, approve/decline staff access, assign role, assign event, revoke access, and set inactive/revoked status. Role editing remains deferred to a later approved workflow. Settings should not rewrite Firestore rules; do NOT rewrite Firestore rules from Settings UI. Firestore rules stay stable; approved admins manage staffProfiles and events/{'{eventId}'}/staffAssignments/{'{uid}'} documents with the current deployed rules while future workflow planning remains separate. `PHASE_17D_PLAN.md` is the blueprint for that work.</p>
        </div>
        <div className="mt-4">
          <PillList items={ACCESS_ROLES_FUTURE_PLAN} tone="white" />
        </div>
      </SettingsSection>
    ),
    scanner: (
      <SettingsSection eyebrow="Scanner Mode" title="Private scanner shortcut">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/scanner" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E7345] px-4 text-xs font-bold text-white hover:bg-[#17623A]">Open Scanner Mode</Link>
          <button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/scanner`)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]">Copy Scanner Link</button>
        </div>
        <div className="mt-5 rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Route" value="/scanner" />
          <InfoRow label="Mode" value="Scanner-only isolated layout" />
          <InfoRow label="Admin correction" value="Admin-only Undo Check-In" />
          <InfoRow label="Scanner role" value="Cannot undo check-in" />
          <InfoRow label="Live smoke" value="Closed with PASS; CODEX_TEST-only scanner smoke" />
        </div>
      </SettingsSection>
    ),
    tickets: (
      <SettingsSection eyebrow="Tickets & Check-In" title="Ticket assignment and event-day safety">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="QR payload" value="GSV:TICKET:{ticketCode}" />
          <InfoRow label="Duplicate check-in" value="Blocked and can record append-only audit attempt" />
          <InfoRow label="Admin undo" value="Audited correction only" />
          <InfoRow label="Scanner check-in" value="Requires explicit Check In tap" />
        </div>
      </SettingsSection>
    ),
    imports: (
      <SettingsSection eyebrow="Imports & Data" title="Preview-first data import">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="CSV import" value="Active, preview before write" />
          <InfoRow label="XLSX import" value="Active with read-excel-file/browser" />
          <InfoRow label="SheetJS xlsx" value="Absent" />
          <InfoRow label="Google Sheets OAuth" value="Deferred" />
        </div>
      </SettingsSection>
    ),
    finance: (
      <SettingsSection eyebrow="Finance & Operations" title="Operations ledger and future modules">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Operations Ledger" value="Active for selected Working Event" />
          <InfoRow label="Ticket sales finance" value="Separate from operations ledger" />
          <InfoRow label="Payment gateway" value="Not implemented" />
        </div>
        <div className="mt-4">
          <PillList items={EVENT_OPERATIONS_BACKLOG} />
        </div>
      </SettingsSection>
    ),
    communications: (
      <SettingsSection eyebrow="Communications" title="Copy-only communications">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Communications Pro" value="Copy-only" />
          <InfoRow label="AI Draft Lab" value="Prompt builder only" />
          <InfoRow label="Automatic sending" value="Not enabled" />
          <InfoRow label="Real AI API" value="Not enabled" />
        </div>
      </SettingsSection>
    ),
    qa: (
      <SettingsSection eyebrow="QA & System Health" title="Production QA boundaries">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Safe QA event" value="CODEX_TEST Live Verification Event" />
          <InfoRow label="CPB" value="Protected production data; do not use for QA" />
          <InfoRow label="auditLogs" value="Append-only; do not delete" />
          <InfoRow label="Manual QA" value="Use CODEX_TEST only" />
        </div>
        <div className="mt-6">
          <SystemHealthPanel />
        </div>
      </SettingsSection>
    ),
    security: (
      <SettingsSection eyebrow="Security & Privacy" title="Private admin app protections">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Private admin app" value="No public attendee access" />
          <InfoRow label="Robots" value="noindex and robots.txt Disallow: /" />
          <InfoRow label="Security headers" value="DENY framing, nosniff, strict referrer policy" />
          <InfoRow label="Service worker" value="Lifecycle-only; no private-data fetch caching" />
          <InfoRow label="Public sitemap / JSON-LD" value="Not implemented for private app" />
        </div>
      </SettingsSection>
    ),
    roadmap: (
      <SettingsSection eyebrow="Integrations & Roadmap" title="Deferred integrations and backlog">
        <div className="grid gap-5">
          {ROADMAP_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl border border-[#EFE2DA] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A48A7B]">{section.title}</p>
              <div className="mt-3 grid gap-2">
                {section.items.map(([label, status]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#FBF8F5] px-3 py-2">
                    <p className="text-sm font-bold text-[#2B1723]">{label}</p>
                    <span className="rounded-full bg-[#F7F1ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm leading-6 text-[#806C61]">Deferred: Google Sheets OAuth, Gmail/Outlook OAuth, Cloud Functions, Storage, public portals, native app, automatic sending, real AI API, and payment gateway.</p>
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
      <section className="rounded-[24px] border border-[#E6D4B4] bg-[#FFF8EA] p-6 sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Danger Zone</p>
        <h2 className="mt-2 font-serif text-2xl text-[#4E3928]">Destructive actions disabled</h2>
        <p className="mt-4 text-sm leading-6 text-[#715D46]">Event deletion, CPB reset, audit log deletion, public access, Storage uploads, and external sending integrations are intentionally unavailable here.</p>
      </section>
    </div>
  )
}
