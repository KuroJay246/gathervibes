import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { PROTECTED_OWNER_EMAIL, PROTECTED_OWNER_UID } from '../src/config/protectedOwner.js'
import { getUserAccessLevel } from '../src/utils/accessRoles.js'

async function source(path) {
  return readFile(path, 'utf8')
}

test('protected owner matrix documents the permanent update procedure for every new write path', async () => {
  const matrix = await source('docs/PROTECTED_OWNER_AUTHORIZATION_MATRIX_2026-08.md')

  assert.match(matrix, /Every new organizer feature, route, service, Firestore write path, import path, batch operation, or production correction workflow must update this matrix before release\./)
  assert.match(matrix, new RegExp(PROTECTED_OWNER_UID))
  assert.match(matrix, new RegExp(PROTECTED_OWNER_EMAIL))
  assert.match(matrix, /bypasses role and access restrictions only/i)
  assert.match(matrix, /schema validation, event scoping, destructive-action confirmation, duplicate detection, payment validation, ticket validation, attendance validation, or append-only audit logging/)
  assert.match(matrix, /without being listed in `approvedEmails`/)
  assert.match(matrix, /System QA/)
  assert.match(matrix, /PASS WITH REQUIRED MANUAL OWNER WRITE VERIFICATION/)
})

test('protected owner matrix covers every current Firestore write surface', async () => {
  const matrix = await source('docs/PROTECTED_OWNER_AUTHORIZATION_MATRIX_2026-08.md')
  const requiredPaths = [
    'events/{eventId}',
    'events/{eventId}/staffAssignments/{uid}',
    'events/{eventId}/tasks/{taskId}',
    'registrations/{registrationId}',
    'tickets/{documentId}',
    'checkIn/{documentId}',
    'auditLogs/{logId}',
    'operationsLedger/{ledgerEntryId}',
    'events/{eventId}/documents/{documentId}',
    'contacts/{contactId}',
    'organizations/{organizationId}',
    'events/{eventId}/contactLinks/{linkId}',
    'accessRequests/{requestId}',
    'staffProfiles/{uid}',
    'staffProfiles/{uid}/preferences/onboarding',
    'settings/accessControl',
    'communications/{id}',
    'aiDrafts/{id}',
    'settings/{id}',
  ]

  for (const path of requiredPaths) {
    assert.match(matrix, new RegExp(path.replace(/[{}]/g, '\\$&')), `missing matrix row for ${path}`)
  }
})

test('protected owner remains UID-based and independent of approvedEmails or staff assignments', () => {
  const access = getUserAccessLevel(
    { uid: PROTECTED_OWNER_UID, email: 'unlisted-owner-session@example.com' },
    { approvedEmails: [], rolesByEmail: {} },
    null,
    [],
    [],
  )

  assert.equal(access.level, 'admin')
  assert.equal(access.role, 'owner-admin')
  assert.equal(access.protectedOwner, true)
  assert.deepEqual(access.assignedEventIds, [])
})

test('System QA exposes protected-owner diagnostics and manual CODEX_DEMO write verification', async () => {
  const qaPage = await source('src/pages/QaPage.jsx')

  assert.match(qaPage, /PROTECTED_OWNER_UID/)
  assert.match(qaPage, /Protected Owner Authorization/)
  assert.match(qaPage, /Signed-in UID/)
  assert.match(qaPage, /Expected protected UID/)
  assert.match(qaPage, /UID match/)
  assert.match(qaPage, /App owner detection/)
  assert.match(qaPage, /Manual CODEX_DEMO Owner Write Check/)
  assert.match(qaPage, /bypass covers access and role checks only/)
  assert.match(qaPage, /append-only audit logs still apply/)
})

test('Firestore rules continue to centralize owner access without widening public writes', async () => {
  const rules = await source('firestore.rules')

  assert.match(rules, new RegExp(PROTECTED_OWNER_UID))
  assert.match(rules, /function isProtectedOwner\(\) \{\s*return isSignedIn\(\) && request\.auth\.uid == protectedOwnerUid\(\);/)
  assert.match(rules, /function isApprovedAdmin\(\) \{\s*return isProtectedOwner\(\)\s*\|\|/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(rules, /allow (read|write|create|update|delete|list|get): if request\.auth != null/)
})

test('registration edits remain atomic with append-only audit evidence', async () => {
  const service = await source('src/services/registrationService.js')
  const updateStart = service.indexOf('export async function updateRegistration')
  const attendanceStart = service.indexOf('export async function recordHistoricalAttendance')
  const updateRegistration = service.slice(updateStart, attendanceStart)

  assert.match(updateRegistration, /const batch = writeBatch\(firestore\)/)
  assert.match(updateRegistration, /batch\.update\(regRef,\s+\{/)
  assert.match(updateRegistration, /batch\.set\(audit\.ref,\s+audit\.data\)/)
  assert.match(updateRegistration, /await batch\.commit\(\)/)
  assert.doesNotMatch(updateRegistration, /await updateDoc\(/)
  assert.doesNotMatch(updateRegistration, /await setDoc\(/)
})

test('production owner write root cause documents deployment and manual verification boundaries', async () => {
  const rootCause = await source('docs/FIRESTORE_PRODUCTION_OWNER_WRITE_ROOT_CAUSE_2026-08.md')

  assert.match(rootCause, /permission-denied/)
  assert.match(rootCause, /Firestore server authorization depends on the deployed Firestore ruleset/)
  assert.match(rootCause, /updateRegistration` used a split write/)
  assert.match(rootCause, /npx firebase-tools deploy --only firestore:rules --project gathervibeshub/)
  assert.match(rootCause, /PASS WITH REQUIRED MANUAL OWNER WRITE VERIFICATION/)
  assert.match(rootCause, /CODEX_DEMO - Full System Walkthrough/)
  assert.match(rootCause, /QR payload remains `GSV:TICKET:\{ticketCode\}`/)
  assert.match(rootCause, /approvedEmails` is not changed/)
})

test('legacy registration compatibility hotfix documents the exact old schema rejection', async () => {
  const doc = await source('docs/LEGACY_RECORD_EDIT_COMPATIBILITY_HOTFIX_2026-08.md')
  const qaPage = await source('src/pages/QaPage.jsx')

  assert.match(doc, /attendanceRecordType, attendanceConfirmedAt, attendanceConfirmedBy, attendanceEvidenceNote/)
  assert.match(doc, /validChangedRegistrationDetailFields\(changedKeys\)/)
  assert.match(doc, /No Firestore Rules change is required/)
  assert.match(doc, /No production migration is required/)
  assert.match(doc, /CPB was not read/)
  assert.match(doc, /QR payload remains `GSV:TICKET:\{ticketCode\}`/)
  assert.match(qaPage, /Legacy registration compatibility/)
  assert.match(qaPage, /Registration schema version/)
  assert.match(qaPage, /attendanceEvidenceKeys/)
})
