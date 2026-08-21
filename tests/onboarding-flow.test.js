import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { guidedTutorialSteps, TARGET_UIDS, TUTORIAL_VERSION, practiceMissions } from '../src/tutorial/tutorialSteps.js'
import { TUTORIAL_STATES, initialTutorialMachine, tutorialReducer } from '../src/tutorial/TutorialStateMachine.js'
import { TUTORIAL_ROUTE_TARGETS, TUTORIAL_TARGETS, isTargetAllowedForRoute } from '../src/tutorial/tutorialRegistry.js'

const JAYLAN_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const ANICA_UID = 'WM2UOQtSeuOglCI5uMZQKrYYqP53'

test('[tutorial-v3] eligible users are Jaylan and Anica without hardcoded organizer copy', async () => {
  assert.ok(TARGET_UIDS.includes(JAYLAN_UID))
  assert.ok(TARGET_UIDS.includes(ANICA_UID))
  const provider = await readFile('src/tutorial/TutorialProvider.jsx', 'utf8')
  const welcome = await readFile('src/tutorial/WelcomeCelebration.jsx', 'utf8')
  assert.doesNotMatch(provider + welcome, /Welcome aboard, Anica|Welcome, Anica|WM2UOQtSeuOglCI5uMZQKrYYqP53/)
})

test('[tutorial-v3] version is new and does not reuse v2 completion', () => {
  assert.equal(TUTORIAL_VERSION, 'tutorial-v4-organizer-modules')
  assert.notEqual(TUTORIAL_VERSION, 'interactive-product-tour-v2')
})

test('[tutorial-v3] guided orientation covers 30 anchored lessons plus welcome and completion', () => {
  assert.equal(guidedTutorialSteps.length, 30)
  assert.deepEqual(guidedTutorialSteps.map((step) => step.id), [
    'working-event',
    'overview',
    'create-event',
    'event-basics',
    'event-category',
    'event-capabilities',
    'tasks',
    'registrations',
    'add-registration',
    'registration-filters',
    'payments',
    'tickets',
    'check-in',
    'operations',
    'commitments',
    'run-of-show',
    'resources',
    'documents',
    'contacts',
    'organizations',
    'event-relationships',
    'event-readiness',
    'reconciliation',
    'communications',
    'reports',
    'imports',
    'response-inbox',
    'import-templates',
    'settings',
    'system-qa',
  ])
})

test('[tutorial-v3] every guided step has rich practical content and a registered target', () => {
  for (const step of guidedTutorialSteps) {
    assert.ok(step.id)
    assert.ok(step.title)
    assert.ok(step.pathname.startsWith('/'))
    assert.ok(step.routeId)
    assert.ok(step.targetId)
    assert.ok(step.what.length > 40)
    assert.ok(step.why.length > 30)
    assert.ok(step.doNow.length > 30)
    assert.ok(step.next.length > 30)
    assert.ok(step.example.length > 30)
    assert.ok(step.showMe.length > 20)
    assert.ok(step.letMeTry.length > 20)
    assert.equal(step.writesBusinessData, false)
    assert.ok(isTargetAllowedForRoute(step.routeId, step.targetId), `${step.id} target must be registered for route`)
  }
})

test('[tutorial-v3] exact targets replace broad workspace targets for action steps', () => {
  const targets = Object.fromEntries(guidedTutorialSteps.map((step) => [step.id, step.targetId]))
  assert.equal(targets['event-basics'], TUTORIAL_TARGETS.eventBasicsName)
  assert.equal(targets['event-category'], TUTORIAL_TARGETS.eventCategorySelector)
  assert.equal(targets['event-capabilities'], TUTORIAL_TARGETS.eventCapabilities)
  assert.equal(targets['add-registration'], TUTORIAL_TARGETS.registrationsAddButton)
  assert.equal(targets['registration-filters'], TUTORIAL_TARGETS.registrationsWorkspaceTabs)
  assert.equal(targets.payments, TUTORIAL_TARGETS.paymentsSummary)
  assert.equal(targets.tickets, TUTORIAL_TARGETS.ticketsWorkspaceTabs)
  assert.equal(targets['check-in'], TUTORIAL_TARGETS.checkInWorkspaceTabs)
  assert.equal(targets.tasks, TUTORIAL_TARGETS.tasksWorkspace)
  assert.equal(targets.commitments, TUTORIAL_TARGETS.partnersSponsors)
  assert.equal(targets['run-of-show'], TUTORIAL_TARGETS.runOfShowWorkspace)
  assert.equal(targets.resources, TUTORIAL_TARGETS.resourcesWorkspace)
  assert.equal(targets.documents, TUTORIAL_TARGETS.documentsWorkspace)
  assert.equal(targets.contacts, TUTORIAL_TARGETS.contactsWorkspace)
  assert.equal(targets.organizations, TUTORIAL_TARGETS.organizationsWorkspace)
  assert.equal(targets['event-relationships'], TUTORIAL_TARGETS.eventRelationshipsWorkspace)
  assert.equal(targets['event-readiness'], TUTORIAL_TARGETS.eventReadinessSummary)
  assert.equal(targets.reconciliation, TUTORIAL_TARGETS.reconciliationWorkspace)
  assert.equal(targets['response-inbox'], TUTORIAL_TARGETS.responseInboxWorkspace)
  assert.equal(targets['import-templates'], TUTORIAL_TARGETS.importTemplatesWorkspace)
})

test('[tutorial-v3] state machine exposes explicit legal states', () => {
  const expected = [
    'idle',
    'opening',
    'preparing-route',
    'navigating',
    'waiting-for-route',
    'waiting-for-data',
    'waiting-for-target',
    'positioning',
    'presenting',
    'advancing',
    'reversing',
    'paused',
    'retryable-error',
    'completing',
    'completed',
    'closing',
  ]
  for (const state of expected) {
    assert.ok(Object.values(TUTORIAL_STATES).includes(state), state)
  }
})

test('[tutorial-v3] stale transition events cannot overwrite current presentation', () => {
  let state = tutorialReducer(initialTutorialMachine, { type: 'START_GUIDED', stepIndex: 0, transitionId: 'current' })
  state = tutorialReducer(state, { type: 'TRANSITION', direction: 'next', transitionId: 'newer' })
  const stale = tutorialReducer(state, { type: 'PRESENT', transitionId: 'older', stepIndex: 5 })
  assert.equal(stale.stepIndex, 0)
  assert.equal(stale.transitionId, 'newer')
  const current = tutorialReducer(state, { type: 'PRESENT', transitionId: 'newer', stepIndex: 1 })
  assert.equal(current.stepIndex, 1)
  assert.equal(current.status, TUTORIAL_STATES.presenting)
})

test('[tutorial-v3] Back and Next transitions are first-class reducer operations', () => {
  let state = tutorialReducer(initialTutorialMachine, { type: 'START_GUIDED', stepIndex: 3, transitionId: 'start' })
  state = tutorialReducer(state, { type: 'TRANSITION', direction: 'back', transitionId: 'back-1' })
  assert.equal(state.status, TUTORIAL_STATES.reversing)
  state = tutorialReducer(state, { type: 'PRESENT', transitionId: 'back-1', stepIndex: 2 })
  assert.equal(state.stepIndex, 2)
  state = tutorialReducer(state, { type: 'TRANSITION', direction: 'next', transitionId: 'next-1' })
  assert.equal(state.status, TUTORIAL_STATES.advancing)
})

test('[tutorial-v3] route and target registries are semantic and not text-selector based', () => {
  assert.ok(TUTORIAL_ROUTE_TARGETS.dashboard.includes(TUTORIAL_TARGETS.workingEventSelector))
  assert.ok(TUTORIAL_ROUTE_TARGETS.registrations.includes(TUTORIAL_TARGETS.registrationsWorkspaceTabs))
  assert.ok(TUTORIAL_ROUTE_TARGETS.tasks.includes(TUTORIAL_TARGETS.tasksWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS['run-of-show'].includes(TUTORIAL_TARGETS.runOfShowWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS.resources.includes(TUTORIAL_TARGETS.resourcesWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS.documents.includes(TUTORIAL_TARGETS.documentsWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS.contacts.includes(TUTORIAL_TARGETS.contactsWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS.imports.includes(TUTORIAL_TARGETS.responseInboxWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS.dashboardReadiness.includes(TUTORIAL_TARGETS.eventReadinessSummary))
  assert.ok(TUTORIAL_ROUTE_TARGETS.reconciliation.includes(TUTORIAL_TARGETS.reconciliationWorkspace))
  assert.ok(TUTORIAL_ROUTE_TARGETS['system-qa'].includes(TUTORIAL_TARGETS.systemQa))
})

test('[tutorial-v3] target registry chooses a measurable target when duplicate layouts exist', async () => {
  const registry = await readFile('src/tutorial/tutorialRegistry.js', 'utf8')
  const overlay = await readFile('src/tutorial/TutorialOverlay.jsx', 'utf8')
  assert.match(registry, /document\.querySelectorAll\(selectorForTutorialTarget\(targetId\)\)/)
  assert.match(registry, /rect\.width > 0 && rect\.height > 0/)
  assert.match(overlay, /findRegisteredTarget\(step\.targetId\)/)
})

test('[tutorial-v3] storage uses the secure onboarding preference subcollection', async () => {
  const storage = await readFile('src/tutorial/tutorialStorage.js', 'utf8')
  assert.match(storage, /'staffProfiles', uid, 'preferences', 'onboarding'/)
  assert.match(storage, /setDoc\(/)
  assert.match(storage, /\{ merge: true \}/)
  assert.doesNotMatch(storage, /updateDoc\(/)
  assert.doesNotMatch(storage, /doc\(db, 'staffProfiles', uid\)\s*\n\s*await (setDoc|updateDoc)/)
})

test('[tutorial-v3] legacy stored progress is preserved but not resumed as v3 progress', async () => {
  const storage = await readFile('src/tutorial/tutorialStorage.js', 'utf8')
  assert.match(storage, /const isCurrentVersion = data\.version === TUTORIAL_VERSION/)
  assert.match(storage, /lastStep: isCurrentVersion \? normalizeLastStep\(data\.lastStep\) : 0/)
  assert.match(storage, /legacyVersion: isCurrentVersion \? null : data\.version \|\| null/)
})

test('[tutorial-v3] normal guided tour writes no business records', async () => {
  const files = [
    'src/tutorial/TutorialProvider.jsx',
    'src/tutorial/TutorialController.js',
    'src/tutorial/tutorialStorage.js',
    'src/tutorial/tutorialSteps.js',
  ]
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n')
  assert.doesNotMatch(source, /addDoc\(|commitImport\(|completeCheckIn\(|saveTicketAssignment\(|recordHistoricalAttendance\(/)
  assert.doesNotMatch(await readFile('src/tutorial/tutorialStorage.js', 'utf8'), /'events'|"events"|'registrations'|"registrations"|'tickets'|"tickets"|'auditLogs'|"auditLogs"/)
  assert.match(source, /staffProfiles/)
})

test('[tutorial-v3] current event-day workflows explain boundaries and readiness truthfully', () => {
  const runOfShow = guidedTutorialSteps.find((step) => step.id === 'run-of-show')
  const resources = guidedTutorialSteps.find((step) => step.id === 'resources')
  const readiness = guidedTutorialSteps.find((step) => step.id === 'event-readiness')

  assert.match(runOfShow.what, /private operational sequence/)
  assert.match(runOfShow.next, /dependencies/)
  assert.match(resources.what, /equipment, supplies/)
  assert.match(resources.next, /relationships only/)
  assert.match(readiness.what, /Ready, Needs Attention, or At Risk/)
  assert.match(readiness.why, /hidden score/)
  assert.match(readiness.next, /recalculates/)
})

test('[tutorial-v3] practice missions are non-writing by default and CPB isolated', () => {
  assert.ok(practiceMissions.length >= 5)
  assert.ok(practiceMissions.every((mission) => mission.writes === false))
  assert.ok(practiceMissions.every((mission) => /Practice Mode — Nothing here affects your real events\./.test(mission.banner)))
  assert.ok(guidedTutorialSteps.every((step) => !/Cake Piknik Barbados|zhaPxi31cpqLAW0cuS20|CODEX_TEST|\bCPB\b/.test(JSON.stringify(step))))
})

test('[tutorial-v3] tooltip exposes specific action controls', async () => {
  const tooltip = await readFile('src/tutorial/TutorialTooltip.jsx', 'utf8')
  assert.match(tooltip, /What this is/)
  assert.match(tooltip, /Why you use it/)
  assert.match(tooltip, /What to do now/)
  assert.match(tooltip, /What happens next/)
  assert.match(tooltip, /Practical example/)
  assert.match(tooltip, /Show Me/)
  assert.match(tooltip, /Let Me Try/)
  assert.match(tooltip, /Skip Step/)
  assert.match(tooltip, /Exit Tour/)
})

test('[tutorial-v3] hidden containers open automatically', async () => {
  const controller = await readFile('src/tutorial/TutorialController.js', 'utf8')
  assert.match(controller, /prepareStep/)
  assert.match(controller, /openEventFormIfNeeded/)
  assert.match(controller, /tutorial:event-form-step/)
  assert.match(controller, /HTMLDetailsElement/)
  assert.ok(guidedTutorialSteps.some((step) => step.prepare?.type === 'open-event-form'))
  assert.ok(guidedTutorialSteps.some((step) => step.prepare?.type === 'close-event-form'))
})

test('[tutorial-v3] legacy runtime files are removed from AppShell imports', async () => {
  const appShell = await readFile('src/layout/AppShell.jsx', 'utf8')
  assert.doesNotMatch(appShell, /components\/onboarding/)
  assert.doesNotMatch(appShell, /AppWalkthrough|useOnboarding/)
  assert.match(appShell, /TutorialProvider/)
})

test('[tutorial-v3] replay starts from the beginning without clearing completion', async () => {
  const provider = await readFile('src/tutorial/TutorialProvider.jsx', 'utf8')
  assert.match(provider, /markTutorialReplay\(user\)/)
  assert.match(provider, /setStoredState\(\(prev\) => \(\{ \.\.\.prev, lastStep: 0 \}\)\)/)
  assert.match(provider, /completedAt: prev\?\.completedAt \|\| new Date\(\)/)
})

test('[tutorial-v3] transition controller is not recreated during route changes', async () => {
  const provider = await readFile('src/tutorial/TutorialProvider.jsx', 'utf8')
  assert.match(provider, /const navigateRef = useRef\(navigate\)/)
  assert.match(provider, /const activeEventNameRef = useRef\(null\)/)
  assert.match(provider, /navigate: \(pathname\) => navigateRef\.current\(pathname\)/)
  assert.match(provider, /activeEventName: \(\) => activeEventNameRef\.current/)
  assert.doesNotMatch(provider, /\}, \[activeEventName, navigate\]\)/)
})

test('[tutorial-v3] overlay uses observer-based measurement and one document-body portal', async () => {
  const overlay = await readFile('src/tutorial/TutorialOverlay.jsx', 'utf8')
  assert.match(overlay, /ResizeObserver/)
  assert.match(overlay, /IntersectionObserver/)
  assert.match(overlay, /requestAnimationFrame/)
  assert.match(overlay, /visualViewport/)
  assert.match(overlay, /createPortal/)
  assert.match(overlay, /document\.body/)
  assert.match(overlay, /const height = Math\.min\(TOOLTIP_HEIGHT, viewportHeight - SAFE_MARGIN \* 2\)/)
  assert.match(overlay, /maxHeight: height/)
})

test('[tutorial-v3] controller uses AbortController-backed transitions without fixed route sleeps', async () => {
  const controller = await readFile('src/tutorial/TutorialController.js', 'utf8')
  assert.match(controller, /AbortController/)
  assert.match(controller, /transitionId/)
  assert.match(controller, /MutationObserver/)
  assert.match(controller, /requestAnimationFrame/)
  assert.doesNotMatch(controller, /setTimeout\(.*100/)
})

test('[tutorial-v3] Firestore rules allow v4 30-step guided boundary', async () => {
  const rules = await readFile('firestore.rules', 'utf8')
  assert.match(rules, /staffProfiles\/\{uid\}\/preferences\/onboarding/)
  assert.match(rules, /lastStep.*<= 30/)
  assert.match(rules, /lastStep.*>= 0/)
})
