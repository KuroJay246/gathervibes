/* global console, process */
import { readFile } from 'node:fs/promises'

const guide = await readFile('docs/PRODUCT_GUIDE.md', 'utf8')
const archive = await readFile('docs/HISTORICAL_ARCHIVE_INDEX.md', 'utf8')
const routeMap = await readFile('docs/ROUTE_MAP.md', 'utf8')
const prototypeGuide = await readFile('docs/PROTOTYPE_DEMO_GUIDE.md', 'utf8')
const organizerQuickStart = await readFile('docs/ORGANIZER_QUICK_START.md', 'utf8')
const newEventGuide = await readFile('docs/NEW_EVENT_SETUP_GUIDE.md', 'utf8')
const lifecycleGuide = await readFile('docs/EVENT_LIFECYCLE_GUIDE.md', 'utf8')
const eventDayGuide = await readFile('docs/EVENT_DAY_GUIDE.md', 'utf8')
const operationsGuide = await readFile('docs/OPERATIONS_GUIDE.md', 'utf8')
const bakerGuide = await readFile('docs/BAKER_PAYMENT_GUIDE.md', 'utf8')
const financeGuide = await readFile('docs/FINANCE_EVIDENCE_GUIDE.md', 'utf8')
const qaGuide = await readFile('docs/QA_GUIDE.md', 'utf8')
const deploymentGuide = await readFile('docs/DEPLOYMENT_GUIDE.md', 'utf8')
const knownLimitations = await readFile('docs/KNOWN_LIMITATIONS.md', 'utf8')
const masterReference = await readFile('docs/GSV_MASTER_SYSTEM_REFERENCE.md', 'utf8')
const maintenanceManifest = await readFile('docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md', 'utf8')
const readme = await readFile('README.md', 'utf8')
const activeDocs = [
  ['README.md', readme],
  ['AI_AGENT_RULES.md', await readFile('AI_AGENT_RULES.md', 'utf8')],
  ['PROJECT_HANDOFF.md', await readFile('PROJECT_HANDOFF.md', 'utf8')],
  ['docs/PRODUCT_GUIDE.md', guide],
  ['docs/ROUTE_MAP.md', routeMap],
  ['docs/PROTOTYPE_DEMO_GUIDE.md', prototypeGuide],
  ['docs/ORGANIZER_QUICK_START.md', organizerQuickStart],
  ['docs/NEW_EVENT_SETUP_GUIDE.md', newEventGuide],
  ['docs/EVENT_LIFECYCLE_GUIDE.md', lifecycleGuide],
  ['docs/EVENT_DAY_GUIDE.md', eventDayGuide],
  ['docs/OPERATIONS_GUIDE.md', operationsGuide],
  ['docs/BAKER_PAYMENT_GUIDE.md', bakerGuide],
  ['docs/FINANCE_EVIDENCE_GUIDE.md', financeGuide],
  ['docs/QA_GUIDE.md', qaGuide],
  ['docs/DEPLOYMENT_GUIDE.md', deploymentGuide],
  ['docs/KNOWN_LIMITATIONS.md', knownLimitations],
  ['docs/GSV_MASTER_SYSTEM_REFERENCE.md', masterReference],
  ['docs/GSV_REPOSITORY_AND_MAINTENANCE_MANIFEST.md', maintenanceManifest],
]
const requiredGuideTerms = [
  'Product overview',
  'Current companion docs',
  'Organizer Quick Start',
  'New Event Setup Guide',
  'Event Lifecycle Guide',
  'Event Day Guide',
  'Baker Payment Guide',
  'Route map',
  'Authorization and data access',
  'Registrations and finance',
  'Operations and in-kind support',
  'Tickets, QR, and check-in',
  'Import Center',
  'Settings and System QA',
  'Evidence reconciliation',
  'Product QA',
  'Monitoring and release',
  'Current limitations',
  'CodeQL CI is not active',
]

const missing = requiredGuideTerms.filter((term) => !guide.includes(term))
if (!archive.includes('Current behavior is documented') || !archive.includes('historical files are not current operating instructions')) {
  missing.push('historical archive index sections')
}
if (!routeMap.includes('Organizer routes') || !routeMap.includes('Working Event rules')) {
  missing.push('route map guide sections')
}
if (!prototypeGuide.includes('Select the safe demo event') || !prototypeGuide.includes('QA_DEMO_')) {
  missing.push('organizer rehearsal guide sections')
}
if (!organizerQuickStart.includes('Start here') || !organizerQuickStart.includes('Working Event')) {
  missing.push('organizer quick start sections')
}
if (!newEventGuide.includes('Step 1 - Event Basics') || !newEventGuide.includes('Step 5 - Readiness')) {
  missing.push('new event setup guide sections')
}
if (!lifecycleGuide.includes('Draft') || !lifecycleGuide.includes('Completed')) {
  missing.push('event lifecycle guide sections')
}
if (!eventDayGuide.includes('Before guests arrive') || !eventDayGuide.includes('During the event')) {
  missing.push('event day guide sections')
}
if (!operationsGuide.includes('What Operations is for') || !operationsGuide.includes('Baker payments')) {
  missing.push('operations guide sections')
}
if (!bakerGuide.includes('Mark a baker payment as paid') || !bakerGuide.includes('Do not change patron totals')) {
  missing.push('baker payment guide sections')
}
if (!financeGuide.includes('Evidence classes') || !financeGuide.includes('Baker settlement review')) {
  missing.push('finance evidence guide sections')
}
if (!qaGuide.includes('Safe QA event') || !qaGuide.includes('Browser review')) {
  missing.push('QA guide sections')
}
if (!deploymentGuide.includes('Before merge') || !deploymentGuide.includes('Production smoke')) {
  missing.push('deployment guide sections')
}
if (!knownLimitations.includes('Known Limitations') || !knownLimitations.includes('Message Builder is copy-only')) {
  missing.push('known limitations sections')
}
if (!masterReference.includes('Gather & Savor Master System Reference') || !masterReference.includes('CODEX_DEMO - Full System Walkthrough')) {
  missing.push('master system reference')
}
if (!maintenanceManifest.includes('Gather & Savor Repository And Maintenance Manifest') || !maintenanceManifest.includes('gsv-file-inventory.json')) {
  missing.push('repository maintenance manifest')
}
if (!readme.includes('Current Truth') || !readme.includes('Start Here')) {
  missing.push('README current docs summary')
}

const activeText = activeDocs.map(([, text]) => text).join('\n')
const activeDocFailures = []
for (const [file, text] of activeDocs) {
  const mentionsRetiredCodexTest = /CODEX_TEST Live Verification Event|xPfa0b3KZyLSDnAD2uGI/.test(text)
  const framesRetiredCodexTest = /retired|historical|older QA fixture/i.test(text)
  if (mentionsRetiredCodexTest && !framesRetiredCodexTest) {
    activeDocFailures.push(`${file}: retired CODEX_TEST appears without retired/historical framing`)
  }
  const cpbSpecialProtectionPattern = /CPB-specific write lock|CPB-specific zero-write|CPB-specific approval gate|protected CPB|CPB lock|CPB is read-only/i
  const negatedCpbSpecialProtection = /do not preserve CPB-specific|do not add CPB-specific|do not create CPB-specific|Remove CPB-specific/i
  if (cpbSpecialProtectionPattern.test(text) && !negatedCpbSpecialProtection.test(text)) {
    activeDocFailures.push(`${file}: CPB-specific protection wording appears as current guidance`)
  }
  if (/Communications Pro|Copy-Only Command Center|AI integration coming later|Phase 11|Phase 13A/i.test(text)) {
    activeDocFailures.push(`${file}: legacy communications/phase wording appears in current docs`)
  }
}

if (!activeText.includes('CODEX_DEMO - Full System Walkthrough')) {
  activeDocFailures.push('CODEX_DEMO current QA/training event is missing from active docs')
}
if (!activeText.includes('CPB is a normal completed real event')) {
  activeDocFailures.push('CPB normal completed-event safeguard statement is missing')
}
if (!activeText.includes('Protected Owner')) {
  activeDocFailures.push('Protected Owner reference is missing')
}
if (!activeText.includes('Message Builder is copy-only') && !activeText.includes('Messages are not sent automatically')) {
  activeDocFailures.push('Message Builder copy-only boundary is missing')
}
if (!routeMap.includes('/payments/reconciliation') || !masterReference.includes('/payments/reconciliation')) {
  activeDocFailures.push('Payment Reconciliation route is missing from current route documentation')
}
if (!archive.includes('Historical files may mention retired `CODEX_TEST`') || !archive.includes('CPB-specific gates')) {
  activeDocFailures.push('Historical archive index does not quarantine retired fixture / CPB historical contradictions')
}

if (activeDocFailures.length) {
  missing.push(...activeDocFailures)
}
if (missing.length) {
  console.error(`Documentation check failed: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`Documentation check passed: ${requiredGuideTerms.length} product-guide sections, current docs, archive index, and stale-language guardrails present.`)
}
