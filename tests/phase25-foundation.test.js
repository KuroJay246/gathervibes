import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('PWA manifest carries the Gather & Savor mobile identity', async () => {
  const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'))

  assert.equal(manifest.name, 'Gather & Savor Hub')
  assert.equal(manifest.short_name, 'G&S Hub')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.theme_color, '#2B1723')
  assert.equal(manifest.background_color, '#FFF8F2')
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ['192x192', '512x512'])
})

test('service worker does not cache or intercept private admin data', async () => {
  const serviceWorker = await readFile('public/sw.js', 'utf8')

  assert.match(serviceWorker, /addEventListener\('install'/)
  assert.match(serviceWorker, /addEventListener\('activate'/)
  assert.doesNotMatch(serviceWorker, /addEventListener\(['"]fetch/)
  assert.doesNotMatch(serviceWorker, /caches\./)
})

test('Google and email sign-in both retain admin allowlist verification', async () => {
  const authProvider = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const loginPage = await readFile('src/pages/LoginPage.jsx', 'utf8')

  assert.match(authProvider, /GoogleAuthProvider/)
  assert.match(authProvider, /signInWithEmailAndPassword/)
  assert.match(authProvider, /verifyAdminAccess/)
  assert.match(authProvider, /doc\(db, 'settings', 'accessControl'\)/)
  assert.match(loginPage, /Sign up with Google/)
  assert.match(loginPage, /Log in with Google/)
  assert.match(loginPage, /Sign in with email/)
})
