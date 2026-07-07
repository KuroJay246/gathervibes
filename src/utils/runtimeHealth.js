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
      label: 'Current email approved',
      status: allowlistApproved === true ? 'ok' : allowlistApproved === false ? 'fail' : 'warn',
      detail: allowlistApproved === true ? 'Approved by settings/accessControl.' : allowlistApproved === false ? 'Not approved by allowlist.' : 'Checking allowlist.',
    },
    {
      label: 'Current role detected',
      status: currentRoleLabel ? 'ok' : 'warn',
      detail: currentRoleLabel ? `${currentRoleLabel} from approved-admin allowlist or Phase 17C-B staff profile/assignment live state.` : 'Role display is pending access load.',
    },
    {
      label: 'Staff roles enforcement level',
      status: 'ok',
      detail: 'Phase 17C-B remains closed and live. Phase 17D-C and Phase 17D-D are closed and merged. Phase 17E-A and 17E-B are closed. Phase 17E-C, Phase 17E-D, and Phase 17E-E are closed after organizer review PASS. Phase 17F-A, Phase 17F-B, and Phase 17F-C are closed after organizer review PASS. Phase 17G-A is active as an approval package only. No live workflow change is introduced.',
    },
    {
      label: 'Approved-admin allowlist',
      status: allowlistApproved === true ? 'ok' : allowlistApproved === false ? 'fail' : 'warn',
      detail: 'Active server-side security boundary for private admin access.',
    },
    {
      label: 'Firestore role enforcement',
      status: 'ok',
      detail: 'Staff profile and event assignment rules are deployed for live scanner use with CODEX_TEST-only assignment scope preserved. Phase 17D-C and Phase 17D-D closed without changing rules, Phase 17E-A did not deploy rules, Phase 17E-B closed as a dry-run-only accessRequests prototype, Phase 17E-C / 17E-D / 17E-E / 17F-A / 17F-B / 17F-C closed without deploying Firestore rules or indexes, and Phase 17G-A remains approval-only with no rules or index deploy.',
    },
    {
      label: 'Daily QA workflow',
      status: 'warn',
      detail: 'Latest current-head Daily QA run 28875120502 succeeded for branch commit ca93b260 on July 7, 2026. Older failed GitHub UI badges can reflect stale built-auth smoke history from commit 1e48154 and are not blocking unless the current head fails.',
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
      detail: (typeof window !== 'undefined' && import.meta.env.MODE !== 'test' && !window.__FIRESTORE_TEST_ENV__) ? 'Enabled via IndexedDbPersistence (multi-tab).' : 'Disabled in test environment.',
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
      label: 'Deferred integrations',
      status: 'ok',
      detail: 'Real AI API, Gmail/Outlook OAuth, Google Sheets OAuth, Cloud Functions, Storage, public portals, payment gateways, native apps, sitemap, and JSON-LD are not enabled.',
    },
    {
      label: 'Backlog visibility order',
      status: 'ok',
      detail: 'Closed, current, next, operational, access/staff, Event Operations, QA/reliability, deferred, long-term, and out-of-scope items are separated.',
    },
    {
      label: 'Communications Pro safety',
      status: 'ok',
      detail: 'Communications remain copy-only. No email, WhatsApp, OAuth, AI, or automatic sending is enabled.',
    },
  ]
}

