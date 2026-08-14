import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { categorizeAppError } from '../src/utils/appErrorDiagnostics.js'

test('error boundary classifies offline, permission, auth, Firebase, server, and stale deployment failures', () => {
  assert.equal(categorizeAppError(new Error('Network unavailable'), false), 'connection')
  assert.equal(categorizeAppError(new Error('Failed to fetch dynamically imported module: /assets/SettingsPage-old.js'), true), 'stale-deployment')
  assert.equal(categorizeAppError(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }), true), 'permission-denied')
  assert.equal(categorizeAppError(Object.assign(new Error('Firebase Auth session expired'), { code: 'auth/user-token-expired' }), true), 'auth-session')
  assert.equal(categorizeAppError(Object.assign(new Error('Firestore unavailable'), { code: 'firestore/unavailable' }), true), 'firebase')
  assert.equal(categorizeAppError(new Error('Hosting server returned 503'), true), 'server-hosting')
  assert.equal(categorizeAppError(new Error('Unexpected render failure'), true), 'unknown')
})

test('organizer access change is represented across Firebase, rules, services, Settings, tests, and docs guidance', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const authProvider = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const accessRoles = await readFile('src/utils/accessRoles.js', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const adminScript = await readFile('scripts/admin/ensureAccessControl.mjs', 'utf8')
  const docs = await readFile('docs/ACCESS_CHANGE_CHECKLIST.md', 'utf8')

  assert.match(authProvider, /settings', 'accessControl'/)
  assert.match(accessRoles, /approvedOrganizerRecords/)
  assert.match(settings, /Approved organizer accounts/)
  assert.match(settings, /same Firebase access-control document used by authorization/)
  assert.match(rules, /approvedOrganizerRecords/)
  assert.match(adminScript, /approvedOrganizerRecords/)
  assert.match(adminScript, /ADMIN_EMAILS/)
  assert.match(docs, /Permanent Cross-System Rule/)
  assert.match(docs, /Settings\/admin visibility/)
})
