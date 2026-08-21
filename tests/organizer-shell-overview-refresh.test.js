import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('organizer shell uses grouped navigation without changing route paths or role filtering', async () => {
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const navigation = await readFile('src/utils/navigation.js', 'utf8')

  for (const group of ['Plan', 'Guests & Attendance', 'Event Day', 'Money & Follow-Up', 'Tools', 'System']) {
    assert.match(shell, new RegExp(`label: '${group}'`))
  }

  for (const route of ['/dashboard', '/events', '/registrations', '/payments', '/tickets', '/check-in', '/operations', '/communications', '/event-review', '/imports', '/settings', '/qa']) {
    assert.match(app, new RegExp(`path="${route.replace('/', '\\/')}"`))
  }

  assert.match(shell, /Registration Payments/)
  assert.match(shell, /Primary action/)
  assert.match(shell, /Automatic boundary/)
  assert.match(shell, /canViewRoute\(access, to\)/)
  assert.match(shell, /aria-label=\{collapsed \? label : undefined\}/)
  assert.match(shell, /aria-label=\{collapsed \? 'Expand navigation' : 'Collapse navigation'\}/)
  assert.match(navigation, /Home[\s\S]*Guests[\s\S]*Tickets[\s\S]*Check-In/)
  assert.doesNotMatch(navigation, /System QA/)
})

test('shared visual system tokens define calm event-neutral shell foundations', async () => {
  const styles = await readFile('src/styles.css', 'utf8')

  for (const token of [
    '--gsv-color-bg',
    '--gsv-color-surface',
    '--gsv-color-text',
    '--gsv-color-primary',
    '--gsv-color-success-bg',
    '--gsv-color-warning-bg',
    '--gsv-color-error-bg',
    '--gsv-content-max',
    '--gsv-control-height',
    '.gsv-app-shell',
    '.gsv-page-container',
    '.gsv-card',
    '.gsv-status-pill',
  ]) {
    assert.match(styles, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('Overview uses supported event metrics, attention, quick actions, and safe recent activity', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')

  for (const label of [
    'Registration records',
    'Guests',
    'Payments received',
    'Payments outstanding',
    'Tickets issued',
    'Check-Ins',
    'Operations expenses recorded',
    'Outstanding commitments',
    'Needs Attention',
    'Next Steps',
    'Latest Changes',
    'Latest changes to this event',
  ]) {
    assert.match(dashboard, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(dashboard, /buildRecentActivity/)
  assert.match(dashboard, /Registration payments only/)
  assert.match(dashboard, /Event-level ledger only/)
  assert.match(dashboard, /canViewRoute\(access, action\.to\)/)
  assert.doesNotMatch(dashboard, /Projected cash position|Net Income|Final Profit|Add Task|Add Supplier or Sponsor/)
})

test('Phase 1 guardrails preserve QR, dependencies, rules, indexes, and disabled access workflows', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const accessWorkflow = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.equal(qrPayloadForTicketCode('PHASE1-001'), 'GSV:TICKET:PHASE1-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.match(rules, /allow read, write: if false/)
  assert.match(indexes, /"indexes"/)
  assert.match(accessWorkflow, /No live access workflow is available/)
  assert.doesNotMatch(accessWorkflow, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
})
