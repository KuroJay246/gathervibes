import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildRuntimeHealthItems } from '../src/utils/runtimeHealth.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 15B removes vulnerable xlsx package while keeping read-excel-file import path', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const packageLock = await readFile('package-lock.json', 'utf8')
  const xlsxImport = await readFile('src/utils/xlsxImport.js', 'utf8')

  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.doesNotMatch(packageLock, /node_modules\/xlsx/)
  assert.doesNotMatch(xlsxImport, /from 'xlsx'|XLSX\.read|XLSX\.utils/)
  assert.match(xlsxImport, /read-excel-file\/browser/)
  assert.match(xlsxImport, /readExcelFile\(workbookBuffer\)/)
})

test('XLSX imports still use preview-first sheet parsing workflow', async () => {
  const xlsxImport = await readFile('src/utils/xlsxImport.js', 'utf8')
  const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')

  assert.match(xlsxImport, /rowsToParsedTable/)
  assert.match(xlsxImport, /sourceKey: `sheet-\$\{index \+ 1\}`/)
  assert.match(xlsxImport, /sampleRows/)
  assert.match(xlsxImport, /importable: parsed\.headers\.length > 0 && parsed\.rows\.length > 0/)
  assert.match(importsPage, /Select the worksheet to import/)
  assert.match(importsPage, /No event records are saved until you confirm valid rows/)
})

test('Settings removes the roadmap archive while documentation retains release history', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')

  for (const text of ['Settings', 'Event Defaults', 'Currency', 'Ticket prefix', 'Organizer Access', 'Tickets & Check-In', 'Message Builder', 'Advanced']) {
    assert.match(settings, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  for (const text of [
    'Closed / shipped phases',
    'Current active phase',
    'High-priority operational backlog',
    'Deferred integrations',
    'Phase 17G-B2',
    'Automatic email sending',
    'Automatic WhatsApp sending',
  ]) {
    assert.doesNotMatch(settings, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(`${readme}\n${handoff}`, /Access Request Rules Prototype \+ Tests/)
  assert.match(`${readme}\n${handoff}`, /Deferred integrations/)
  assert.match(readme, /Phase 15B status/)
  assert.match(handoff, /Phase 17B staff access model/)
})

test('private access status reflects disabled workflow boundaries without roadmap copy', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const healthItems = buildRuntimeHealthItems({
    firebaseConfigured: true,
    projectId: 'gathervibeshub',
    user: { email: 'admin@example.com' },
    currentRoleLabel: 'Check-In Staff',
    allowlistApproved: true,
    eventsStatus: 'ok',
    registrationsStatus: 'ok',
    auditStatus: 'ok',
    serviceWorkerSafe: true,
    activeEvent: { eventId: 'event-1', eventName: 'CODEX_TEST Live Verification Event' },
    buildCommit: 'abc123',
  })

  assert.match(settings, /Access is controlled outside this page/)
  assert.match(settings, /cannot add, remove, disable, or change anyone's role/)
  assert.match(settings, /Helper access does not grant Settings or full organizer access/)
  assert.match(settings, /Normal scanner users cannot undo attendance or check guests out/)
  assert.doesNotMatch(settings, /Submit request \(not live\)/)
  assert.doesNotMatch(settings, /Approve request: not live/)
  assert.doesNotMatch(settings, /Phase 17/)
  assert.match(qa, /Staff role boundary/)
  assert.equal(healthItems.find((item) => item.label === 'Staff role boundary').status, 'ok')
  assert.match(healthItems.find((item) => item.label === 'Protected owner and approved organizers').detail, /Protected owner UID plus secondary approved organizers/)
  assert.match(healthItems.find((item) => item.label === 'Firestore role enforcement').detail, /Rules enforce private admin access/)
  assert.match(healthItems.find((item) => item.label === 'Daily QA workflow').detail, /CODEX_TEST checks/)
})

test('Phase 17D planning docs and readiness docs exist and preserve current live safety boundaries', async () => {
  const aiRules = await readFile('AI_AGENT_RULES.md', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')
  const plan = await readFile('PHASE_17D_PLAN.md', 'utf8')
  const readiness = await readFile('PHASE_17D_D_ACCESS_WORKFLOW_READINESS.md', 'utf8')

  assert.match(aiRules, /Phase 17D-B is scanner-only polish work/)
  assert.match(aiRules, /Phase 17D-C is read-only\/admin UI foundation only/)
  assert.match(readme, /Phase 17D-A closed status/)
  assert.match(handoff, /Phase 17D-A: Access & Roles Planning \+ Scanner Day-of Polish Blueprint/)
  assert.match(readme, /Organizer review is recorded as PASS/)
  assert.match(handoff, /Organizer review is recorded as PASS/)
  assert.match(plan, /Role capability matrix/)
  assert.match(plan, /lead-scanner role planning only/i)
  assert.match(plan, /Settings must not rewrite Firestore rules dynamically/i)
  assert.match(plan, /`approvedEmails` remains admin-level access only/i)
  assert.match(plan, /staffProfiles\/\{uid\}/)
  assert.match(plan, /events\/\{eventId\}\/staffAssignments\/\{uid\}/)
  assert.match(plan, /Scanner\/check-in-only remains assigned-event-only check-in access with no undo\/check-out/i)
  assert.match(plan, /CPB remains protected production data/i)
  assert.match(plan, /QR payload exactly as `GSV:TICKET:\{ticketCode\}`/i)
  assert.doesNotMatch(plan, /approve users live|revoke users live|lead scanner implemented/i)
  assert.match(readiness, /No approval workflow is live yet\./)
  assert.match(readiness, /No revoke workflow is live yet\./)
  assert.match(readiness, /No staff assignment editing is live yet\./)
  assert.match(readiness, /No lead-scanner permission is live yet\./)
  assert.match(readiness, /Firestore rules deployment requires separate approval\./)
})

test('Event Operations page documents active ledger and future modules only', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(operations, /Operations Ledger is active/)
  assert.match(operations, /separate from registration payment records/)
  assert.match(operations, /sponsor income/)
  assert.match(operations, /operations helpers can only view assigned-event entries/)
  assert.match(settings, /Managed in Operations/)
  assert.match(settings, /Registration payments/)
  assert.match(settings, /does not automatically send email/)
})

test('Phase 15B keeps QR privacy and Phase 15A private indexing protections', async () => {
  const firebaseJson = await readFile('firebase.json', 'utf8')
  const robots = await readFile('public/robots.txt', 'utf8')
  const index = await readFile('index.html', 'utf8')

  assert.equal(qrPayloadForTicketCode('CPB-001'), 'GSV:TICKET:CPB-001')
  assert.doesNotMatch(qrPayloadForTicketCode('CPB-001'), /guest|paid|amount|@|phone/i)
  assert.match(firebaseJson, /X-Frame-Options/)
  assert.match(firebaseJson, /frame-ancestors 'none'/)
  assert.match(robots, /Disallow: \//)
  assert.match(index, /noindex, nofollow, noarchive/)
})
