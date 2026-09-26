import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { resolveNativeAuthMode } from '../apps/mobile/src/lib/authMode.js'

test('native auth defaults to Google and requires both emulator gates for E2E auth', () => {
  assert.equal(resolveNativeAuthMode(), 'google')
  assert.equal(resolveNativeAuthMode({ useEmulators: true }), 'google')
  assert.equal(resolveNativeAuthMode({ e2eAuthEnabled: true }), 'google')
  assert.equal(resolveNativeAuthMode({ useEmulators: true, e2eAuthEnabled: true }), 'emulator-e2e')
})

test('mobile sign-in presents Google only and hides password product controls', async () => {
  const source = await readFile(new URL('../apps/mobile/src/app/sign-in.jsx', import.meta.url), 'utf8')
  assert.match(source, /Continue with Google/)
  assert.doesNotMatch(source, /sign-in-email-input|sign-in-password-input|showPassword/)
})

test('web login presents Google without an email-password form', async () => {
  const source = await readFile(new URL('../src/pages/LoginPage.jsx', import.meta.url), 'utf8')
  assert.match(source, /Continue with Google/)
  assert.doesNotMatch(source, /type="password"|Sign in with email|handleSubmit/)
})

test('emulator E2E auth route requires explicit emulator and E2E flags', async () => {
  const source = await readFile(new URL('../apps/mobile/src/app/e2e-auth.jsx', import.meta.url), 'utf8')
  assert.match(source, /firebaseRuntimeConfig\.useEmulators/)
  assert.match(source, /firebaseRuntimeConfig\.e2eAuthEnabled/)
  assert.match(source, /Test authentication disabled/)
})

test('approved mobile admins load readable events after authorization', async () => {
  const source = await readFile(new URL('../apps/mobile/src/services/access.js', import.meta.url), 'utf8')
  assert.match(source, /getDocs\(collection\(firestore, 'events'\)\)/)
  assert.match(source, /assignedEvents: await readAdminEvents\(\)/)
})
