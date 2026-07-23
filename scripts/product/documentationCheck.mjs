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
const readme = await readFile('README.md', 'utf8')
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
if (!archive.includes('Current behavior is documented') || !archive.includes('CPB reconciliation history')) {
  missing.push('historical archive index sections')
}
if (!routeMap.includes('Organizer routes') || !routeMap.includes('Working Event rules')) {
  missing.push('route map guide sections')
}
if (!prototypeGuide.includes('Select the safe QA event') || !prototypeGuide.includes('QA_PHASE23T_')) {
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
if (!readme.includes('Current product docs') || !readme.includes('Current workspace summary')) {
  missing.push('README current docs summary')
}
if (missing.length) {
  console.error(`Documentation check failed: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`Documentation check passed: ${requiredGuideTerms.length} product-guide sections, current docs, and archive index present.`)
}
