import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile auth listener clears stale sign-in errors after sign-out', async () => {
  const source = await readFile('apps/mobile/src/providers/AuthProvider.jsx', 'utf8')
  const signedOutBlock = source.slice(source.indexOf('if (!nextUser) {'), source.indexOf('if (!nextUser) {') + 120)
  assert.match(signedOutBlock, /setAuthError\(''/)
})
