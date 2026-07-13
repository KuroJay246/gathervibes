import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Daily QA workflow stays read-only and matches the current login surface', async () => {
  const workflow = await readFile('.github/workflows/daily-qa.yml', 'utf8')

  assert.match(workflow, /permissions:\s*[\s\S]*contents: read/)
  assert.match(workflow, /node-version: 22/)
  assert.match(workflow, /const appAssets = assets\.filter\(\(name\) => name\.endsWith\('\.js'\)\)/)
  assert.match(workflow, /Promise\.all\(appAssets\.map\(\(name\) => readFile\(`dist\/assets\/\$\{name\}`, 'utf8'\)\)\)/)
  assert.match(workflow, /Continue with Google/)
  assert.match(workflow, /Sign in with email/)
  assert.match(workflow, /Sign in securely/)
  assert.match(workflow, /Daily QA is read-only/)
  assert.match(workflow, /QA_WRITE_SMOKE=true/)
  assert.doesNotMatch(workflow, /firebase deploy|firestore:rules|firestore:indexes/)
})

test('access workflow remains disabled in organizer Settings', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(settings, /Access request actions disabled/)
  assert.match(settings, /Staff profile editing disabled/)
  assert.match(settings, /Assignment editing disabled/)
  assert.match(settings, /Role editing is not exposed/)
  assert.doesNotMatch(settings, /Approve request: not live/)
  assert.doesNotMatch(settings, /Submit request \(not live\)/)
  assert.doesNotMatch(settings, /Requester form prototype/)
})

test('Phase 17E-E readiness artifact preserves deployment gates and rollback boundaries', async () => {
  const readiness = await readFile('PHASE_17E_E_ACCESS_WORKFLOW_DEPLOYMENT_READINESS.md', 'utf8')

  assert.match(readiness, /Status: active readiness artifact only/)
  assert.match(readiness, /Phase 17E-E is deployment-readiness and rollback planning only\./)
  assert.match(readiness, /Firestore rules are not deployed in 17E-E\./)
  assert.match(readiness, /Firestore indexes are not deployed in 17E-E\./)
  assert.match(readiness, /rules dry-run passes/)
  assert.match(readiness, /Do not deploy Firestore indexes unless separately approved\./)
  assert.match(readiness, /If scanner access breaks/)
  assert.match(readiness, /If admin access breaks/)
  assert.match(readiness, /If CPB is exposed/)
  assert.match(readiness, /`approvedEmails` must remain admin-only\./)
  assert.match(readiness, /Do not use CPB for QA\./)
  assert.match(readiness, /Use CODEX_TEST only/)
})
