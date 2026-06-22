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
  const firebaseConfig = await readFile('src/lib/firebase.js', 'utf8')
  const loginPage = await readFile('src/pages/LoginPage.jsx', 'utf8')

  assert.match(authProvider, /GoogleAuthProvider/)
  assert.match(authProvider, /signInWithRedirect/)
  assert.match(authProvider, /signInWithEmailAndPassword/)
  assert.match(authProvider, /verifyAdminAccess/)
  assert.match(authProvider, /gathervibeshub\.web\.app/)
  assert.match(authProvider, /gathervibeshub\.firebaseapp\.com/)
  assert.match(authProvider, /doc\(db, 'settings', 'accessControl'\)/)
  assert.match(firebaseConfig, /authDomain: import\.meta\.env\.VITE_FIREBASE_AUTH_DOMAIN/)
  assert.match(loginPage, /googleMode/)
  assert.match(loginPage, /Continue with Google/)
  assert.doesNotMatch(loginPage, /Sign up with Google/)
  assert.match(loginPage, /Sign in with email/)
})

test('registration audit logs preserve registration target type', async () => {
  const auditService = await readFile('src/services/auditService.js', 'utf8')
  const registrationService = await readFile('src/services/registrationService.js', 'utf8')
  const importService = await readFile('src/services/importService.js', 'utf8')

  assert.match(auditService, /targetType = 'event'/)
  assert.match(auditService, /targetType,/)
  assert.match(registrationService, /targetType: 'registration'/)
  assert.match(importService, /targetType: 'registration'/)
})

test('mobile navigation keeps More, Settings, and logout reachable', async () => {
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const settingsPage = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const styles = await readFile('src/styles.css', 'utf8')

  assert.match(shell, /aria-label="Open all navigation"/)
  assert.match(shell, /mobile-tab-bar lg:hidden/)
  assert.match(shell, />More</)
  assert.match(shell, /to="\/settings"/)
  assert.match(shell, /aria-label="Sign out"/)
  assert.match(settingsPage, /Log out/)
  assert.match(styles, /@media \(min-width: 1024px\)[\s\S]*\.mobile-tab-bar[\s\S]*display: none/)
})
