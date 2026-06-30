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
  isApprovedAdmin,
  isAssignedStaff,
} from '../src/utils/accessRoles.js'
import { getRegistrationGuestSummary } from '../src/utils/registrationMetrics.js'
import { getTicketPrefix } from '../src/utils/ticketUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const adminUser = { uid: 'admin-1', email: 'OWNER@EXAMPLE.COM' }
const scannerUser = { uid: 'scanner-1', email: 'scanner@example.com' }
const viewerUser = { uid: 'viewer-1', email: 'viewer@example.com' }
const opsUser = { uid: 'ops-1', email: 'ops@example.com' }

function staffAccess(user, defaultRole, assignments = []) {
  return getUserAccessLevel(
    user,
    null,
    { uid: user.uid, email: user.email, displayName: 'Staff', status: 'active', defaultRole },
    assignments,
    assignments.map((assignment) => ({ eventId: assignment.eventId, eventName: `Event ${assignment.eventId}` })),
  )
}

test('Phase 17B access helpers keep approved admin full access', () => {
  const access = getUserAccessLevel(adminUser, { approvedEmails: ['owner@example.com'] })
  assert.equal(isApprovedAdmin(access), true)
  assert.equal(canViewRoute(access, '/events'), true)
  assert.equal(canViewRoute(access, '/imports'), true)
  assert.equal(canUseSettings(access), true)
  assert.equal(canAssignTickets(access, 'event-1'), true)
  assert.equal(canUseOperations(access, 'event-1'), true)
})

test('Phase 17B access helpers deny inactive and revoked staff', () => {
  const inactive = getUserAccessLevel(scannerUser, null, { uid: scannerUser.uid, email: scannerUser.email, status: 'inactive', defaultRole: 'scanner' }, [
    { uid: scannerUser.uid, email: scannerUser.email, eventId: 'event-1', role: 'scanner', status: 'active' },
  ])
  const revoked = getUserAccessLevel(scannerUser, null, { uid: scannerUser.uid, email: scannerUser.email, status: 'revoked', defaultRole: 'scanner' }, [
    { uid: scannerUser.uid, email: scannerUser.email, eventId: 'event-1', role: 'scanner', status: 'active' },
  ])
  assert.equal(inactive.level, 'none')
  assert.equal(revoked.level, 'none')
})

test('Phase 17B scanner can view only scanner route and cannot access admin routes', () => {
  const access = staffAccess(scannerUser, 'scanner', [
    { uid: scannerUser.uid, email: scannerUser.email, eventId: 'event-1', role: 'scanner', status: 'active' },
  ])
  assert.equal(canViewRoute(access, '/scanner'), true)
  assert.equal(canViewRoute(access, '/check-in'), false)
  assert.equal(canCheckIn(access, 'event-1'), true)
  assert.equal(canReadRegistrations(access, 'event-1'), true)
  assert.equal(isAssignedStaff(access, 'event-1'), true)
  assert.equal(canViewRoute(access, '/events'), false)
  assert.equal(canViewRoute(access, '/imports'), false)
  assert.equal(canViewRoute(access, '/settings'), false)
  assert.equal(canViewRoute(access, '/operations'), false)
  assert.equal(canViewRoute(access, '/communications'), false)
  assert.equal(canViewRoute(access, '/tickets'), false)
  assert.equal(canAssignTickets(access, 'event-1'), false)
  assert.equal(canCheckIn(access, 'event-2'), false)
})

test('Phase 17B viewer and operations helper remain limited', () => {
  const viewer = staffAccess(viewerUser, 'viewer', [
    { uid: viewerUser.uid, email: viewerUser.email, eventId: 'event-1', role: 'viewer', status: 'active' },
  ])
  const operations = staffAccess(opsUser, 'operations-helper', [
    { uid: opsUser.uid, email: opsUser.email, eventId: 'event-1', role: 'operations-helper', status: 'active' },
  ])
  assert.equal(canReadRegistrations(viewer, 'event-1'), true)
  assert.equal(canCheckIn(viewer, 'event-1'), false)
  assert.equal(canAssignTickets(viewer, 'event-1'), false)
  assert.equal(canUseSettings(viewer), false)
  assert.equal(canViewRoute(operations, '/operations'), true)
  assert.equal(canUseOperations(operations, 'event-1'), true)
  assert.equal(canReadRegistrations(operations, 'event-1'), false)
  assert.equal(canViewRoute(operations, '/communications'), false)
})

test('Phase 17B no assignment and clean local state are safe', () => {
  const access = getUserAccessLevel(scannerUser, null, { uid: scannerUser.uid, email: scannerUser.email, status: 'active', defaultRole: 'scanner' }, [])
  assert.equal(access.level, 'none')
  assert.deepEqual(access.assignedEventIds, [])
  assert.equal(canViewRoute(access, '/scanner'), false)
  assert.equal(canCheckIn(access, 'event-1'), false)
  assert.equal(getRegistrationGuestSummary([]), '0 registrations / 0 guests')
  assert.equal(getRegistrationGuestSummary([{ personsAttending: 3 }, {}]), '2 registrations / 4 guests')
})

test('Phase 17B preserves ticket prefix and QR payload privacy', () => {
  assert.equal(getTicketPrefix(null), 'GSV')
  assert.equal(qrPayloadForTicketCode('ABC123'), 'GSV:TICKET:ABC123')
})

test('Phase 17B UI surfaces staff role gating and assigned-event fallback', async () => {
  const auth = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const protectedRoute = await readFile('src/auth/ProtectedRoute.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const assignedGate = await readFile('src/components/AssignedEventGate.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')

  assert.match(auth, /staffProfiles/)
  assert.match(auth, /STAFF_ASSIGNMENT_EVENT_IDS/)
  assert.match(auth, /doc\(db, 'events', eventId, 'staffAssignments', nextUser\.uid\)/)
  assert.doesNotMatch(auth, /collectionGroup\(db, 'staffAssignments'\)/)
  assert.match(protectedRoute, /canViewRoute/)
  assert.match(shell, /filter\(\(\{ to \}\) => canViewRoute\(access, to\)\)/)
  assert.match(app, /path="\/scanner"/)
  assert.match(app, /AssignedEventGate purpose="Check-In"/)
  assert.match(assignedGate, /No assigned events\. Please contact the organizer\./)
  assert.match(checkIn, /Undo check-in is admin-only/)
  assert.match(operations, /read-only for this assigned event/)
})

test('Phase 17B Firestore rules contain staff profile, assignment, scanner, viewer, and operations restrictions', async () => {
  const rules = await readFile('firestore.rules', 'utf8')
  assert.match(rules, /match \/staffProfiles\/\{uid\}/)
  assert.match(rules, /match \/events\/\{eventId\}\/staffAssignments\/\{uid\}/)
  assert.match(rules, /function hasActiveEventAssignment/)
  assert.match(rules, /function isAssignedScanner/)
  assert.match(rules, /allow read: if isApprovedAdmin\(\)\s*\|\| isAssignedEventManager\(resource\.data\.eventId\)\s*\|\| isAssignedScanner\(resource\.data\.eventId\)\s*\|\| isAssignedViewer\(resource\.data\.eventId\)/)
  assert.match(rules, /isAssignedScanner\(resource\.data\.eventId\)\s*&& isValidRegistration\(request\.resource\.data, registrationId\)\s*&& isCheckInCompletionUpdate\(registrationId\)/)
  assert.match(rules, /allow delete: if isApprovedAdmin\(\);/)
  assert.match(rules, /allow update, delete: if false/)
  assert.match(rules, /request\.resource\.data\.action == 'checkin\.complete'/)
  assert.match(rules, /request\.resource\.data\.action == 'checkin\.duplicate-attempt'/)
  assert.match(rules, /allow read: if isApprovedAdmin\(\)\s*\|\|\s*isAssignedOperationsHelper\(resource\.data\.eventId\)/)
  assert.match(rules, /match \/settings\/accessControl \{[\s\S]*allow get: if isApprovedAdmin\(\)/)
})
