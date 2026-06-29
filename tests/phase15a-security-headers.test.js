import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

async function hostingHeaders() {
  const firebaseConfig = JSON.parse(await readFile('firebase.json', 'utf8'))
  return firebaseConfig.hosting.headers.flatMap((entry) => entry.headers)
}

test('Firebase Hosting applies private admin security headers', async () => {
  const headers = await hostingHeaders()
  const valuesByKey = new Map(headers.map((header) => [header.key, header.value]))

  assert.equal(valuesByKey.get('X-Frame-Options'), 'DENY')
  assert.match(valuesByKey.get('Content-Security-Policy'), /frame-ancestors 'none'/)
  assert.match(valuesByKey.get('Content-Security-Policy'), /object-src 'none'/)
  assert.equal(valuesByKey.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(valuesByKey.get('Referrer-Policy'), 'strict-origin-when-cross-origin')
  assert.match(valuesByKey.get('Permissions-Policy'), /camera=\(self\)/)
  assert.match(valuesByKey.get('X-Robots-Tag'), /noindex/)
})

test('Firebase Hosting preserves SPA rewrite while adding headers', async () => {
  const firebaseConfig = JSON.parse(await readFile('firebase.json', 'utf8'))

  assert.deepEqual(firebaseConfig.hosting.rewrites, [
    { source: '**', destination: '/index.html' },
  ])
  assert.equal(firebaseConfig.hosting.public, 'dist')
})

test('private admin app blocks crawling without sitemap or JSON-LD', async () => {
  const robots = await readFile('public/robots.txt', 'utf8')
  const index = await readFile('index.html', 'utf8')
  const publicFiles = await readdir('public')

  assert.match(robots, /User-agent: \*/)
  assert.match(robots, /Disallow: \//)
  assert.match(index, /<meta name="robots" content="noindex, nofollow, noarchive" \/>/)
  assert.doesNotMatch(index, /application\/ld\+json/)
  assert.equal(publicFiles.includes('sitemap.xml'), false)
})

test('private admin SEO surfaces remain intentionally deferred', async () => {
  const readme = await readFile('README.md', 'utf8')

  assert.match(readme, /private event-operations dashboard/i)
  assert.match(readme, /does not publish `sitemap\.xml` or JSON-LD structured data/)
  assert.match(readme, /separate public marketing landing page later/)
})
