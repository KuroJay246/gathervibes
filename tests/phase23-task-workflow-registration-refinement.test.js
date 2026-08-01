import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildTaskWorkflowSummary,
  filterTasks,
  normalizeTask,
  taskDueState,
  TASK_CATEGORY_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '../src/utils/taskWorkflow.js'
import {
  canManageTasks,
  canViewRoute,
  canViewTasks,
  getUserAccessLevel,
} from '../src/utils/accessRoles.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'

function staffAccess(role) {
  const user = { uid: `${role}-uid`, email: `${role}@example.com` }
  return getUserAccessLevel(
    user,
    null,
    { uid: user.uid, email: user.email, displayName: role, status: 'active', defaultRole: role },
    [{ uid: user.uid, email: user.email, eventId: EVENT_ID, role, status: 'active' }],
    [{ eventId: EVENT_ID, eventName: 'CODEX_TEST Live Verification Event' }],
  )
}

test('Phase 23 task workflow uses required statuses priorities categories and date filters', () => {
  assert.deepEqual(TASK_STATUS_OPTIONS, ['Not Started', 'In Progress', 'Waiting on Someone', 'Blocked', 'Completed', 'Cancelled'])
  assert.deepEqual(TASK_PRIORITY_OPTIONS, ['Low', 'Normal', 'High', 'Urgent'])
  assert.ok(TASK_CATEGORY_OPTIONS.includes('Guests and Registration'))
  assert.ok(TASK_CATEGORY_OPTIONS.includes('Equipment and Supplies'))

  const tasks = [
    { taskId: 'overdue', title: 'Past due', dueDate: '2026-07-31', status: 'Not Started', priority: 'Urgent', category: 'Event Day' },
    { taskId: 'today', title: 'Due today', dueDate: '2026-08-01', status: 'In Progress', priority: 'High', category: 'Venue' },
    { taskId: 'soon', title: 'Soon', dueDate: '2026-08-05', status: 'Waiting on Someone', priority: 'Normal', category: 'Marketing' },
    { taskId: 'blocked', title: 'Blocked', dueDate: '2026-08-10', status: 'Blocked', priority: 'High', category: 'Documents' },
    { taskId: 'done', title: 'Done', dueDate: '2026-07-15', status: 'Completed', priority: 'Low', category: 'Other' },
    { taskId: 'cancelled', title: 'Cancelled', dueDate: '2026-07-15', status: 'Cancelled', priority: 'Low', category: 'Other' },
  ]

  const now = new Date('2026-08-01T12:00:00')
  assert.equal(taskDueState(tasks[0], now), 'overdue')
  assert.equal(taskDueState(tasks[1], now), 'today')
  assert.equal(taskDueState(tasks[2], now), 'soon')
  assert.equal(taskDueState(tasks[4], now), 'closed')
  assert.equal(taskDueState(tasks[5], now), 'closed')
  assert.deepEqual(filterTasks(tasks, 'Waiting', now).map((task) => task.taskId), ['soon'])
  assert.equal(buildTaskWorkflowSummary(tasks, now).overdue, 1)
  assert.equal(buildTaskWorkflowSummary(tasks, now).blocked, 1)
  assert.equal(normalizeTask({ title: 'New task' }).status, 'Not Started')
})

test('Phase 23 route labels preserve paths and keep scanner isolated from tasks', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const navigation = await readFile('src/utils/navigation.js', 'utf8')

  assert.match(app, /path="\/tasks"/)
  assert.match(shell, /Tasks & Deadlines/)
  assert.match(shell, /'\/tasks': \['Tasks & Deadlines'/)
  assert.doesNotMatch(navigation, /\/tasks/)

  const admin = getUserAccessLevel({ uid: 'admin', email: 'admin@example.com' }, { approvedEmails: ['admin@example.com'] })
  const eventManager = staffAccess('event-manager')
  const viewer = staffAccess('viewer')
  const scanner = staffAccess('scanner')
  const operationsHelper = staffAccess('operations-helper')

  assert.equal(canViewTasks(admin, EVENT_ID), true)
  assert.equal(canManageTasks(admin, EVENT_ID), true)
  assert.equal(canViewTasks(eventManager, EVENT_ID), true)
  assert.equal(canManageTasks(eventManager, EVENT_ID), true)
  assert.equal(canViewTasks(viewer, EVENT_ID), true)
  assert.equal(canManageTasks(viewer, EVENT_ID), false)
  assert.equal(canViewTasks(scanner, EVENT_ID), false)
  assert.equal(canViewRoute(scanner, '/tasks'), false)
  assert.equal(canViewTasks(operationsHelper, EVENT_ID), false)
})

test('Phase 23 Firestore rules define scoped task documents and task audit actions', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(rules, /match \/events\/\{eventId\}\/tasks\/\{taskId\}/)
  assert.match(rules, /validTask\(request\.resource\.data, eventId, taskId\)/)
  assert.match(rules, /canReadTask\(eventId\)/)
  assert.match(rules, /isAssignedViewer\(eventId\)/)
  assert.match(rules, /canManageTask\(eventId\)/)
  assert.match(rules, /isAssignedEventManager\(eventId\)/)
  assert.doesNotMatch(rules, /canReadTask[\s\S]{0,180}isAssignedScanner/)
  assert.match(rules, /'task\.create'[\s\S]*'task\.delete'/)
  assert.match(rules, /matchesTaskMutation/)
  assert.match(rules, /validTaskStatus/)
  assert.equal(qrPayloadForTicketCode('TASK-001'), 'GSV:TICKET:TASK-001')
})

test('Phase 23 registration refinement exposes supported source ticket and attendance filters without formula changes', async () => {
  const filters = await readFile('src/components/registrations/RegistrationFilters.jsx', 'utf8')
  const page = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const card = await readFile('src/components/registrations/RegistrationCard.jsx', 'utf8')
  const form = await readFile('src/components/registrations/RegistrationFormModal.jsx', 'utf8')

  assert.match(filters, /Registration source filter/)
  assert.match(filters, /Ticket state filter/)
  assert.match(filters, /Attendance state filter/)
  assert.match(page, /sourceLabel/)
  assert.match(page, /deriveAttendanceRecordType/)
  assert.match(card, /Record Source/)
  assert.match(form, /Registration and guest identity/)
  assert.match(form, /Registration payment fields/)
  assert.doesNotMatch(page, /amountDue\s*=\s*ticketPrice/)
})
