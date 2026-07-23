import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('Phase 23S keeps organizer navigation and demo actions product-facing', async () => {
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const events = await readFile('src/pages/EventsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')

  assert.match(shell, /Overview/)
  assert.match(shell, /Guests & Registrations/)
  assert.match(shell, /Message Builder/)
  assert.match(shell, /Reports/)
  assert.match(shell, /System QA/)
  assert.match(dashboard, /Open Demo Event|Use CODEX_TEST/)
  assert.match(events, /Use CODEX_TEST/)
  assert.match(qa, /Open Demo Event/)
  assert.match(qa, /Readiness checklist/)
  assert.match(qa, /QA_PHASE23S_/)
})

test('Phase 23S removes remaining organizer-facing phase and database jargon', async () => {
  const events = await readFile('src/pages/EventsPage.jsx', 'utf8')
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const imports = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const reconciliation = await readFile('src/pages/PaymentReconciliationPage.jsx', 'utf8')

  assert.doesNotMatch(events, /Firestore admin allowlist/)
  assert.doesNotMatch(events, /events in Firestore/)
  assert.doesNotMatch(registrations, /private manifest maps audit booking IDs/)
  assert.doesNotMatch(registrations, /Current Firestore registration records/)
  assert.doesNotMatch(checkIn, /Firestore denied the write/)
  assert.doesNotMatch(imports, /No Firestore write happens until you confirm valid rows/)
  assert.doesNotMatch(operations, /Phase 23N Operations closeout applied/)
  assert.doesNotMatch(operations, /Subsets 5 and 6 locked/)
  assert.doesNotMatch(reconciliation, /No apply action exists in Phase 23C/)
})

test('Phase 23S current-product docs exist for demo, QA, deployment, and finance boundaries', async () => {
  const productGuide = await readFile('docs/PRODUCT_GUIDE.md', 'utf8')
  const routeMap = await readFile('docs/ROUTE_MAP.md', 'utf8')
  const prototypeGuide = await readFile('docs/PROTOTYPE_DEMO_GUIDE.md', 'utf8')
  const operationsGuide = await readFile('docs/OPERATIONS_GUIDE.md', 'utf8')
  const financeGuide = await readFile('docs/FINANCE_EVIDENCE_GUIDE.md', 'utf8')
  const qaGuide = await readFile('docs/QA_GUIDE.md', 'utf8')
  const deploymentGuide = await readFile('docs/DEPLOYMENT_GUIDE.md', 'utf8')
  const knownLimitations = await readFile('docs/KNOWN_LIMITATIONS.md', 'utf8')

  assert.match(productGuide, /Current companion docs/)
  assert.match(routeMap, /Organizer routes/)
  assert.match(prototypeGuide, /Select the safe demo event/)
  assert.match(prototypeGuide, /QA_PHASE23S_/)
  assert.match(operationsGuide, /What Operations is for/)
  assert.match(financeGuide, /Baker settlement review/)
  assert.match(qaGuide, /Safe QA event/)
  assert.match(deploymentGuide, /Production smoke/)
  assert.match(knownLimitations, /Message Builder is copy-only/)
})
