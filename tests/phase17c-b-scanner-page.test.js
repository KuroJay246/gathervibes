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
  defaultRouteForAccess,
  getUserAccessLevel,
  isAssignedStaff,
} from '../src/utils/accessRoles.js'
import { getSafePriceTiers } from '../src/utils/eventDefaults.js'
import { getCurrencyCode } from '../src/utils/financeUtils.js'
import { getRegistrationGuestSummary } from '../src/utils/registrationMetrics.js'
import { getTicketPrefix } from '../src/utils/ticketUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const CODEX_TEST_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'
const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
const scannerUser = { uid: 'scanner-uid', email: 'scanner@example.com' }
const adminUser = { uid: 'admin-uid', email: 'admin@example.com' }

function staffAccess(role = 'scanner', eventId = CODEX_TEST_EVENT_ID) {
  return getUserAccessLevel(
    scannerUser,
    null,
    { uid: scannerUser.uid, email: scannerUser.email, status: 'active', defaultRole: role },
    [{ uid: scannerUser.uid, email: scannerUser.email, eventId, role, status: 'active' }],
    [{ eventId, eventName: eventId === CODEX_TEST_EVENT_ID ? 'CODEX_TEST Live Verification Event' : 'CPB' }],
  )
}

test('Phase 17C-B scanner role defaults to scanner-only route', () => {
  const scanner = staffAccess()

  assert.equal(defaultRouteForAccess(scanner), '/scanner')
  assert.equal(canViewRoute(scanner, '/scanner'), true)
  assert.equal(canViewRoute(scanner, '/check-in'), false)
  assert.equal(canViewRoute(scanner, '/dashboard'), false)
})

test('Phase 17C-B scanner nav excludes admin routes and admin keeps existing access', () => {
  const scanner = staffAccess()
  const admin = getUserAccessLevel(adminUser, { approvedEmails: [adminUser.email] })

  for (const route of ['/events', '/imports', '/tickets', '/settings', '/operations', '/communications', '/qa', '/dashboard']) {
    assert.equal(canViewRoute(scanner, route), false, route)
    assert.equal(canViewRoute(admin, route), true, route)
  }

  assert.equal(canUseSettings(scanner), false)
  assert.equal(canAssignTickets(scanner, CODEX_TEST_EVENT_ID), false)
  assert.equal(canUseOperations(scanner, CODEX_TEST_EVENT_ID), false)
})

test('Phase 17C-B scanner can check in only assigned CODEX_TEST and not CPB', () => {
  const scanner = staffAccess('scanner', CODEX_TEST_EVENT_ID)

  assert.equal(isAssignedStaff(scanner, CODEX_TEST_EVENT_ID), true)
  assert.equal(canReadRegistrations(scanner, CODEX_TEST_EVENT_ID), true)
  assert.equal(canCheckIn(scanner, CODEX_TEST_EVENT_ID), true)
  assert.equal(isAssignedStaff(scanner, CPB_EVENT_ID), false)
  assert.equal(canReadRegistrations(scanner, CPB_EVENT_ID), false)
  assert.equal(canCheckIn(scanner, CPB_EVENT_ID), false)
})

test('Phase 17C-B no-assignment scanner state is safe', () => {
  const scanner = getUserAccessLevel(
    scannerUser,
    null,
    { uid: scannerUser.uid, email: scannerUser.email, status: 'active', defaultRole: 'scanner' },
    [],
  )

  assert.equal(scanner.level, 'staff')
  assert.deepEqual(scanner.assignedEventIds, [])
  assert.equal(canCheckIn(scanner, CODEX_TEST_EVENT_ID), false)
  assert.equal(canCheckIn(scanner, CPB_EVENT_ID), false)
})

test('Phase 17C-B scanner route is outside AppShell and auto-selects a single assignment', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const gate = await readFile('src/components/AssignedEventGate.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const scannerPage = await readFile('src/pages/ScannerPage.jsx', 'utf8')

  assert.match(app, /path="\/scanner"/)
  assert.match(app, /autoSelectSingle/)
  assert.match(app, /<ScannerPage \/>/)
  assert.match(gate, /assignedEvents\.length !== 1/)
  assert.match(gate, /setActiveEvent\(assignedEvents\[0\]\)/)
  assert.match(gate, /No assigned events\. Please contact the organizer\./)
  assert.match(shell, /filter\(\(\{ to \}\) => canViewRoute\(access, to\)\)/)
  assert.match(shell, /to="\/dashboard"[\s\S]*aria-label="Go to Dashboard"/)
  assert.doesNotMatch(scannerPage, /to="\/dashboard"|aria-label="Go to Dashboard"/)
})

test('Phase 17C-B scanner page is narrow and excludes admin-only controls', async () => {
  const scannerPage = await readFile('src/pages/ScannerPage.jsx', 'utf8')

  assert.match(scannerPage, /Scanner mode/)
  assert.match(scannerPage, /QrScannerPanel/)
  assert.match(scannerPage, /subscribeToRegistrations/)
  assert.match(scannerPage, /completeCheckIn/)
  assert.match(scannerPage, /recordDuplicateCheckInAttempt/)
  assert.match(scannerPage, /Check-in requires one explicit button tap/)
  assert.match(scannerPage, /Duplicate check-in is blocked/)
  assert.match(scannerPage, /undoCheckIn/)
  assert.match(scannerPage, /isApprovedAdmin\(access\)/)
  assert.match(scannerPage, /Admin Undo Check-In/)
  assert.match(scannerPage, /window\.confirm/)
  assert.doesNotMatch(scannerPage, /saveTicketAssignment/)
  assert.doesNotMatch(scannerPage, /clearTicketAssignment/)
  assert.doesNotMatch(scannerPage, /bulkUpdatePaymentStatus/)
  assert.doesNotMatch(scannerPage, /bulkDeleteRegistrations/)
})

test('Phase 17C-B1 scanner undo is admin-only and reuses safe audited service', async () => {
  const scannerPage = await readFile('src/pages/ScannerPage.jsx', 'utf8')
  const ticketService = await readFile('src/services/ticketService.js', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(scannerPage, /const canAdminUndoCheckIn = isApprovedAdmin\(access\)/)
  assert.match(scannerPage, /if \(!canAdminUndoCheckIn\)/)
  assert.match(scannerPage, /await undoCheckIn\(selectedRegistration, user\)/)
  assert.match(scannerPage, /Admin Undo Check-In/)
  assert.match(scannerPage, /checkedIn && \(/)
  assert.match(ticketService, /action: 'checkin\.undo'/)
  assert.match(ticketService, /batch\.update\(regRef,[\s\S]*checkedIn: false/)
  assert.doesNotMatch(rules, /isAssignedScanner\(resource\.data\.eventId\)[\s\S]{0,240}isCheckInUndoUpdate/)
})

test('Phase 17C-B1 scanner shortcuts exist for approved admins without adding staff nav', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')

  assert.match(dashboard, /to: '\/scanner'[\s\S]*Scanner Mode/)
  assert.match(checkIn, /to="\/scanner"[\s\S]*Open Scanner Mode/)
  assert.match(settings, /to="\/scanner"[\s\S]*Open Scanner Mode/)
  assert.match(app, /path="\/scanner"/)
  assert.match(app, /<Route element=\{<ProtectedRoute \/>}/)
})

test('Phase 17C-B1 Settings documents future categories without rules rewriting UI', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  for (const category of ['Profile', 'Workspace', 'Events & Defaults', 'Access & Roles', 'Scanner Mode', 'Tickets & Check-In', 'Imports & Data', 'Finance & Operations', 'Communications', 'QA & System Health', 'Security & Privacy', 'Integrations & Roadmap']) {
    assert.match(settings, new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  for (const item of ['pending access requests', 'approve/decline staff access', 'assign role', 'assign event', 'revoke access', 'inactive/revoked status', 'staffProfiles/{uid}', 'events/{eventId}/staffAssignments/{uid}']) {
    assert.match(settings, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(settings, /should not rewrite Firestore rules/)
  assert.match(settings, /approvedEmails remains admin-level access only/)
  assert.doesNotMatch(settings, /setDoc\(.*firestore\.rules|updateDoc\(.*firestore\.rules|rulesEditor|rulesTextarea/i)
})

test('Phase 17C-B1b Settings uses accessible query-linked tabs', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(settings, /useSearchParams/)
  assert.match(settings, /const SETTINGS_TABS/)
  assert.match(settings, /role="tablist"/)
  assert.match(settings, /role="tab"/)
  assert.match(settings, /aria-selected=\{activeTab === id\}/)
  assert.match(settings, /setSearchParams\(\{ tab: id \}\)/)
  assert.match(settings, /const requestedTab = searchParams\.get\('tab'\) \|\| 'profile'/)
  assert.match(settings, /role="tabpanel"/)
})

test('Phase 17C-B1b Settings tabs preserve required category content', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(settings, /Approved-admin allowlist remains active owner\/admin enforcement/)
  assert.match(settings, /Do not add staff\/scanners\/helpers to approvedEmails/)
  assert.match(settings, /Phase 17C-B remains blocked until TEST_SCANNER_EMAIL/)
  assert.match(settings, /Scanner-only isolated layout/)
  assert.match(settings, /Admin-only Undo Check-In/)
  assert.match(settings, /Cannot undo check-in/)
  assert.match(settings, /Private admin app/)
  assert.match(settings, /noindex and robots\.txt Disallow: \//)
  assert.match(settings, /Google Sheets OAuth, Gmail\/Outlook OAuth, Cloud Functions, Storage, public portals, native app/)
})

test('Phase 17C-B scanner lookup preserves QR privacy and manual fallback', async () => {
  const scannerPanel = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  const scannerPage = await readFile('src/pages/ScannerPage.jsx', 'utf8')

  assert.equal(qrPayloadForTicketCode('CODEX-001'), 'GSV:TICKET:CODEX-001')
  assert.match(scannerPanel, /Manual ticket fallback/)
  assert.match(scannerPanel, /QR lookup only selects the guest/)
  assert.match(scannerPanel, /Check-in still requires confirmation/)
  assert.match(scannerPage, /Type a guest name or ticket code/)
  assert.match(scannerPage, /safeText\(selectedRegistration\.ticketCode/)
  assert.match(scannerPage, /Check In/)
  assert.match(scannerPage, /Record duplicate attempt/)
  assert.doesNotMatch(scannerPanel, /fullName.*GSV:TICKET|email.*GSV:TICKET|paymentStatus.*GSV:TICKET/)
})

test('Phase 17C-B preserved standards remain covered', () => {
  assert.equal(getRegistrationGuestSummary([]), '0 registrations / 0 guests')
  assert.equal(getRegistrationGuestSummary([{ personsAttending: 2 }, {}, { personsAttending: 3 }]), '3 registrations / 6 guests')
  assert.equal(getCurrencyCode({ currency: null }), 'BBD')
  assert.equal(getTicketPrefix(null), 'GSV')
  assert.deepEqual(getSafePriceTiers({ priceTiers: null }), [])
})
