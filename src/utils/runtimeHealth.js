export function healthTone(status) {
  if (status === 'ok') return 'green'
  if (status === 'warn') return 'gold'
  return 'red'
}

export function buildRuntimeHealthItems({
  firebaseConfigured,
  projectId,
  user,
  currentRoleLabel,
  allowlistApproved,
  eventsStatus,
  registrationsStatus,
  auditStatus,
  serviceWorkerSafe,
  activeEvent,
  buildCommit,
}) {
  return [
    {
      label: 'Firebase config loaded',
      status: firebaseConfigured ? 'ok' : 'fail',
      detail: firebaseConfigured ? 'Client configuration is present.' : 'Missing VITE_FIREBASE values.',
    },
    {
      label: 'Firebase project',
      status: projectId === 'gathervibeshub' ? 'ok' : 'fail',
      detail: projectId || 'No project ID detected.',
    },
    {
      label: 'Auth user signed in',
      status: user?.email ? 'ok' : 'fail',
      detail: user?.email || 'No signed-in user.',
    },
    {
      label: 'Current owner or email approved',
      status: allowlistApproved === true ? 'ok' : allowlistApproved === false ? 'fail' : 'warn',
      detail: allowlistApproved === true ? 'Approved by protected owner UID or settings/accessControl.' : allowlistApproved === false ? 'Not approved by protected owner or allowlist.' : 'Checking access contract.',
    },
    {
      label: 'Current role detected',
      status: currentRoleLabel ? 'ok' : 'warn',
      detail: currentRoleLabel ? `${currentRoleLabel} from approved-admin allowlist or staff profile/assignment state.` : 'Role display is pending access load.',
    },
    {
      label: 'Staff role boundary',
      status: 'ok',
      detail: 'Scanner and staff access remain assigned-event scoped. Approval, revocation, assignment editing, and lead-scanner management are disabled in the organizer UI.',
    },
    {
      label: 'Protected owner and approved organizers',
      status: allowlistApproved === true ? 'ok' : allowlistApproved === false ? 'fail' : 'warn',
      detail: 'Protected owner UID plus secondary approved organizers are the server-side admin boundary.',
    },
    {
      label: 'Firestore role enforcement',
      status: 'ok',
      detail: 'Rules enforce private admin access, assigned scanner access, and append-only audit-log behavior. Firestore indexes are managed outside this UI.',
    },
    {
      label: 'Daily QA workflow',
      status: 'warn',
      detail: 'Use current production smoke results and CODEX_TEST checks as the source of truth.',
    },
    {
      label: 'Events read',
      status: eventsStatus,
      detail: eventsStatus === 'ok' ? 'Events can be read.' : eventsStatus === 'warn' ? 'Checking events.' : 'Events read failed.',
    },
    {
      label: 'Registrations read',
      status: registrationsStatus,
      detail: activeEvent?.eventId ? (registrationsStatus === 'ok' ? 'Working Event registrations can be read.' : registrationsStatus === 'warn' ? 'Checking registrations.' : 'Registrations read failed.') : 'Select a Working Event to test registrations.',
    },
    {
      label: 'Audit logging',
      status: auditStatus,
      detail: auditStatus === 'ok' ? 'Audit log collection is readable.' : auditStatus === 'warn' ? 'Read-only status check.' : 'Audit log read failed.',
    },
    {
      label: 'Service worker safety',
      status: serviceWorkerSafe ? 'ok' : 'fail',
      detail: serviceWorkerSafe ? 'No private data fetch caching is registered.' : 'Service worker safety needs review.',
    },
    {
      label: 'Offline persistence',
      status: 'ok',
      detail: (typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_USE_EMULATORS !== 'true' && import.meta.env.MODE !== 'test' && !window.__FIRESTORE_TEST_ENV__) ? 'Enabled via IndexedDbPersistence (multi-tab).' : 'Disabled in test or emulator environment.',
    },
    {
      label: 'Build metadata',
      status: 'ok',
      detail: buildCommit ? `Commit ${buildCommit}` : 'Build commit not configured for this build.',
    },
    {
      label: 'Working Event',
      status: activeEvent?.eventId ? 'ok' : 'warn',
      detail: activeEvent?.eventName || 'No Working Event selected.',
    },
    {
      label: 'Safe route checklist',
      status: 'ok',
      detail: '/login, /dashboard, /settings, /qa, and /security redirect are expected app routes.',
    },
    {
      label: 'QA guidance',
      status: 'ok',
      detail: 'Start daily and manual QA at https://gathervibeshub.web.app/login.',
    },
    {
      label: 'External integrations',
      status: 'ok',
      detail: 'Real AI API, Gmail/Outlook OAuth, Google Sheets OAuth, Cloud Functions, Storage, public portals, payment gateways, native apps, sitemap, and JSON-LD are not enabled.',
    },
    {
      label: 'Product boundaries',
      status: 'ok',
      detail: 'Private admin app, CODEX_TEST QA, operations, access, and external integrations remain separated.',
    },
    {
      label: 'Message Builder safety',
      status: 'ok',
      detail: 'Message Builder remains copy-only. No email, WhatsApp, OAuth, AI generation, or automatic sending is enabled.',
    },
  ]
}

