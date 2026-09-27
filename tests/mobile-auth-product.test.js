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
  assert.match(source, /Event operations, in one place\./)
  assert.match(source, /Sign in with your approved Gather &amp; Savor account\./)
  assert.doesNotMatch(source, /sign-in-email-input|sign-in-password-input|showPassword/)
})

test('mobile entry preserves authenticated identities for explicit access states', async () => {
  const provider = await readFile(new URL('../apps/mobile/src/providers/AuthProvider.jsx', import.meta.url), 'utf8')
  const accessRoute = await readFile(new URL('../apps/mobile/src/app/access-required.jsx', import.meta.url), 'utf8')
  assert.match(provider, /'access-denied'/)
  assert.match(provider, /setUser\(nextUser\)/)
  assert.match(provider, /retryAccess/)
  assert.match(accessRoute, /Access denied|Access required/)
  assert.match(accessRoute, /Retry access check/)
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

test('native event surfaces normalize Firestore Timestamp dates before rendering', async () => {
  const [events, home] = await Promise.all([
    readFile(new URL('../apps/mobile/src/app/events.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../apps/mobile/src/app/(app)/home.jsx', import.meta.url), 'utf8'),
  ])
  for (const source of [events, home]) {
    assert.match(source, /typeof value\?\.toDate === 'function'/)
    assert.match(source, /Number\.isFinite\(value\._seconds\)/)
    assert.match(source, /formatMobileEventDate\(activeEvent\.eventDate\)|formatMobileEventDate\(event\.eventDate\)/)
  }
})
