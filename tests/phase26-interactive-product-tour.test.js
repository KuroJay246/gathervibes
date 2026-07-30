import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { guidedTutorialSteps } from '../src/tutorial/tutorialSteps.js'

test('tutorial v3 preserves organizer route paths and expands coverage to 19 steps', () => {
  assert.equal(guidedTutorialSteps.length, 19)
  assert.deepEqual(guidedTutorialSteps.map((step) => step.pathname), [
    '/dashboard',
    '/dashboard',
    '/events',
    '/events',
    '/events',
    '/events',
    '/registrations',
    '/registrations',
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
})

test('tutorial v3 uses stable semantic targets already present on organizer pages', async () => {
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
})

test('tutorial v3 removes legacy walkthrough runtime and brittle target helpers', async () => {
  const appShell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const registry = await readFile('src/tutorial/tutorialRegistry.js', 'utf8')
  assert.doesNotMatch(appShell, /AppWalkthrough|onboardingSteps|useOnboarding/)
  assert.match(registry, /data-tour-id/)
  assert.doesNotMatch(registry, /nth-child|innerText|textContent/)
})

test('tutorial v3 normal path remains zero-write except onboarding preferences', async () => {
  const source = (await Promise.all([
    readFile('src/tutorial/TutorialProvider.jsx', 'utf8'),
    readFile('src/tutorial/TutorialController.js', 'utf8'),
    readFile('src/tutorial/tutorialStorage.js', 'utf8'),
  ])).join('\n')

  assert.match(source, /staffProfiles/)
  assert.doesNotMatch(source, /'events'|"events"|'registrations'|"registrations"|'tickets'|"tickets"|'auditLogs'|"auditLogs"|completeCheckIn\(|saveTicketAssignment\(/)
})
