export function healthTone(status) {
  if (status === 'ok') return 'green'
  if (status === 'warn') return 'gold'
  return 'red'
}

export function buildRuntimeHealthItems({
  firebaseConfigured,
  projectId,
  user,
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
      label: 'Build commit',
      status: buildCommit ? 'ok' : 'warn',
      detail: buildCommit || 'Not provided in this build.',
    },
    {
      label: 'Working Event',
      status: activeEvent?.eventId ? 'ok' : 'warn',
      detail: activeEvent?.eventName || 'No Working Event selected.',
    },
  ]
}

