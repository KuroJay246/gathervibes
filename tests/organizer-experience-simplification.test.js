import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { pageGuidance } from '../src/utils/pageGuidance.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

async function source(path) {
  return readFile(path, 'utf8')
}

test('organizer navigation is grouped by real work and exposes page purpose actions', async () => {
  const shell = await source('src/layout/AppShell.jsx')

  for (const group of ['Plan', 'Guests & Attendance', 'Event Day', 'Money & Follow-Up', 'Tools', 'System']) {
    assert.match(shell, new RegExp(`label: '${group}'`))
  }

  for (const [route, action] of Object.entries({
    '/dashboard': 'Review Needs Attention',
    '/registrations': 'Add Registration',
    '/payments': 'Review payment follow-up',
    '/run-of-show': 'Add Run of Show item',
    '/resources': 'Add Resource',
    '/documents': 'Add Document',
    '/contacts': 'Add Contact',
    '/communications': 'Create and copy message',
    '/event-review': 'Review report',
    '/qa': 'Run QA Checks',
  })) {
    assert.equal(pageGuidance[route].primaryAction, action)
  }

  assert.match(shell, /Primary action/)
  assert.match(shell, /Automatic boundary/)
  assert.match(shell, /to: '\/communications', label: 'Message Builder'/)
  assert.match(shell, /to: '\/event-review', label: 'Reports'/)
  assert.match(shell, /to: '\/contacts', label: 'Contacts & Organizations'/)
  assert.match(shell, /Training event · safe to practice/)
  assert.doesNotMatch(shell, /Demo \/ training event: example data only/)
})

test('planning forms explain required fields, status meaning, and non-automatic relationships', async () => {
  const tasks = await source('src/pages/TasksPage.jsx')
  const runOfShow = await source('src/pages/RunOfShowPage.jsx')
  const resources = await source('src/pages/ResourcesPage.jsx')
  const documents = await source('src/pages/DocumentsPage.jsx')
  const contacts = await source('src/pages/ContactsPage.jsx')

  assert.match(tasks, /Status help/)
  assert.match(tasks, /Saving this task does not automatically change linked resources, documents, money, tickets, or attendance/)
  assert.match(runOfShow, /Assigning a contact does not give app access/)
  assert.match(runOfShow, /Linking a Task, Resource, or Document does not complete it or change its status/)
  assert.match(resources, /Shortage is based on needed minus confirmed/)
  assert.match(resources, /Linking an Operations entry does not change an amount/)
  assert.match(documents, /Gather & Savor does not upload, copy, scan, or delete the file/)
  assert.match(documents, /They do not change contact access, complete a task, update money, or alter any external document/)
  assert.match(contacts, /Contacts & Organizations/)
  assert.match(contacts, /does not give app access and does not change Tasks, Documents, Run of Show, or money records/)
})

test('simplification guardrails keep data model, QR, dependencies, and rules untouched by UI copy', async () => {
  const packageJson = JSON.parse(await source('package.json'))
  const rules = await source('firestore.rules')
  const indexes = await source('firestore.indexes.json')
  const access = await source('src/utils/accessRoles.js')
  const scanner = await source('src/pages/ScannerPage.jsx')

  assert.equal(qrPayloadForTicketCode('SIMPLIFY-001'), 'GSV:TICKET:SIMPLIFY-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(access, /protectedOwner/)
  assert.match(access, /scanner:[\s\S]*'\/scanner'/)
  assert.doesNotMatch(access, /scanner:[\s\S]*'\/qa'|lead-scanner|leadScanner/i)
  assert.doesNotMatch(scanner, /lead-scanner|leadScanner/i)
  assert.match(scanner, /Undo Check-In is admin-only/)
})
