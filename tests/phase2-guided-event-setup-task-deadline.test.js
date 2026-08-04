import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildEventSetupProgress,
  buildTaskDeadlineSummary,
  EVENT_SETUP_STAGE_CONFIG,
} from '../src/utils/eventPlanning.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const completeEvent = {
  eventId: 'event-phase-2',
  eventName: 'Guided Setup Event',
  eventDate: '2026-09-15',
  eventType: 'food-event',
  eventStartTime: '14:00',
  venueName: 'Event Hall',
  location: 'Bridgetown',
  status: 'planning',
  capacity: 75,
  ticketPrice: 80,
  registrationRequired: true,
  registrationOpenDate: '2026-08-01',
  financialPlan: { projectedRegistrationIncome: 6000, venueBudget: 1200 },
  operationsPlan: {
    venueAccessTime: '11:00',
    emergencyContact: 'Organizer 555-0100',
    timeline: [{ timelineId: 'timeline-1', time: '13:00', label: 'Doors open' }],
  },
  readinessChecklist: {
    venueConfirmed: true,
    venueAccessConfirmed: true,
    paymentMethodsConfigured: true,
    suppliersConfirmed: true,
    staffAssigned: true,
    eventDayTimelineReady: true,
    ticketProcessReady: true,
    checkInProcessReady: true,
    communicationsPrepared: true,
    licencesReviewed: true,
    insuranceReviewed: true,
  },
  planningTasks: [{ taskId: 'task-1', title: 'Confirm signage', dueDate: '2026-08-03', priority: 'High', status: 'To Do', category: 'Event Day' }],
}

test('guided event setup progress follows the standard stages without new routes or collections', () => {
  assert.deepEqual(EVENT_SETUP_STAGE_CONFIG.map((stage) => stage.id), ['profile', 'registration', 'money', 'operations', 'readiness'])

  const partial = buildEventSetupProgress({ ...completeEvent, financialPlan: {}, operationsPlan: {}, planningTasks: [] })
  assert.equal(partial.completedCount < partial.totalCount, true)
  assert.equal(partial.nextStage?.id, 'money')

  const complete = buildEventSetupProgress(completeEvent)
  assert.equal(complete.completedCount, complete.totalCount)
  assert.equal(complete.nextStage, null)
  assert.equal(complete.label, 'Setup complete')
})

test('task deadline summary separates overdue, today, soon, open, and completed work', () => {
  const summary = buildTaskDeadlineSummary([
    { taskId: 'overdue', title: 'Pay venue balance', dueDate: '2026-07-31', priority: 'High', status: 'To Do', category: 'Finance' },
    { taskId: 'today', title: 'Send final reminder', dueDate: '2026-08-01', priority: 'Medium', status: 'In Progress', category: 'Marketing' },
    { taskId: 'soon', title: 'Print wristbands', dueDate: '2026-08-05', priority: 'Low', status: 'To Do', category: 'Event Day' },
    { taskId: 'done', title: 'Book venue', dueDate: '2026-07-15', priority: 'High', status: 'Completed', category: 'Venue' },
    { taskId: 'undated', title: 'Review signage', dueDate: '', priority: 'Low', status: 'To Do', category: 'Supplies' },
  ], new Date('2026-08-01T12:00:00'))

  assert.equal(summary.open, 4)
  assert.equal(summary.completed, 1)
  assert.equal(summary.overdue, 1)
  assert.equal(summary.dueToday, 1)
  assert.equal(summary.dueSoon, 1)
  assert.equal(summary.noDueDate, 1)
  assert.equal(summary.nextTask.taskId, 'overdue')
  assert.equal(summary.label, '1 overdue')
})

test('Events and planning workspace present guided setup and deadlines on existing event workflow', async () => {
  const eventsPage = await readFile('src/pages/EventsPage.jsx', 'utf8')
  const planningWorkspace = await readFile('src/components/events/EventPlanningWorkspace.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(eventsPage, /SetupStageBadge/)
  assert.match(eventsPage, /DeadlineLine/)
  assert.match(planningWorkspace, /Guided setup/)
  assert.match(planningWorkspace, /Task deadline focus/)
  assert.match(planningWorkspace, /buildEventSetupProgress/)
  assert.match(planningWorkspace, /buildTaskDeadlineSummary/)
  assert.match(app, /path="\/events"/)
  assert.doesNotMatch(app, /event-tasks|setup-wizard/)
  assert.match(rules, /planningTasks/)
  assert.equal(qrPayloadForTicketCode('PH2-001'), 'GSV:TICKET:PH2-001')
})

test('Phase 2 standards and result documents exist without making CPB special', async () => {
  const plan = await readFile('docs/archive/phases/GUIDED_EVENT_SETUP_AND_TASKS_PLAN_2026-08.md', 'utf8')
  const result = await readFile('docs/archive/releases/GUIDED_EVENT_SETUP_RESULT_2026-08.md', 'utf8')
  const setupStandard = await readFile('docs/EVENT_SETUP_STAGE_STANDARD.md', 'utf8')
  const taskStandard = await readFile('docs/EVENT_TASK_AND_DEADLINE_STANDARD.md', 'utf8')
  const statusStandard = await readFile('docs/TASK_STATUS_AND_PRIORITY_STANDARD.md', 'utf8')

  for (const documentText of [plan, result, setupStandard, taskStandard, statusStandard]) {
    assert.match(documentText, /CODEX_DEMO/)
    assert.doesNotMatch(documentText, /CODEX_TEST/)
    assert.doesNotMatch(documentText, /CPB-specific|zero-write|hardcoded totals/)
  }

  assert.match(result, /Routes preserved/)
  assert.match(setupStandard, /Event Profile/)
  assert.match(taskStandard, /Due soon/)
  assert.match(statusStandard, /High/)
})
