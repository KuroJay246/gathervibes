import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 16 keeps Firebase Hosting SPA routes and non-overblocking security headers', async () => {
  const firebaseConfig = JSON.parse(await readFile('firebase.json', 'utf8'))
  const headers = firebaseConfig.hosting.headers.flatMap((entry) => entry.headers)
  const valuesByKey = new Map(headers.map((header) => [header.key, header.value]))

  assert.deepEqual(firebaseConfig.hosting.rewrites, [{ source: '**', destination: '/index.html' }])
  assert.equal(firebaseConfig.hosting.public, 'dist')
  assert.equal(valuesByKey.get('X-Frame-Options'), 'DENY')
  assert.match(valuesByKey.get('Content-Security-Policy'), /frame-ancestors 'none'/)
  assert.doesNotMatch(valuesByKey.get('Content-Security-Policy'), /script-src|connect-src|style-src/)
  assert.equal(valuesByKey.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(valuesByKey.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.match(valuesByKey.get('Permissions-Policy'), /camera=\(self\)/)
  assert.match(valuesByKey.get('X-Robots-Tag'), /noindex/)
})

test('built index references existing asset chunks without local paths or sourcemaps', async () => {
  let index = ''
  try {
    index = await readFile('dist/index.html', 'utf8')
  } catch {
    index = await readFile('index.html', 'utf8')
  }
  const assetMatches = [...index.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1])

  assert.match(index, /<div id="root"><\/div>/)
  assert.doesNotMatch(index, /localhost|file:|C:\\/)
  assert.doesNotMatch(index, /sourceMappingURL/)

  if (assetMatches.length === 0) return

  await Promise.all(assetMatches.map((assetPath) => access(join('dist', assetPath.replace(/^\//, '')))))

  const distFiles = await readdir('dist')
  assert.equal(distFiles.some((fileName) => fileName.endsWith('.map')), false)
})

test('service worker remains lifecycle-only and does not cache private admin data', async () => {
  const serviceWorker = await readFile('public/sw.js', 'utf8')

  assert.match(serviceWorker, /addEventListener\('install'/)
  assert.match(serviceWorker, /addEventListener\('activate'/)
  assert.doesNotMatch(serviceWorker, /addEventListener\(['"]fetch/)
  assert.doesNotMatch(serviceWorker, /caches\./)
  assert.doesNotMatch(serviceWorker, /firestore|registrations|auditLogs|approvedEmails/i)
})

test('root render has a safe browser loading fallback', async () => {
  const main = await readFile('src/main.jsx', 'utf8')
  const boundary = await readFile('src/components/AppErrorBoundary.jsx', 'utf8')

  assert.match(main, /AppErrorBoundary/)
  assert.match(boundary, /Something went wrong loading Gather & Savor Hub/)
  assert.match(boundary, /Refresh, try an incognito window, or contact the organizer/)
  assert.match(boundary, /console\.error/)
  assert.doesNotMatch(boundary, /apiKey|approvedEmails|password|service account/i)
})

test('QA Center includes Phase 16 browser and CODEX_TEST retest guidance', async () => {
  const qaPage = await readFile('src/pages/QaPage.jsx', 'utf8')
  const qaHelper = await readFile('src/utils/qaHelper.js', 'utf8')

  for (const text of [
    'Website does not load?',
    'Ctrl+Shift+R hard refresh',
    'clear site data for gathervibeshub.web.app',
    'Phase 16 live browser and check-in QA',
    'login works with the approved second Google account',
    'QR camera lookup works',
    'manual ticket-code fallback works',
    'audit logs remain append-only',
    'CPB is not selected and not touched during QA',
  ]) {
    assert.match(`${qaPage}\n${qaHelper}`, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
  }

  assert.doesNotMatch(qaPage, /addDoc|setDoc|writeBatch|deleteDoc/)
})

test('Phase 16 preserves ticket-code-only QR payloads', () => {
  const payload = qrPayloadForTicketCode('CODEX_TEST_001')

  assert.equal(payload, 'GSV:TICKET:CODEX_TEST_001')
  assert.doesNotMatch(payload, /@|phone|amount|paid|buyer|guest|note/i)
})
