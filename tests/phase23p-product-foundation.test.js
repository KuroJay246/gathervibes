import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Phase 23P configures Sentry React SDK without hardcoding DSN or default PII', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const monitoring = await readFile('src/lib/monitoring.js', 'utf8')
  const main = await readFile('src/main.jsx', 'utf8')
  const boundary = await readFile('src/components/AppErrorBoundary.jsx', 'utf8')
  const envExample = await readFile('.env.example', 'utf8')

  assert.equal(packageJson.dependencies['@sentry/react'], '^10.67.0')
  assert.match(monitoring, /import \* as Sentry from '@sentry\/react'/)
  assert.match(monitoring, /VITE_SENTRY_DSN/)
  assert.match(monitoring, /sendDefaultPii: false/)
  assert.match(monitoring, /userInfo: false/)
  assert.match(monitoring, /httpBodies: \[\]/)
  assert.match(monitoring, /maskAllText: true/)
  assert.match(monitoring, /blockAllMedia: true/)
  assert.match(monitoring, /beforeSend: stripPrivateContext/)
  assert.match(main, /initializeMonitoring\(\)/)
  assert.match(boundary, /captureAppError/)
  assert.match(envExample, /VITE_SENTRY_DSN=/)
  assert.doesNotMatch(monitoring, /44e3ae7d455a969a3afdac0f246fc930/)
})

test('Phase 23P adds permanent product QA and audit commands without production credentials', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const runner = await readFile('scripts/product/runProductCommand.mjs', 'utf8')
  const copyScan = await readFile('scripts/product/copyScan.mjs', 'utf8')
  const routes = await readFile('scripts/product/routeInventory.mjs', 'utf8')
  const bundle = await readFile('scripts/product/bundleSummary.mjs', 'utf8')

  for (const scriptName of ['product:qa', 'product:audit', 'product:copy-scan', 'product:routes', 'product:bundle']) {
    assert.ok(packageJson.scripts[scriptName], `${scriptName} is missing`)
  }

  assert.match(runner, /lint/)
  assert.match(runner, /test/)
  assert.match(runner, /firebase-tools@14\.19\.0/)
  assert.match(runner, /doctor:changed/)
  assert.match(runner, /doctor:json/)
  assert.match(copyScan, /blockedPhrases/)
  assert.match(routes, /expectedRoutes/)
  assert.match(bundle, /bundle-summary\.json/)
  assert.doesNotMatch(runner, /GOOGLE_APPLICATION_CREDENTIALS|CPB_PRODUCTION_APPLY_APPROVAL|serviceAccount|password|token/i)
})

test('Phase 23P adds Dependabot and CodeQL repository guardrails', async () => {
  const dependabot = await readFile('.github/dependabot.yml', 'utf8')
  const codeql = await readFile('.github/codeql/codeql-config.yml', 'utf8')

  assert.match(dependabot, /package-ecosystem: npm/)
  assert.match(dependabot, /package-ecosystem: github-actions/)
  assert.match(dependabot, /@sentry\/\*/)
  assert.match(dependabot, /firebase-admin/)
  assert.match(codeql, /paths:/)
  assert.match(codeql, /src/)
  assert.match(codeql, /scripts/)
  assert.match(codeql, /tags contain: security/)
})
