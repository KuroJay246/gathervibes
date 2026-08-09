import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { guidedTutorialSteps } from '../src/tutorial/tutorialSteps.js'

test('tutorial v3 preserves organizer route paths and expands coverage to 30 anchored lessons', () => {
  assert.equal(guidedTutorialSteps.length, 30)
  assert.deepEqual(guidedTutorialSteps.map((step) => step.pathname), [
    '/dashboard',
    '/dashboard',
    '/events',
    '/events',
    '/events',
    '/events',
    '/tasks',
    '/registrations',
    '/registrations',
    '/registrations',
    '/payments',
    '/tickets',
    '/check-in',
    '/operations',
    '/operations',
    '/run-of-show',
    '/resources',
    '/documents',
    '/contacts',
    '/contacts',
    '/contacts',
    '/dashboard',
    '/payments/reconciliation',
    '/communications',
    '/event-review',
    '/imports',
    '/imports',
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
    ['src/components/events/EventFormModal.jsx', 'event-name-field'],
    ['src/components/events/EventFormModal.jsx', 'event-category-selector'],
    ['src/components/events/EventFormModal.jsx', 'event-capabilities-controls'],
    ['src/pages/TasksPage.jsx', 'tasks-workspace'],
    ['src/pages/RegistrationsPage.jsx', 'registrations-workspace'],
    ['src/pages/RegistrationsPage.jsx', 'add-registration-action'],
    ['src/pages/RegistrationsPage.jsx', 'registration-filters-panel'],
    ['src/pages/PaymentsPage.jsx', 'payments-summary-metrics'],
    ['src/pages/TicketsPage.jsx', 'tickets-workspace'],
    ['src/pages/CheckInPage.jsx', 'checkin-search-field'],
    ['src/pages/OperationsPage.jsx', 'operations-workspace'],
    ['src/pages/OperationsPage.jsx', 'partners-commitments-panel'],
    ['src/pages/RunOfShowPage.jsx', 'run-of-show-workspace'],
    ['src/pages/ResourcesPage.jsx', 'resources-workspace'],
    ['src/pages/DocumentsPage.jsx', 'documents-workspace'],
    ['src/pages/ContactsPage.jsx', 'contacts-workspace'],
    ['src/pages/ContactsPage.jsx', 'organizations-workspace'],
    ['src/pages/ContactsPage.jsx', 'event-relationships-workspace'],
    ['src/pages/DashboardPage.jsx', 'event-readiness-summary'],
    ['src/pages/PaymentReconciliationPage.jsx', 'reconciliation-workspace'],
    ['src/pages/CommunicationsPage.jsx', 'message-builder-workspace'],
    ['src/pages/EventReviewPage.jsx', 'reports-workspace'],
    ['src/pages/ImportsPage.jsx', 'imports-workspace'],
    ['src/pages/ImportsPage.jsx', 'response-inbox-workspace'],
    ['src/pages/ImportsPage.jsx', 'import-templates-workspace'],
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
