import test from 'node:test'
import assert from 'node:assert/strict'

import { getNativeAppCheckProviderOptions } from '../apps/mobile/src/lib/appCheckConfig.js'

test('Android development and emulator builds use debug App Check without requiring a token', () => {
  assert.deepEqual(
    getNativeAppCheckProviderOptions({
      platform: 'android',
      isDev: true,
      useEmulators: false,
      debugToken: '',
    }),
    { android: { provider: 'debug' } },
  )
})

test('Android production builds use Play Integrity and ignore debug tokens', () => {
  assert.deepEqual(
    getNativeAppCheckProviderOptions({
      platform: 'android',
      isDev: false,
      useEmulators: false,
      debugToken: 'must-not-enter-production',
    }),
    { android: { provider: 'playIntegrity' } },
  )
})

test('Android emulator mode can use an explicitly supplied debug token', () => {
  assert.deepEqual(
    getNativeAppCheckProviderOptions({
      platform: 'android',
      isDev: false,
      useEmulators: true,
      debugToken: 'registered-debug-token',
    }),
    { android: { provider: 'debug', debugToken: 'registered-debug-token' } },
  )
})

test('unsupported platforms do not initialize native App Check', () => {
  assert.equal(
    getNativeAppCheckProviderOptions({
      platform: 'web',
      isDev: false,
      useEmulators: false,
      debugToken: '',
    }),
    null,
  )
})
