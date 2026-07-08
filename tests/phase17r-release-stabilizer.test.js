import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 17R core routes keep clean no-selected-event boundaries and explicit working-event guidance', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const tickets = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')

  assert.match(dashboard, /Working Event/)
  assert.match(dashboard, /No selected Working Event/)
  assert.match(registrations, /Select an event from Events or the dashboard before managing registrations/)
  assert.match(imports, /Select an event before importing registrations/)
  assert.match(tickets, /Select a Working Event before assigning ticket codes/)
  assert.match(operations, /Select a Working Event before tracking event operations money/)
  assert.match(checkIn, /Select a Working Event before opening the door check-in screen/)
})

test('Phase 17R preserves auth route gating and blocked access workflow boundaries', async () => {
  const protectedRoute = await readFile('src/auth/ProtectedRoute.jsx', 'utf8')
  const authProvider = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')

  assert.match(protectedRoute, /Navigate to="\/login" replace state=\{\{ from: location \}\}/)
  assert.match(protectedRoute, /canViewRoute\(access, location\.pathname\)/)
  assert.match(authProvider, /readAdminAccessControl/)
  assert.match(authProvider, /readStaffAccess/)
  assert.match(authProvider, /if \(accessControl\)/)
  assert.match(settings, /Submit request \(not live\)/)
  assert.match(settings, /Approve request: not live/)
  assert.match(settings, /Decline request: not live/)
  assert.match(settings, /Revoke access: not live/)
  assert.match(qa, /Phase 17G-B2 deployed backend accessRequests rules and did not deploy Firestore indexes/)
  assert.match(health, /Phase 17G-B2 is in progress on the current branch with Firestore rules deployed, admin smoke passed, and scanner smoke still pending/)
})

test('Phase 17R preserves CPB, approvedEmails, and QR payload guardrails', async () => {
  const aiRules = await readFile('AI_AGENT_RULES.md', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')

  assert.equal(qrPayloadForTicketCode('CT-001'), 'GSV:TICKET:CT-001')
  assert.doesNotMatch(qrPayloadForTicketCode('CT-001'), /guest|paid|amount|@|phone/i)
  assert.match(aiRules, /Treat `approvedEmails` as admin-level access only\./)
  assert.match(aiRules, /Protect CPB as production data\./)
  assert.match(readme, /CPB remains untouched/)
  assert.match(handoff, /`approvedEmails` remains unchanged and admin-only/)
  assert.match(handoff, /CPB remains untouched/)
})
