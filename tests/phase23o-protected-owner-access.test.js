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

const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
const CODEX_TEST_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'

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
  assert.equal(owner.roleLabel, 'Owner/Admin')
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
    approvedEmails: ['secondary@example.com'],
    rolesByEmail: { 'secondary@example.com': 'admin' },
  }
  const entries = listApprovedAccessEntries(accessControl)

  assert.deepEqual(entries.map((entry) => entry.email), [PROTECTED_OWNER_EMAIL, 'secondary@example.com'])
  assert.equal(entries[0].role, 'owner-admin')
  assert.equal(entries[0].protectedOwner, true)
  assert.equal(resolveAccessRole(accessControl, 'secondary@example.com'), 'admin')
  assert.match(roleCapabilitySummary('owner-admin'), /pinned to the Firebase UID/)
})

test('Phase 23O Settings UI marks protected owner as not removable through organizer settings', async () => {
  const settings = await source('src/pages/SettingsPage.jsx')
  const authProvider = await source('src/auth/AuthProvider.jsx')
  const systemHealth = await source('src/components/SystemHealthPanel.jsx')
  const login = await source('src/pages/LoginPage.jsx')

  assert.match(settings, /Permanent owner access is pinned to the verified Firebase account/)
  assert.match(settings, /cannot be removed or disabled in organizer settings/)
  assert.match(settings, /Secondary organizers/)
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
  assert.match(rules, /settings\/accessControl[\s\S]*secondary organizers/)
  assert.match(rules, /match \/settings\/accessControl \{[\s\S]*allow get: if isApprovedAdmin\(\);[\s\S]*allow list, create, update, delete: if false;/)
  assert.match(rules, /match \/auditLogs\/\{logId\} \{[\s\S]*allow update, delete: if false;/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(rules, /allow (read|write|create|update|delete|list|get): if request\.auth != null/)
})

test('Phase 23O guardrails preserve QR privacy, CODEX_TEST isolation, CPB locks, and registration correction hold', async () => {
  const qaPage = await source('src/pages/QaPage.jsx')
  const qaHelper = await source('src/utils/qaHelper.js')
  const operations = await source('src/pages/OperationsPage.jsx')
  const phase23n = await source('PHASE_23N_SUBSETS_1_4_PRODUCTION_APPLY.md')
  const paymentAuditEngine = await source('src/services/cpbAuditBackfill.js')

  assert.equal(qrPayloadForTicketCode('QA23O-001'), 'GSV:TICKET:QA23O-001')
  assert.match(qaHelper, new RegExp(CODEX_TEST_EVENT_ID))
  assert.match(qaHelper, new RegExp(CPB_EVENT_ID))
  assert.match(qaPage, /CPB is production data and remains read-only during normal QA/)
  assert.match(qaPage, /Legacy CPB write controls remain unavailable/)
  assert.match(operations, /Subsets 5 and 6 locked/)
  assert.match(phase23n, /Subset 5: Registration Evidence Metadata/)
  assert.match(phase23n, /Subset 6: Registration\/Attendance Corrections/)
  assert.match(paymentAuditEngine, /CPB_AUDIT_APPROVAL_TEXT/)
  assert.match(paymentAuditEngine, /assertApplyApproval/)
  assert.doesNotMatch(paymentAuditEngine, /batch\.commit|writeBatch|setDoc|updateDoc/)
})
