import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { ACCESS_ROLES, roleCapabilitySummary, canUseSettings, canViewRoute } from '../src/utils/accessRoles.js'
import { guidedTutorialSteps } from '../src/tutorial/tutorialSteps.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

function source(path) {
  return readFile(path, 'utf8')
}

test('final Settings refinement separates access sources, roles, integrations, tutorial, and administration', async () => {
  const settings = await source('src/pages/SettingsPage.jsx')

  for (const text of [
    'Account and access summary',
    'Protected Owner',
    'Approved Organizers',
    'Staff Profiles',
    'Event Assignments',
    'Secondary organizers are approved accounts that remain separate from staff profile count and event assignment count.',
    'Tutorial and Help',
    'Replay guided help',
    'Connection status',
    'Google Forms receiver',
    'Packaged but Not Deployed',
    'Google Sheets',
    'Manual Workflow',
    'Gmail',
    'Disconnected',
    'Online payments',
    'Not Connected',
    'Advanced and administration',
    'Administrative caution',
  ]) {
    assert.match(settings, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.doesNotMatch(settings, /HMAC|secret|token|private key|OAuth token/i)
  assert.doesNotMatch(settings, /addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)
})

test('final role wording matches route and settings permissions without broadening access', () => {
  assert.equal(ACCESS_ROLES['owner-admin'].label, 'Protected Owner')
  assert.match(ACCESS_ROLES['owner-admin'].summary, /permanent and cannot be removed from Settings/)
  assert.match(ACCESS_ROLES.admin.summary, /Normal organizer-level management/)
  assert.match(ACCESS_ROLES['event-manager'].summary, /Assigned-event task and check-in workflow access only/)
  assert.match(ACCESS_ROLES.viewer.summary, /Read-only assigned-event behavior/)
  assert.match(ACCESS_ROLES.scanner.summary, /Assigned-event check-in lookup and check-in completion only/)
  assert.match(ACCESS_ROLES['operations-helper'].summary, /Operations ledger visibility only/)
  assert.match(roleCapabilitySummary('event-manager'), /does not grant Settings, imports, payments, tickets, Reports/)

  const scanner = { level: 'staff', role: 'scanner', assignmentsByEvent: { codex: { eventId: 'codex', role: 'scanner' } } }
  const operationsHelper = { level: 'staff', role: 'operations-helper', assignmentsByEvent: { codex: { eventId: 'codex', role: 'operations-helper' } } }
  assert.equal(canUseSettings(scanner), false)
  assert.equal(canViewRoute(scanner, '/qa'), false)
  assert.equal(canViewRoute(scanner, '/scanner'), true)
  assert.equal(canUseSettings(operationsHelper), false)
  assert.equal(canViewRoute(operationsHelper, '/operations'), true)
})

test('final System QA refinement presents technical groups and manual checks distinctly', async () => {
  const qa = await source('src/pages/QaPage.jsx')

  for (const text of [
    'Environment',
    'Current app environment',
    'Working Event',
    'Selected event classification',
    'Access',
    'Current role and permissions',
    'Data Boundaries',
    'Registration Payments separate from Operations',
    'Training Event exclusion',
    'QR format',
    'Scanner isolation',
    'Import write boundary',
    'Feature Status',
    'Automatic Forms receiver',
    'Packaged',
    'Gmail',
    'Not Connected',
    'Online payments',
    'OCR',
    'Manual Acceptance',
    'True Chrome 200% zoom',
  ]) {
    assert.match(qa, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.doesNotMatch(qa, /HMAC secret|private key|delete-all|auth bypass|permission bypass/i)
})

test('final tutorial matrix includes current product routes and stable targets', async () => {
  const routes = guidedTutorialSteps.map((step) => step.pathname)
  assert.equal(guidedTutorialSteps.length, 30)
  assert.ok(routes.includes('/tasks'))
  assert.ok(routes.includes('/run-of-show'))
  assert.ok(routes.includes('/resources'))
  assert.ok(routes.includes('/documents'))
  assert.ok(routes.includes('/contacts'))
  assert.ok(routes.includes('/dashboard'))
  assert.ok(routes.includes('/payments/reconciliation'))
  assert.ok(routes.includes('/imports'))
  assert.ok(routes.includes('/communications'))
  assert.ok(routes.includes('/settings'))
  assert.ok(routes.includes('/qa'))

  const tasks = guidedTutorialSteps.find((step) => step.id === 'tasks')
  const runOfShow = guidedTutorialSteps.find((step) => step.id === 'run-of-show')
  const resources = guidedTutorialSteps.find((step) => step.id === 'resources')
  const documents = guidedTutorialSteps.find((step) => step.id === 'documents')
  const contacts = guidedTutorialSteps.find((step) => step.id === 'contacts')
  const readiness = guidedTutorialSteps.find((step) => step.id === 'event-readiness')
  const reconciliation = guidedTutorialSteps.find((step) => step.id === 'reconciliation')
  assert.equal(tasks.targetId, 'tasks-workspace')
  assert.equal(runOfShow.targetId, 'run-of-show-workspace')
  assert.equal(resources.targetId, 'resources-workspace')
  assert.equal(documents.targetId, 'documents-workspace')
  assert.equal(contacts.targetId, 'contacts-workspace')
  assert.equal(readiness.targetId, 'event-readiness-summary')
  assert.equal(reconciliation.targetId, 'reconciliation-workspace')
  assert.match(tasks.what, /Tasks & Deadlines/)
  assert.match(runOfShow.what, /operational sequence/)
  assert.match(resources.next, /relationships only/)
  assert.match(readiness.what, /Ready, Needs Attention, or At Risk/)
  assert.match(reconciliation.what, /without saving changes/)
  assert.equal(guidedTutorialSteps.every((step) => step.writesBusinessData === false), true)
})

test('final refinement guardrails preserve QR, dependencies, rules, indexes, and false integration boundaries', async () => {
  const packageJson = JSON.parse(await source('package.json'))
  const settings = await source('src/pages/SettingsPage.jsx')
  const qa = await source('src/pages/QaPage.jsx')
  const rules = await source('firestore.rules')
  const indexes = await source('firestore.indexes.json')

  assert.equal(qrPayloadForTicketCode('FINAL-001'), 'GSV:TICKET:FINAL-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(`${settings}\n${qa}`, /No payment gateway is connected/)
  assert.match(`${settings}\n${qa}`, /No Gmail OAuth|Gmail OAuth or automatic sending is connected/)
  assert.match(`${settings}\n${qa}`, /Scanned PDFs and OCR are not supported|Scanned PDF\/OCR intake is not supported/)
  assert.doesNotMatch(`${settings}\n${qa}`, /sendEmail|sendWhatsapp|sendSms|connectGmail|payment gateway connected/i)
})
