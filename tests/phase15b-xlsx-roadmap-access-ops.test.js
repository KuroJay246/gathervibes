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
  assert.match(importsPage, /No Firestore write happens until you confirm valid rows/)
})

test('roadmap shows ordered Phase 17A backlog, closed shipped phases, deferred integrations, and future ops backlog', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')

  for (const text of [
    '1. Closed / shipped phases',
    '2. Current active phase',
    '3. Next recommended phase',
    '4. High-priority operational backlog',
    '5. Access / staff / worker permissions backlog',
    '6. Event Operations backlog',
    '7. QA / reliability backlog',
    '8. Deferred integrations',
    '9. Public portals / native app / future long-term ideas',
    '10. Explicitly not implemented / out of scope',
    'Phase 14B CPB Payment Audit UI Cleanup / Operations Review Fixes',
    'Phase 15A Hosting Security Headers + Private Indexing',
    'Phase 15B XLSX Dependency Security Review + Roadmap/Access/Ops Update',
    'Phase 16 Live Browser Loading Diagnostics + Ticket/Check-In QA Hardening',
    'Phase 17A Visibility, Counts, Backlog Reorganization, and Staff Access Planning',
    'Phase 17B Firestore-enforced staff/worker role design',
    'Google Sheets OAuth',
    'Gmail/Outlook OAuth',
    'Real AI API integration',
    'Automatic email sending',
    'Automatic WhatsApp sending',
    'Cloud Functions',
    'Firebase Storage',
    'Public attendee / baker / school portals',
    'Payment gateway integration',
    'Native app / app store build',
    'Firestore-enforced staff roles',
    'Mother/Event Manager simplified view',
  ]) {
    assert.match(settings, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  for (const text of [
    'Closed / shipped phases',
    'Current active phase',
    'Next recommended phase',
    'High-priority operational backlog',
    'Access / staff / worker permissions backlog',
    'Event Operations backlog',
    'QA / reliability backlog',
    'Deferred integrations',
    'Public portals / native app / future long-term ideas',
    'Explicitly not implemented / out of scope',
  ]) {
    assert.match(`${readme}\n${handoff}`, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(readme, /Phase 15B status/)
  assert.match(readme, /closed, merged, and deployed/)
  assert.doesNotMatch(settings, /Complete \/ pending approval/)
  assert.match(readme, /public sitemap\/JSON-LD/)
  assert.match(readme, /budget\/expense reporting/)
  assert.match(readme, /event-day run sheet/)
  assert.match(handoff, /Phase 17B staff access plan/)
})

test('private access status does not overclaim Firestore role enforcement', async () => {
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

  assert.match(settings, /Roles currently control the admin interface display/)
  assert.match(settings, /Firestore access is still enforced by the approved-admin email allowlist/)
  assert.match(settings, /Temporary event-day helpers should not be given access/)
  assert.match(qa, /Staff roles enforcement level/)
  assert.match(qa, /Firestore role enforcement/)
  assert.equal(healthItems.find((item) => item.label === 'Staff roles enforcement level').status, 'warn')
  assert.match(healthItems.find((item) => item.label === 'Firestore role enforcement').detail, /Future phase/)
})

test('Event Operations page documents active ledger and future modules only', async () => {
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')

  assert.match(operations, /Operations Ledger is active/)
  assert.match(operations, /separate from ticket sales/)
  assert.match(operations, /tasks, supplies, vendors, sponsors, school\/baker tracking/)
  assert.match(operations, /does not add public access, sending, OAuth, Cloud Functions, Storage, payment processing, or new operations modules/)
  assert.match(settings, /Operations Ledger/)
  assert.match(settings, /supplies checklist/)
  assert.match(settings, /baker\/vendor tracking/)
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
