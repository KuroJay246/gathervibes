import test from 'node:test'
import assert from 'node:assert/strict'

import { FEATURE_MODULE_DIRECTORIES, READ_MODEL_REQUIREMENTS } from '../src/features/architecture/contracts/featureModuleStandard.js'
import { buildCheckInQueueModel } from '../src/features/checkin/readModels/checkInQueueModel.js'
import { IMPORT_LIMITS } from '../src/features/imports/contracts/importLimits.js'
import { buildImportPreviewModel } from '../src/features/imports/readModels/importPreviewModel.js'
import { buildOperationsSummaryModel } from '../src/features/operations/readModels/operationsSummaryModel.js'
import { REGISTRATION_TABS } from '../src/features/registrations/contracts/registrationFilters.js'
import { buildRegistrationListModel, filterRegistrationRows } from '../src/features/registrations/readModels/registrationListModel.js'
import { buildDashboardOverviewModel, buildRecentActivity } from '../src/features/dashboard/readModels/dashboardOverviewModel.js'

const event = {
  eventId: 'codex_demo_full_system_walkthrough',
  eventName: 'CODEX_DEMO - Full System Walkthrough',
  defaultTicketPrice: 50,
  capacity: 100,
}

const currentRegistration = {
  registrationId: 'reg-current',
  eventId: event.eventId,
  fullName: 'Current Guest',
  email: 'guest@example.test',
  phone: '2465550100',
  paymentStatus: 'paid',
  amountDue: 50,
  amountPaid: 50,
  personsAttending: 1,
  ticketCode: 'GSV-001',
  ticketStatus: 'assigned',
  checkedIn: true,
  checkInTime: '2026-11-14T15:00:00Z',
  updatedAt: '2026-11-14T15:05:00Z',
}

const historicalRegistration = {
  registrationId: 'reg-historical',
  eventId: event.eventId,
  buyerName: 'Legacy Buyer',
  attendeeNames: ['Legacy Guest', 'Second Guest'],
  email: 'guest@example.test',
  phone: '2465550101',
  paymentStatus: 'door-list',
  amountDue: null,
  amountPaid: null,
  personsAttending: 2,
  ticketCode: '',
  ticketStatus: 'no-ticket-assigned',
  checkedIn: false,
  createdAt: '2026-11-13T10:00:00Z',
}

test('feature architecture contract defines required module ownership', () => {
  assert.deepEqual(FEATURE_MODULE_DIRECTORIES, ['components', 'hooks', 'services', 'validators', 'readModels', 'contracts', 'tests'])
  assert.ok(READ_MODEL_REQUIREMENTS.includes('historical-record-compatible'))
  assert.ok(REGISTRATION_TABS.includes('Missing Ticket Code'))
  assert.equal(IMPORT_LIMITS.maxRowsPerBatch, 500)
})

test('registration list read model preserves current and historical filtering behavior', () => {
  const registrations = [currentRegistration, historicalRegistration, { registrationId: 'malformed', eventId: event.eventId }]
  const model = buildRegistrationListModel({
    registrations,
    event,
    activeTab: 'Missing Ticket Code',
    filters: { duplicateContacts: true },
    selectedIds: new Set(['reg-historical']),
  })

  assert.equal(model.filteredRegistrations.length, 1)
  assert.equal(model.filteredRegistrations[0].registrationId, 'reg-historical')
  assert.equal(model.allMetrics.totalRegistrations, 3)
  assert.equal(model.allMetrics.totalPersons, 4)
  assert.equal(model.selectedRegistrations.length, 1)
  assert.equal(model.activeFilterCount, 2)
  assert.match(model.showingText, /Showing 1 registration covering 2 guests/)
})

test('registration filter rejects unsafe mismatches without side effects', () => {
  const before = JSON.stringify(historicalRegistration)
  const rows = filterRegistrationRows({
    registrations: [historicalRegistration],
    event,
    activeTab: 'All',
    filters: { ticketState: 'assigned' },
  })

  assert.equal(rows.length, 0)
  assert.equal(JSON.stringify(historicalRegistration), before)
})

test('import preview model enforces preview and batch limit state', () => {
  const model = buildImportPreviewModel({
    parsedData: { headers: ['Full Name'], rows: Array.from({ length: 1001 }, (_, index) => [`Guest ${index}`]) },
    processedRows: [{ status: 'valid', defaultAction: 'keep-separate' }, { status: 'needs-review', defaultAction: 'needs-review' }],
    finalRows: Array.from({ length: 501 }, (_, index) => ({ row: { registrationId: `r-${index}` } })),
    reviewActions: {},
    existingRegistrationsLoaded: true,
  })

  assert.equal(model.headerCount, 1)
  assert.equal(model.rowLimitExceeded, true)
  assert.equal(model.batchLimitExceeded, true)
  assert.equal(model.canProceedToValidation, true)
  assert.equal(model.canCommit, false)
  assert.equal(model.needsReviewRowCount, 1)
})

test('operations summary read model keeps registration payments separate from operations ledger', () => {
  const model = buildOperationsSummaryModel({
    event,
    registrations: [currentRegistration],
    entries: [
      { ledgerEntryId: 'income-1', eventId: event.eventId, entryType: 'income', status: 'received', amount: 100, label: 'Sponsor income' },
      { ledgerEntryId: 'expense-1', eventId: event.eventId, entryType: 'expense', status: 'pending', amount: 40, label: 'Decor balance' },
    ],
    filters: { type: 'expense', status: 'all', category: '', search: '' },
  })

  assert.equal(model.filteredEntries.length, 1)
  assert.equal(model.registrationFinanceSummary.totalCollected, 50)
  assert.equal(model.operationsTotals.income, 100)
  assert.equal(model.filteredTotals.expenses, 40)
  assert.equal(model.operationsSettlement.incomeReceived, 100)
  assert.equal(model.operationsControl.pendingExpenses, 40)
})

test('dashboard overview read model derives view state without mutating records', () => {
  const registrations = [currentRegistration, historicalRegistration]
  const before = JSON.stringify(registrations)
  const model = buildDashboardOverviewModel({
    event: { ...event, updatedAt: '2026-11-14T16:00:00Z' },
    registrations,
    operationsEntries: [{ ledgerEntryId: 'op-1', label: 'Venue payment', updatedAt: '2026-11-14T15:30:00Z' }],
    tasks: [{ taskId: 'task-1', status: 'Not Started', dueDate: '2026-11-13' }],
  })

  assert.equal(model.metrics.totalRegistrations, 2)
  assert.equal(model.financeSummary.totalCollected, 50)
  assert.ok(Array.isArray(model.readiness.actionItems))
  assert.ok(model.taskSummary.total >= 1)
  assert.equal(model.recentActivity[0].source, 'Events')
  assert.equal(JSON.stringify(registrations), before)
})

test('recent activity sorts supported event, registration, and operations dates', () => {
  const activity = buildRecentActivity({
    event: { eventName: 'Event', updatedAt: '2026-11-14T11:00:00Z' },
    registrations: [{ registrationId: 'r1', fullName: 'Guest', updatedAt: '2026-11-14T12:00:00Z' }],
    operationsEntries: [{ ledgerEntryId: 'o1', label: 'Ops', updatedAt: '2026-11-14T13:00:00Z' }],
  })

  assert.deepEqual(activity.map((item) => item.source), ['Operations', 'Guests & Registrations', 'Events'])
})

test('check-in queue model keeps lookup, helper rows, duplicate state, and recent rows event scoped', () => {
  const model = buildCheckInQueueModel({
    registrations: [currentRegistration, historicalRegistration],
    event,
    activeView: 'not-checked-in',
    helperView: 'missing-ticket',
    searchQuery: 'legacy',
  })

  assert.equal(model.visibleRegistrations.length, 1)
  assert.equal(model.matches.length, 1)
  assert.equal(model.selectedRegistration.registrationId, 'reg-historical')
  assert.equal(model.helperRows.length, 1)
  assert.equal(model.recentCheckIns.length, 1)
  assert.equal(model.checkInState.allowed, true)
  assert.ok(model.selectedWarnings.length >= 1)
})
