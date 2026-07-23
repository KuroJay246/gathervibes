/* global console, process */
import { readFile } from 'node:fs/promises'

const guide = await readFile('docs/PRODUCT_GUIDE.md', 'utf8')
const archive = await readFile('docs/HISTORICAL_ARCHIVE_INDEX.md', 'utf8')
const routeMap = await readFile('docs/ROUTE_MAP.md', 'utf8')
const prototypeGuide = await readFile('docs/PROTOTYPE_DEMO_GUIDE.md', 'utf8')
const operationsGuide = await readFile('docs/OPERATIONS_GUIDE.md', 'utf8')
const financeGuide = await readFile('docs/FINANCE_EVIDENCE_GUIDE.md', 'utf8')
const qaGuide = await readFile('docs/QA_GUIDE.md', 'utf8')
const deploymentGuide = await readFile('docs/DEPLOYMENT_GUIDE.md', 'utf8')
const knownLimitations = await readFile('docs/KNOWN_LIMITATIONS.md', 'utf8')
const readme = await readFile('README.md', 'utf8')
const requiredGuideTerms = [
  'Product overview',
  'Current companion docs',
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
if (!prototypeGuide.includes('Select the safe demo event') || !prototypeGuide.includes('QA_PHASE23S_')) {
  missing.push('prototype demo guide sections')
}
if (!operationsGuide.includes('What Operations is for') || !operationsGuide.includes('CPB closeout boundaries')) {
  missing.push('operations guide sections')
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
