/* global console, process */
import { readFile } from 'node:fs/promises'

const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')
const app = await readFile('src/App.jsx', 'utf8')
const normalUi = `${importsPage}\n${app}`
const blocked = [
  'PaymentAuditBackfillPanel',
  'Phase 23J Apply',
  'Apply Phase 23N',
  'Reapply',
]
const found = blocked.filter((term) => normalUi.includes(term))

if (found.length) {
  console.error(`Legacy control check failed: ${found.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('Legacy control check passed: completed CPB recovery and Apply controls are absent from normal organizer routes.')
}
