import { CheckCircle2, Database, KeyRound, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { firebaseProjectId, isFirebaseConfigured } from '../lib/firebase'
import { SystemHealthPanel } from '../components/SystemHealthPanel'
import { DEFAULT_FINANCE_SETTINGS, formatPaymentMethod } from '../utils/financeUtils'
import { ACCESS_ROLES, ROLE_ORDER, listApprovedAccessEntries, roleCapabilitySummary } from '../utils/accessRoles'

const ROADMAP_ITEMS = [
  ['AI writing', 'Deferred'],
  ['Gmail/Outlook OAuth', 'Deferred'],
  ['Google Sheets OAuth', 'Deferred'],
  ['Cloud Functions', 'Deferred'],
  ['Storage', 'Deferred'],
  ['Staff roles', 'Phase 10 foundation'],
  ['Finance tracker', 'Phase 9 active'],
  ['Communications Pro', 'Phase 11 copy-only'],
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
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" className="size-16 rounded-full object-cover" referrerPolicy="no-referrer" />
  }
  return (
    <div className="grid size-16 place-items-center rounded-full bg-[#F7DDE6] text-xl font-bold uppercase text-[#2B1723]">
      {user?.displayName?.slice(0, 1) || user?.email?.slice(0, 1) || 'A'}
    </div>
  )
}

export function SettingsPage() {
  const { user, signOut, accessControl, currentRole, currentRoleLabel } = useAuth()
  const { activeEvent } = useActiveEvent()
  const approvedEntries = listApprovedAccessEntries(accessControl || {})
  const rolesConfigured = Boolean(accessControl?.rolesByEmail && Object.keys(accessControl.rolesByEmail).length > 0)

  return (
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
          <InfoRow label="Organizer display name" value={user?.displayName || 'Use Google profile name'} />
          <InfoRow label="Role label" value={currentRoleLabel} />
          <InfoRow label="Role source" value={rolesConfigured ? 'settings/accessControl.rolesByEmail' : 'approvedEmails fallback'} />
        </div>
        <button type="button" onClick={signOut} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-5 py-3 text-sm font-bold text-white">
          <LogOut className="size-4" />
          Log out
        </button>
      </SettingsSection>

      <SettingsSection eyebrow="Workspace / Organization" title="Gather & Savor workspace">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="App name" value="Gather & Savor Event Hub" />
          <InfoRow label="Organization" value="Gather & Savor Vibes" />
          <InfoRow label="Default timezone" value="America/Halifax" />
          <InfoRow label="Default currency" value="BBD / USD-ready" />
          <InfoRow label="Logo" value="Brand mark enabled; uploads disabled" />
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Admin Access" title="Private access controls">
        <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
          Staff roles are allowlist-only. This release displays role foundations from <strong>settings/accessControl</strong>, but Firestore write permissions still use the existing approved-admin rules until scoped role rules are separately designed and tested.
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#EFE2DA] p-4">
            <ShieldCheck className="size-5 text-[#B76E79]" />
            <div>
              <p className="text-sm font-bold text-[#2B1723]">Approved admin allowlist</p>
              <p className="text-xs text-[#816D62]">Active in settings/accessControl. Random signed-in users remain blocked.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#EFE2DA] p-4">
            <ShieldCheck className="size-5 text-[#B76E79]" />
            <div>
              <p className="text-sm font-bold text-[#2B1723]">Current user status</p>
              <p className="text-xs text-[#816D62]">{user?.email ? `Signed in and approved as ${currentRoleLabel}` : 'Not signed in'}</p>
            </div>
          </div>
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
          <p className="mt-2 text-xs leading-5 text-[#8A7468]">
            If rolesByEmail is missing or a role is not recognized, approved emails continue as Admin for backward compatibility.
          </p>
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
          <p className="mt-2 text-xs leading-5 text-[#8A7468]">
            Role editing, owner-only controls, viewer read-only rules, and check-in staff scoped rules are deferred. They should be added only with matching Firestore rules and audit tests.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Event Defaults" title="Import and check-in defaults">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Default ticket prefix" value="Event initials, fallback GSV" />
          <InfoRow label="Default payment statuses" value="Paid, Pending, Complimentary, Door" />
          <InfoRow label="Import behavior" value="Preview first; missing tickets may stay blank" />
          <InfoRow label="Check-in behavior" value="Warn on pending/door, do not auto-block" />
          <InfoRow label="Communication footer" value="Copy-ready messages only" />
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="Finance Defaults" title="Money tracker defaults">
        <div className="rounded-2xl border border-[#EFE2DA] p-4">
          <InfoRow label="Default currency" value={DEFAULT_FINANCE_SETTINGS.currency} />
          <InfoRow label="Default ticket price" value="Uses event ticket price when available" />
          <InfoRow label="Default price tier" value={DEFAULT_FINANCE_SETTINGS.defaultPriceTier} />
          <InfoRow label="Default payment method" value={formatPaymentMethod(DEFAULT_FINANCE_SETTINGS.defaultPaymentMethod)} />
          <InfoRow label="Allow blank ticket codes" value={DEFAULT_FINANCE_SETTINGS.allowBlankTicketCodes ? 'Yes' : 'No'} />
          <InfoRow label="Allow door payment" value={DEFAULT_FINANCE_SETTINGS.allowDoorPayment ? 'Yes' : 'No'} />
          <InfoRow label="Require payment reference for paid status" value={DEFAULT_FINANCE_SETTINGS.requirePaymentReferenceForPaidStatus ? 'Yes' : 'No'} />
          <InfoRow label="Show finance warnings" value={DEFAULT_FINANCE_SETTINGS.showFinanceWarnings ? 'Yes' : 'No'} />
        </div>
        <p className="mt-3 text-xs leading-5 text-[#8A7468]">
          These are safe app defaults for this foundation. Persisted workspace-level finance settings are deferred until a dedicated settings schema is approved.
        </p>
      </SettingsSection>

      <SettingsSection eyebrow="Deferred Features / Roadmap" title="Backlog visibility">
        <div className="grid gap-3">
          {ROADMAP_ITEMS.map(([label, status]) => (
            <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <p className="text-sm font-bold text-[#2B1723]">{label}</p>
              <span className="rounded-full bg-[#F7F1ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{status}</span>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection eyebrow="System Health" title="Connection status">
        <div className="grid gap-3">
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <KeyRound className="size-5 text-[#B76E79]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Authentication</p>
              <p className="text-xs text-[#8A7468]">Google sign-in remains unchanged.</p>
            </div>
            <CheckCircle2 className="size-5 text-[#2F855A]" />
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <Database className="size-5 text-[#B76E79]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Firebase project</p>
              <p className="break-all text-xs text-[#8A7468]">{firebaseProjectId || 'Configured at build time'}</p>
            </div>
            <CheckCircle2 className={`size-5 ${isFirebaseConfigured ? 'text-[#2F855A]' : 'text-[#A32626]'}`} />
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-[#EFE2DA] p-4">
            <UserRound className="size-5 text-[#B76E79]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Working Event</p>
              <p className="break-words text-xs text-[#8A7468]">{activeEvent?.eventName || 'No event selected'}</p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <section className="min-w-0 rounded-[24px] border border-[#E6D4B4] bg-[#FFF8EA] p-6 sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Danger Zone</p>
        <h2 className="mt-2 font-serif text-2xl text-[#4E3928]">Destructive actions disabled</h2>
        <p className="mt-4 text-sm leading-6 text-[#715D46]">
          Event deletion, CPB reset, audit log deletion, public access, Storage uploads, and external sending integrations are intentionally unavailable here.
        </p>
      </section>

      <div className="xl:col-span-2">
        <SystemHealthPanel />
      </div>
    </div>
  )
}
