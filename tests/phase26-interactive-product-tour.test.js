import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { walkthroughSteps } from '../src/components/onboarding/onboardingSteps.js'

test('interactive product tutorial covers required route sequence with stable targets', () => {
  assert.equal(walkthroughSteps.length, 16)
  assert.deepEqual(walkthroughSteps.map((step) => step.route), [
    '/dashboard',
    '/dashboard',
    '/events',
    '/events',
    '/events',
    '/registrations',
    '/payments',
    '/tickets',
    '/check-in',
    '/operations',
    '/operations',
    '/communications',
    '/event-review',
    '/imports',
    '/settings',
    '/qa',
  ])
  assert.equal(new Set(walkthroughSteps.map((step) => step.targetId)).size, 14)
  assert.ok(walkthroughSteps.every((step) => step.content && step.when && step.example))
})

test('interactive product tutorial is anchored and does not use fragile text selectors', async () => {
  const component = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')

  assert.match(component, /targetSelector\(step\)/)
  assert.match(component, /data-tour-id/)
  assert.match(component, /scrollIntoView/)
  assert.match(component, /calculatePlacement/)
  assert.match(component, /ArrowIcon/)
  assert.match(component, /prefers-reduced-motion/)
  assert.doesNotMatch(component, /Open This Page/)
})

test('tutorial targets are present on organizer pages without changing route paths', async () => {
  const files = [
    ['src/layout/AppShell.jsx', 'working-event-selector'],
    ['src/pages/DashboardPage.jsx', 'overview-summary'],
    ['src/pages/EventsPage.jsx', 'create-event-action'],
    ['src/components/events/EventPlanningWorkspace.jsx', 'event-planning-workspace'],
    ['src/pages/RegistrationsPage.jsx', 'registrations-workspace'],
    ['src/pages/PaymentsPage.jsx', 'payments-workspace'],
    ['src/pages/TicketsPage.jsx', 'tickets-workspace'],
    ['src/pages/CheckInPage.jsx', 'checkin-workspace'],
    ['src/pages/OperationsPage.jsx', 'operations-workspace'],
    ['src/pages/CommunicationsPage.jsx', 'message-builder-workspace'],
    ['src/pages/EventReviewPage.jsx', 'reports-workspace'],
    ['src/pages/ImportsPage.jsx', 'imports-workspace'],
    ['src/pages/SettingsPage.jsx', 'settings-workspace'],
    ['src/pages/QaPage.jsx', 'system-qa-workspace'],
  ]

  for (const [file, target] of files) {
    assert.match(await readFile(file, 'utf8'), new RegExp(`data-tour-id="${target}"`), file)
  }

  const app = await readFile('src/App.jsx', 'utf8')
  for (const route of ['/dashboard', '/events', '/registrations', '/payments', '/tickets', '/check-in', '/operations', '/communications', '/event-review', '/imports', '/settings', '/qa']) {
    assert.match(app, new RegExp(`path="${route.replace('/', '\\/')}"`))
  }
})

test('normal tutorial remains zero-write except onboarding preferences', async () => {
  const component = await readFile('src/components/onboarding/AppWalkthrough.jsx', 'utf8')
  const hook = await readFile('src/components/onboarding/useOnboarding.js', 'utf8')

  assert.doesNotMatch(component, /createEvent|createRegistration|commitImport|completeCheckIn|saveTicketAssignment|recordHistoricalAttendance/)
  assert.match(hook, /'staffProfiles', user\.uid, 'preferences', 'onboarding'/)
  assert.match(hook, /completedAt/)
  assert.match(hook, /replayRequestedAt/)
  assert.doesNotMatch(component, /Welcome aboard, Anica|WM2UOQtSeuOglCI5uMZQKrYYqP53/)
})
