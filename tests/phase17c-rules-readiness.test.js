import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  canAssignTickets,
  canCheckIn,
  canReadRegistrations,
  canUseOperations,
  canUseSettings,
  canViewRoute,
  getUserAccessLevel,
} from '../src/utils/accessRoles.js'
import { getRegistrationGuestSummary } from '../src/utils/registrationMetrics.js'
import { getTicketPrefix } from '../src/utils/ticketUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const STAFF_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'
const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'

async function rulesText() {
  return readFile('firestore.rules', 'utf8')
}

function accessFor(role, eventId = STAFF_EVENT_ID, status = 'active', assignmentStatus = 'active') {
  const user = { uid: `${role}-uid`, email: `${role}@example.com` }
  return getUserAccessLevel(
    user,
    null,
    { uid: user.uid, email: user.email, displayName: role, status, defaultRole: role },
    [{ uid: user.uid, email: user.email, eventId, role, status: assignmentStatus }],
    [{ eventId, eventName: 'CODEX_TEST Live Verification Event' }],
  )
}

test('Phase 17C-A rules keep unauthenticated and public access denied', async () => {
  const rules = await rulesText()

  assert.match(rules, /function isSignedIn\(\) \{\s*return request\.auth != null;/)
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(rules, /allow (read|write|create|update|delete|list|get): if request\.auth != null/)
})

test('Phase 17C-A rules preserve approved-admin boundary and protected settings', async () => {
  const rules = await rulesText()

  assert.match(rules, /function isApprovedAdmin\(\)/)
  assert.match(rules, /settings\/accessControl/)
  assert.match(rules, /request\.auth\.token\.email\.lower\(\) in/)
  assert.match(rules, /match \/settings\/accessControl \{[\s\S]*allow get: if isApprovedAdmin\(\);[\s\S]*allow list, create, update, delete: if false;/)
  assert.match(rules, /match \/settings\/\{documentId\} \{[\s\S]*allow read, write: if false;/)
})

test('Phase 17C-A rules allow only admins to manage staff profiles and assignments', async () => {
  const rules = await rulesText()

  assert.match(rules, /match \/staffProfiles\/\{uid\} \{[\s\S]*allow get: if isApprovedAdmin\(\)[\s\S]*request\.auth\.uid == uid[\s\S]*resource\.data\.status == 'active'/)
  assert.match(rules, /match \/staffProfiles\/\{uid\} \{[\s\S]*allow list: if isApprovedAdmin\(\);[\s\S]*allow create: if isApprovedAdmin\(\)[\s\S]*allow update: if isApprovedAdmin\(\)[\s\S]*allow delete: if isApprovedAdmin\(\);/)
  assert.match(rules, /match \/events\/\{eventId\}\/staffAssignments\/\{uid\} \{[\s\S]*allow get: if isApprovedAdmin\(\)[\s\S]*request\.auth\.uid == uid[\s\S]*resource\.data\.eventId == eventId[\s\S]*resource\.data\.status == 'active'/)
  assert.match(rules, /validStaffAssignment\(request\.resource\.data, eventId, uid\)/)
  assert.match(rules, /request\.resource\.data\.eventId == resource\.data\.eventId/)
})

test('Phase 17C-A rules deny inactive or revoked staff through profile and assignment gates', async () => {
  const rules = await rulesText()

  assert.match(rules, /function activeStaffProfile\(\)[\s\S]*staffProfiles\/\$\(request\.auth\.uid\)[\s\S]*data\.status == 'active'/)
  assert.match(rules, /function activeStaffAssignment\(eventId\)[\s\S]*staffAssignments\/\$\(request\.auth\.uid\)[\s\S]*data\.uid == request\.auth\.uid[\s\S]*data\.eventId == eventId[\s\S]*data\.status == 'active'/)
  assert.equal(accessFor('scanner', STAFF_EVENT_ID, 'inactive').level, 'none')
  assert.equal(accessFor('scanner', STAFF_EVENT_ID, 'active', 'revoked').assignedEventIds.length, 0)
})

test('Phase 17C-A scanner rules are assigned-event read and check-in completion only', async () => {
  const rules = await rulesText()

  assert.match(rules, /allow read: if isApprovedAdmin\(\)[\s\S]*isAssignedScanner\(resource\.data\.eventId\)/)
  assert.match(rules, /isAssignedScanner\(resource\.data\.eventId\)[\s\S]*isValidRegistration\(request\.resource\.data, registrationId\)[\s\S]*isCheckInCompletionUpdate\(registrationId\)/)
  assert.match(rules, /function checkInCompletionChangedKeysOnly\(\)[\s\S]*affectedKeys\(\)\.hasOnly\(\[[\s\S]*'checkedIn', 'checkInTime', 'checkedInBy', 'updatedAt'/)
  assert.match(rules, /resource\.data\.checkedIn == false[\s\S]*request\.resource\.data\.checkedIn == true[\s\S]*request\.resource\.data\.checkInTime == request\.time[\s\S]*validPerformedBy\(request\.resource\.data\.checkedInBy\)[\s\S]*request\.resource\.data\.updatedAt == request\.time/)
  assert.doesNotMatch(rules, /isAssignedScanner\(resource\.data\.eventId\)[\s\S]{0,240}isCheckInUndoUpdate/)
})

test('Phase 17C-A scanner cannot alter payment contact ticket source import identity fields', async () => {
  const rules = await rulesText()
  const lockedFields = [
    'registrationId', 'eventId', 'source', 'sourceRowId', 'timestamp', 'createdAt',
    'fullName', 'email', 'phone', 'buyerName', 'attendeeNames', 'groupName',
    'personsAttending', 'paymentStatus', 'paymentReference', 'priceTier',
    'ticketPrice', 'amountDue', 'amountPaid', 'balanceDue', 'paymentMethod',
    'notes', 'ticketStatus', 'ticketCode', 'ticketAssignedAt', 'ticketAssignedBy',
  ]

  for (const field of lockedFields) {
    assert.match(rules, new RegExp(`${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  }
  assert.match(rules, /function registrationDetailsUnchanged\(\)/)
  assert.match(rules, /function ticketFieldsUnchanged\(\)/)
  assert.match(rules, /function isTicketAssignmentUpdate\(\)/)
  assert.match(rules, /function isTicketUnassignmentUpdate\(\)/)
  assert.match(rules, /allow delete: if isApprovedAdmin\(\);/)
})

test('Phase 17C-A viewer operations helper and event manager remain non-admin', () => {
  const viewer = accessFor('viewer')
  const ops = accessFor('operations-helper')
  const manager = accessFor('event-manager')

  assert.equal(canReadRegistrations(viewer, STAFF_EVENT_ID), true)
  assert.equal(canCheckIn(viewer, STAFF_EVENT_ID), false)
  assert.equal(canAssignTickets(viewer, STAFF_EVENT_ID), false)
  assert.equal(canUseSettings(viewer), false)
  assert.equal(canViewRoute(viewer, '/imports'), false)

  assert.equal(canUseOperations(ops, STAFF_EVENT_ID), true)
  assert.equal(canReadRegistrations(ops, STAFF_EVENT_ID), false)
  assert.equal(canAssignTickets(ops, STAFF_EVENT_ID), false)
  assert.equal(canUseSettings(ops), false)

  assert.equal(canReadRegistrations(manager, STAFF_EVENT_ID), true)
  assert.equal(canCheckIn(manager, STAFF_EVENT_ID), false)
  assert.equal(canAssignTickets(manager, STAFF_EVENT_ID), false)
  assert.equal(canUseSettings(manager), false)
})

test('Phase 17C-A audit logs remain append-only with scanner audit constrained to assigned check-in', async () => {
  const rules = await rulesText()

  assert.match(rules, /match \/auditLogs\/\{logId\} \{[\s\S]*allow read: if isApprovedAdmin\(\);/)
  assert.match(rules, /isAssignedScanner\(request\.resource\.data\.eventId\)[\s\S]*request\.resource\.data\.action == 'checkin\.complete'[\s\S]*matchesRegistrationMutation\(request\.resource\.data\)/)
  assert.match(rules, /request\.resource\.data\.action == 'checkin\.duplicate-attempt'[\s\S]*matchesDuplicateCheckInAttempt\(request\.resource\.data\)/)
  assert.match(rules, /allow update, delete: if false;/)
})

test('Phase 17C-A query review documents safe query constraints', async () => {
  const registrationService = await readFile('src/services/registrationService.js', 'utf8')
  const operationsService = await readFile('src/services/operationsLedgerService.js', 'utf8')
  const eventService = await readFile('src/services/eventService.js', 'utf8')
  const qaPage = await readFile('src/pages/QaPage.jsx', 'utf8')

  assert.match(eventService, /query\(collection\(firestore, 'events'\), orderBy\('eventDate', 'asc'\)\)/)
  assert.match(registrationService, /where\('eventId', '==', eventId\)[\s\S]*orderBy\('createdAt', 'desc'\)/)
  assert.match(operationsService, /where\('eventId', '==', eventId\)/)
  assert.match(qaPage, /query\(collection\(db, 'auditLogs'\), limit\(1\)\)/)
  assert.match(qaPage, /where\('eventId', '==', activeEvent\.eventId\)/)
})

test('Phase 17C-A regression helpers preserve clean account counts defaults and QR privacy', () => {
  const scanner = getUserAccessLevel(
    { uid: 'scanner-clean', email: 'scanner@example.com' },
    null,
    { uid: 'scanner-clean', email: 'scanner@example.com', status: 'active', defaultRole: 'scanner' },
    [],
  )

  assert.equal(scanner.level, 'none')
  assert.deepEqual(scanner.assignedEventIds, [])
  assert.equal(canCheckIn(scanner, STAFF_EVENT_ID), false)
  assert.equal(canCheckIn(scanner, CPB_EVENT_ID), false)
  assert.equal(getRegistrationGuestSummary([]), '0 registrations / 0 guests')
  assert.equal(getRegistrationGuestSummary([{ personsAttending: 2 }, {}, { personsAttending: 3 }]), '3 registrations / 6 guests')
  assert.equal(getTicketPrefix(null), 'GSV')
  assert.equal(qrPayloadForTicketCode('ABC123'), 'GSV:TICKET:ABC123')
})
