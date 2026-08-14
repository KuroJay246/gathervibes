import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  getUserAccessLevel,
  listApprovedAccessEntries,
  resolveAccessRole,
  roleCapabilitySummary,
} from '../src/utils/accessRoles.js'
import {
  PROTECTED_OWNER_EMAIL,
  PROTECTED_OWNER_UID,
  isProtectedOwnerEmail,
  isProtectedOwnerUser,
  normalizeOwnerEmail,
} from '../src/config/protectedOwner.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const CODEX_DEMO_EVENT_ID = 'codex_demo_full_system_walkthrough'

async function source(path) {
  return readFile(path, 'utf8')
}

test('Phase 23O recognizes protected owner by Firebase UID without mutable allowlist membership', () => {
  const owner = getUserAccessLevel(
    { uid: PROTECTED_OWNER_UID, email: 'unlisted@example.com' },
    { approvedEmails: [], rolesByEmail: {} },
  )

  assert.equal(owner.level, 'admin')
  assert.equal(owner.role, 'owner-admin')
  assert.equal(owner.roleLabel, 'Protected Owner')
  assert.equal(owner.protectedOwner, true)
  assert.deepEqual(owner.assignedEventIds, [])
  assert.equal(isProtectedOwnerUser({ uid: PROTECTED_OWNER_UID }), true)
  assert.equal(isProtectedOwnerUser({ uid: 'different-uid' }), false)
})

test('Phase 23O keeps protected owner email normalized and visible without making email the primary grant', () => {
  assert.equal(PROTECTED_OWNER_EMAIL, 'jaylanspencer99@gmail.com')
  assert.equal(normalizeOwnerEmail('  JAYLANSPENCER99@GMAIL.COM  '), PROTECTED_OWNER_EMAIL)
  assert.equal(isProtectedOwnerEmail('  JAYLANSPENCER99@GMAIL.COM  '), true)

  const emailOnly = getUserAccessLevel(
    { uid: 'not-the-protected-uid', email: 'jaylanspencer99@gmail.com' },
    { approvedEmails: [] },
  )
  assert.equal(emailOnly.level, 'none')
})

test('Phase 23O preserves secondary organizer access and lists protected owner as immutable', () => {
  const accessControl = {
    approvedEmails: ['secondary@example.com', 'gathersavorvibes@gmail.com'],
    rolesByEmail: { 'secondary@example.com': 'admin', 'gathersavorvibes@gmail.com': 'admin' },
    approvedOrganizerRecords: {
      'secondary@example.com': { accessType: 'admin', status: 'active', addedAt: '2026-08-13T00:00:00.000Z' },
      'gathersavorvibes@gmail.com': { accessType: 'admin', status: 'active', addedAt: '2026-08-13T00:00:00.000Z' },
    },
  }
  const entries = listApprovedAccessEntries(accessControl)

  assert.deepEqual(entries.map((entry) => entry.email), [PROTECTED_OWNER_EMAIL, 'gathersavorvibes@gmail.com', 'secondary@example.com'])
  assert.equal(entries[0].role, 'owner-admin')
  assert.equal(entries[0].protectedOwner, true)
  assert.equal(resolveAccessRole(accessControl, 'secondary@example.com'), 'admin')
  assert.equal(resolveAccessRole(accessControl, 'gathersavorvibes@gmail.com'), 'admin')
  assert.equal(entries.find((entry) => entry.email === 'gathersavorvibes@gmail.com').status, 'active')
  assert.equal(entries.find((entry) => entry.email === 'gathersavorvibes@gmail.com').accessType, 'Approved Organizer')
  assert.match(roleCapabilitySummary('owner-admin'), /permanent and cannot be removed from Settings/)
})

test('Phase 23O inactive approved organizer metadata blocks app role resolution', () => {
  const accessControl = {
    approvedEmails: ['revoked@example.com'],
    rolesByEmail: { 'revoked@example.com': 'admin' },
    approvedOrganizerRecords: {
      'revoked@example.com': { accessType: 'admin', status: 'revoked', addedAt: '2026-08-13T00:00:00.000Z' },
    },
  }

  assert.equal(resolveAccessRole(accessControl, 'revoked@example.com'), null)
  const entry = listApprovedAccessEntries(accessControl).find((item) => item.email === 'revoked@example.com')
  assert.equal(entry.status, 'revoked')
  assert.equal(entry.accessType, 'Approved Organizer')
})

test('Phase 23O Settings UI marks protected owner as not removable through organizer settings', async () => {
  const settings = await source('src/pages/SettingsPage.jsx')
  const authProvider = await source('src/auth/AuthProvider.jsx')
  const systemHealth = await source('src/components/SystemHealthPanel.jsx')
  const login = await source('src/pages/LoginPage.jsx')

  assert.match(settings, /Permanent owner access is pinned to the verified Firebase account/)
  assert.match(settings, /cannot be removed or disabled in organizer settings/)
  assert.match(settings, /Approved organizer accounts/)
  assert.match(settings, /Email address/)
  assert.match(settings, /Access type/)
  assert.match(settings, /Date added/)
  assert.match(settings, /same Firebase access-control document used by authorization/)
  assert.match(authProvider, /isProtectedOwnerUser\(nextUser\)/)
  assert.match(authProvider, /approvedEmails: \[PROTECTED_OWNER_EMAIL\]/)
  assert.match(systemHealth, /isProtectedOwnerUser\(user\)/)
  assert.match(login, /Refresh the page or sign in again\. No changes were saved\./)
})

test('Phase 23O Firestore rules grant owner UID first without widening signed-in access', async () => {
  const rules = await source('firestore.rules')

  assert.match(rules, new RegExp(PROTECTED_OWNER_UID))
  assert.match(rules, /function isProtectedOwner\(\) \{\s*return isSignedIn\(\) && request\.auth\.uid == protectedOwnerUid\(\);/)
  assert.match(rules, /function isApprovedAdmin\(\) \{\s*return isProtectedOwner\(\)\s*\|\|/)
  assert.match(rules, /approvedOrganizerRecords/)
  assert.match(rules, /accessData\.approvedOrganizerRecords\[email\]\.status == 'active'/)
  assert.match(rules, /settings\/accessControl[\s\S]*secondary organizers/)
  assert.match(rules, /match \/settings\/accessControl \{[\s\S]*allow get: if isApprovedAdmin\(\);[\s\S]*allow list, create, update, delete: if false;/)
  assert.match(rules, /match \/auditLogs\/\{logId\} \{[\s\S]*allow update, delete: if false;/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(rules, /allow (read|write|create|update|delete|list|get): if request\.auth != null/)
})

test('Phase 23O guardrails preserve QR privacy, CODEX_DEMO isolation, and standard real-event safeguards', async () => {
  const qaPage = await source('src/pages/QaPage.jsx')
  const qaHelper = await source('src/utils/qaHelper.js')
  const demoEvent = await source('src/utils/demoEvent.js')
  const dashboard = await source('src/pages/DashboardPage.jsx')
  const events = await source('src/pages/EventsPage.jsx')
  const operations = await source('src/pages/OperationsPage.jsx')
  const reports = await source('src/pages/EventReviewPage.jsx')
  const phase23n = await source('docs/archive/phases/PHASE_23N_SUBSETS_1_4_PRODUCTION_APPLY.md')
  const paymentAuditEngine = await source('src/services/cpbAuditBackfill.js')

  assert.equal(qrPayloadForTicketCode('QA23O-001'), 'GSV:TICKET:QA23O-001')
  assert.match(demoEvent, new RegExp(CODEX_DEMO_EVENT_ID))
  assert.match(qaHelper, /CODEX_DEMO/)
  assert.doesNotMatch(qaHelper, /zhaPxi31cpqLAW0cuS20|CPB remains protected/)
  assert.match(qaPage, /Real events use the same standard safeguards/)
  assert.match(qaPage, /Legacy one-off write controls unavailable/)
  assert.match(dashboard, /Completed status does not make an event read-only/)
  assert.match(events, /showTestEvents/)
  assert.match(operations, /Registration ticket payments are recorded separately under Payments/)
  assert.match(reports, /Historical reconciliation evidence is preserved here for CPB review/)
  assert.match(phase23n, /Subset 5: Registration Evidence Metadata/)
  assert.match(phase23n, /Subset 6: Registration\/Attendance Corrections/)
  assert.doesNotMatch(paymentAuditEngine, /CPB_AUDIT_APPROVAL_TEXT|assertApplyApproval/)
  assert.doesNotMatch(paymentAuditEngine, /batch\.commit|writeBatch|setDoc|updateDoc/)
})
