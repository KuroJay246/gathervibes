/* global console, process */
import { readFile } from 'node:fs/promises'

const guide = await readFile('docs/PRODUCT_GUIDE.md', 'utf8')
const archive = await readFile('docs/HISTORICAL_ARCHIVE_INDEX.md', 'utf8')
const requiredGuideTerms = [
  'Product overview',
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
if (missing.length) {
  console.error(`Documentation check failed: ${missing.join(', ')}`)
  process.exitCode = 1
} else {
  console.log(`Documentation check passed: ${requiredGuideTerms.length} current-product sections and archive index present.`)
}
