import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  ARRIVAL_STATUSES,
  RUN_OF_SHOW_CATEGORIES,
  RUN_OF_SHOW_STATUSES,
  buildRunOfShowSummary,
  buildTimelineState,
  createEmptyRunOfShowItem,
  normalizeRunOfShowItem,
  runOfShowTaskPrefill,
  sortRunOfShowItems,
  unresolvedDependencies,
  validateRunOfShowItem,
} from '../src/utils/runOfShow.js'
import {
  RESOURCE_CATEGORIES,
  RESOURCE_SOURCE_TYPES,
  RESOURCE_STATUSES,
  buildResourceSummary,
  createEmptyResource,
  normalizeEventResource,
  resourceTaskPrefill,
  validateEventResource,
} from '../src/utils/eventResources.js'
import { buildEventReadiness } from '../src/utils/eventReadiness.js'
import { MOBILE_PRIMARY_NAV_ITEMS } from '../src/utils/navigation.js'
import { canViewRoute } from '../src/utils/accessRoles.js'
import { QR_TICKET_PREFIX, qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase Run of Show and Resources routes are preserved and scanner navigation remains isolated', async () => {
  const appShell = await readFile('src/layout/AppShell.jsx', 'utf8')

  assert.match(appShell, /label: 'Run of Show'/)
  assert.match(appShell, /label: 'Equipment & Supplies'/)
  assert.match(appShell, /to: '\/run-of-show'/)
  assert.match(appShell, /to: '\/resources'/)
  assert.ok(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.to === '/check-in'))
  assert.ok(MOBILE_PRIMARY_NAV_ITEMS.every((item) => item.to !== '/run-of-show' && item.to !== '/resources'))

  const scannerAccess = { role: 'scanner', allowedRoutes: ['/scanner'] }
  const managerAccess = { role: 'event-manager', allowedRoutes: ['/dashboard', '/check-in', '/tasks', '/documents'] }
  assert.equal(canViewRoute(scannerAccess, '/scanner'), true)
  assert.equal(canViewRoute(scannerAccess, '/run-of-show'), false)
  assert.equal(canViewRoute(scannerAccess, '/resources'), false)
  assert.equal(canViewRoute(managerAccess, '/run-of-show'), false)
  assert.equal(canViewRoute(managerAccess, '/resources'), false)
})

test('Run of Show supports event-day sequencing, dependencies, arrivals, and task prefill', () => {
  assert.ok(RUN_OF_SHOW_CATEGORIES.includes('Supplier Arrival'))
  assert.ok(RUN_OF_SHOW_STATUSES.includes('Delayed'))
  assert.ok(ARRIVAL_STATUSES.includes('Arrived'))

  const item = createEmptyRunOfShowItem({
    eventId: 'event-1',
    eventName: 'Event One',
    title: 'Supplier drop-off',
    category: 'Supplier Arrival',
    date: '2026-09-01',
    startTime: '13:00',
    endTime: '13:30',
    responsibleContactId: 'legacy-contact-1',
    actualArrivalTime: '13:05',
    linkedDocumentIds: ['legacy-doc-1'],
    linkedResourceIds: ['resource-1'],
    criticalForEvent: true,
  })
  const normalized = normalizeRunOfShowItem(item)

  assert.equal(validateRunOfShowItem(normalized).length, 0)
  assert.equal(normalized.responsibleContactId, 'legacy-contact-1')
  assert.equal(normalized.actualArrivalTime, '13:05')
  assert.equal(normalized.criticalForEvent, true)
  assert.deepEqual(normalized.linkedDocumentIds, ['legacy-doc-1'])

  const delayed = normalizeRunOfShowItem({ ...normalized, itemId: 'ros-1', status: 'Delayed', dependencyItemIds: ['missing-item'] })
  const planned = normalizeRunOfShowItem({ ...normalized, itemId: 'ros-2', title: 'Doors open', startTime: '16:00', status: 'Planned' })
  const sorted = sortRunOfShowItems([planned, delayed])
  const summary = buildRunOfShowSummary(sorted)

  assert.equal(sorted[0].itemId, 'ros-1')
  assert.equal(summary.total, 2)
  assert.equal(summary.delayed, 1)
  assert.equal(summary.criticalDelayed, 1)
  assert.equal(unresolvedDependencies(delayed, sorted).length, 0)
  assert.equal(buildTimelineState(sorted, new Date('2026-09-01T15:00:00')).next.itemId, 'ros-2')
  assert.deepEqual(buildTimelineState(sorted, new Date('2026-09-01T15:00:00')).recentlyCompleted, [])
  assert.match(runOfShowTaskPrefill(delayed).title, /Follow up:/)
})

test('Resources support quantities, packing lifecycle, old links, and task prefill', () => {
  assert.ok(RESOURCE_CATEGORIES.includes('Equipment'))
  assert.ok(RESOURCE_SOURCE_TYPES.includes('Supplier Provided'))
  assert.ok(RESOURCE_STATUSES.includes('On Site'))

  const resource = normalizeEventResource(createEmptyResource({
    eventId: 'event-1',
    eventName: 'Event One',
    name: 'Folding tables',
    category: 'Equipment',
    sourceType: 'Rented',
    quantityNeeded: 10,
    quantityConfirmed: 6,
    linkedDocumentIds: ['legacy-doc-2'],
    linkedRunOfShowItemIds: ['ros-setup'],
    packingRequired: true,
    pickupRequired: true,
    pickupDueDate: '2026-08-05',
    returnRequired: true,
    returnDueDate: '2026-08-05',
    criticalForEvent: true,
  }))
  const validation = validateEventResource(resource)
  const summary = buildResourceSummary([resource, normalizeEventResource({ ...resource, resourceId: 'resource-2', quantityNeeded: 2, quantityConfirmed: 2, status: 'On Site' })], new Date('2026-08-06T12:00:00'))

  assert.equal(validation.length, 0)
  assert.equal(summary.total, 2)
  assert.equal(summary.shortages, 1)
  assert.equal(summary.criticalShortages, 1)
  assert.equal(summary.needed, 1)
  assert.equal(summary.packingIncomplete, 1)
  assert.equal(summary.pickupDue, 1)
  assert.match(resourceTaskPrefill(resource).title, /Resource follow-up/)
})

test('Overview readiness includes event-scoped Run of Show and Resources without changing finance boundaries', () => {
  const event = {
    eventId: 'event-1',
    eventName: 'Event One',
    status: 'planning',
    eventDate: '2026-09-01',
    capacity: 20,
    ticketPrice: 100,
    financialPlan: {},
    operationsPlan: {},
    readinessChecklist: {},
  }
  const registration = {
    registrationId: 'reg-1',
    eventId: 'event-1',
    fullName: 'Guest One',
    personsAttending: 2,
    amountPaid: 100,
    amountDue: 200,
    paymentStatus: 'partial',
  }
  const readiness = buildEventReadiness(event, [registration], [], [
    normalizeRunOfShowItem({
      itemId: 'critical-arrival',
      eventId: 'event-1',
      eventName: 'Event One',
      title: 'Supplier arrival',
      category: 'Supplier Arrival',
      date: '2026-09-01',
      startTime: '11:00',
      status: 'Delayed',
      arrivalStatus: 'Delayed',
      criticalForEvent: true,
    }),
  ], [
    normalizeEventResource({
      resourceId: 'critical-resource',
      eventId: 'event-1',
      eventName: 'Event One',
      name: 'Tent',
      quantityNeeded: 1,
      quantityConfirmed: 0,
      status: 'Needed',
      criticalForEvent: true,
    }),
  ])

  assert.ok(readiness.actionItems.some((item) => item.to === '/run-of-show'))
  assert.ok(readiness.actionItems.some((item) => item.to === '/resources'))
  assert.equal(readiness.eventDayReadiness.status, 'At Risk')
  assert.ok(readiness.eventDayReadiness.reasons.some((item) => item.key === 'critical-run-of-show-delayed'))
  assert.ok(readiness.eventDayReadiness.reasons.some((item) => item.key === 'critical-resource-shortage'))
  assert.equal(readiness.metrics.totalRegistrations, 1)
  assert.equal(readiness.metrics.totalPersons, 2)
  assert.equal(readiness.operationsTotals.income, 0)
})

test('Run of Show and Resources forms use practical relationship selectors instead of manual ID entry', async () => {
  const [runOfShowPage, resourcesPage] = await Promise.all([
    readFile('src/pages/RunOfShowPage.jsx', 'utf8'),
    readFile('src/pages/ResourcesPage.jsx', 'utf8'),
  ])

  for (const text of ['Responsible staff', 'Responsible contact', 'Responsible organization', 'Linked task', 'Linked documents', 'Critical for event-day readiness']) {
    assert.match(runOfShowPage, new RegExp(text))
  }
  for (const text of ['Supplier contact', 'Supplier organization', 'Linked Operations entry', 'Linked commitment', 'Requested', 'Ordered / Reserved']) {
    assert.match(resourcesPage, new RegExp(text))
  }
  assert.doesNotMatch(runOfShowPage, /Responsible contact ID/)
  assert.doesNotMatch(resourcesPage, /Supplier contact ID/)
})

test('Run of Show and Resources actions provide success feedback and contextual delete confirmation', async () => {
  const [runOfShowPage, resourcesPage] = await Promise.all([
    readFile('src/pages/RunOfShowPage.jsx', 'utf8'),
    readFile('src/pages/ResourcesPage.jsx', 'utf8'),
  ])

  for (const text of [
    'Run of Show item added.',
    'Run of Show item updated.',
    'Run of Show item deleted.',
    'Run of Show item marked ${status}.',
    'Delete Run of Show item?',
    'This removes the item from the event-day sequence',
  ]) {
    assert.ok(runOfShowPage.includes(text), text)
  }

  for (const text of [
    'Resource added.',
    'Resource updated.',
    'Resource deleted.',
    'Resource marked ${status}.',
    'Delete resource?',
    'This removes the resource from ${activeEvent?.eventName',
  ]) {
    assert.ok(resourcesPage.includes(text), text)
  }

  assert.match(runOfShowPage, /ConfirmDialog/)
  assert.match(resourcesPage, /ConfirmDialog/)
  assert.doesNotMatch(runOfShowPage, /window\.confirm/)
  assert.doesNotMatch(resourcesPage, /window\.confirm/)
  assert.match(runOfShowPage, /role="status"/)
  assert.match(resourcesPage, /role="status"/)
  const tasksPage = await readFile('src/pages/TasksPage.jsx', 'utf8')
  assert.match(tasksPage, /role="status"/)
  assert.match(tasksPage, /aria-label="Task summary"/)
  assert.doesNotMatch(tasksPage, /aria-label="Task status summary"/)
  assert.match(runOfShowPage, /No local success state was applied/)
  assert.match(resourcesPage, /organizerSaveErrorMessage/)
})

test('Guardrail source checks remain explicit', async () => {
  const [app, rules, packageJson, ticketService] = await Promise.all([
    readFile('src/App.jsx', 'utf8'),
    readFile('firestore.rules', 'utf8'),
    readFile('package.json', 'utf8'),
    readFile('src/utils/qrTicketUtils.js', 'utf8'),
  ])

  assert.match(app, /path="\/run-of-show"/)
  assert.match(app, /path="\/resources"/)
  assert.match(rules, /match \/events\/\{eventId\}\/runOfShow\/\{itemId\}/)
  assert.match(rules, /match \/events\/\{eventId\}\/resources\/\{resourceId\}/)
  assert.doesNotMatch(packageJson, /"xlsx"/)
  assert.match(ticketService, /QR_TICKET_PREFIX = 'GSV:TICKET:'/)
  assert.equal(QR_TICKET_PREFIX, 'GSV:TICKET:')
  assert.equal(qrPayloadForTicketCode('RUN-001'), 'GSV:TICKET:RUN-001')
})
