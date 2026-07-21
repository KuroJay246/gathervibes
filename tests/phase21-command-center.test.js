import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Overview keeps event priorities and high-frequency action destinations', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const readiness = await readFile('src/utils/eventReadiness.js', 'utf8')

  assert.match(dashboard, /Needs Attention/)
  assert.match(dashboard, /Quick Actions/)
  assert.match(dashboard, /Registration records/)
  assert.match(dashboard, /Payments Received/)
  assert.match(dashboard, /to: '\/registrations'/)
  assert.match(dashboard, /to: '\/tickets'/)
  assert.match(dashboard, /to: '\/operations'/)
  assert.match(dashboard, /to="\/event-review"/)
  assert.doesNotMatch(dashboard, /Event command center/)
  assert.doesNotMatch(dashboard, /Quick navigation/)
  assert.match(readiness, /Payment pending/)
  assert.match(readiness, /Missing ticket/)
  assert.match(readiness, /Data incomplete/)
})

test('Phase 21 improves operations control summaries using existing ledger data only', async () => {
  const operationsPage = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const operationsReport = await readFile('src/utils/operationsReport.js', 'utf8')

  assert.match(operationsPage, /Open ledger items/)
  assert.match(operationsPage, /Pending income/)
  assert.match(operationsPage, /Pending expenses/)
  assert.match(operationsPage, /What this means:/)
  assert.match(operationsReport, /buildOperationsControlSummary/)
  assert.match(operationsReport, /Open ledger items:/)
})

test('Phase 21 preserves QR, dependency, access, and private-data guardrails', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const packageLock = await readFile('package-lock.json', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const options = await readFile('PHASE_21_EVENT_COMMAND_CENTER_OPTIONS.md', 'utf8')

  assert.equal(qrPayloadForTicketCode('PH21-001'), 'GSV:TICKET:PH21-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.doesNotMatch(packageLock, /node_modules\/xlsx/)
  assert.match(settings, /Access request actions disabled/)
  assert.match(settings, /Assignment editing disabled/)
  assert.match(settings, /Lead scanner disabled/)
  assert.match(options, /Event readiness checklist/)
  assert.match(options, /Staff \/ access workflow later/)
  assert.match(options, /Scanner only when event day is near/)
})
