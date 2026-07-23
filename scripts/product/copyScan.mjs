/* global console, process */
import { readFile } from 'node:fs/promises'

const files = [
  'src/App.jsx',
  'src/layout/AppShell.jsx',
  'src/pages/DashboardPage.jsx',
  'src/pages/EventsPage.jsx',
  'src/pages/RegistrationsPage.jsx',
  'src/pages/ImportsPage.jsx',
  'src/pages/PaymentsPage.jsx',
  'src/pages/TicketsPage.jsx',
  'src/pages/CheckInPage.jsx',
  'src/pages/ScannerPage.jsx',
  'src/pages/OperationsPage.jsx',
  'src/pages/EventReviewPage.jsx',
  'src/pages/CommunicationsPage.jsx',
  'src/pages/SettingsPage.jsx',
  'src/pages/QaPage.jsx',
]

const blockedPhrases = [
  /View current events, period, and next actions/i,
  /Phase 23J Apply/i,
  /Apply Phase 23N/i,
  /Reapply/i,
  /Phase 23N Operations closeout applied/i,
  /Subsets 5 and 6 locked/i,
  /No apply action exists in Phase 23C/i,
  /events in Firestore/i,
  /Firestore admin allowlist/i,
  /Current Firestore registration records/i,
  /private manifest maps audit booking IDs/i,
  /Nothing is uploaded and no new Firestore data is created/i,
  /Firestore denied the write/i,
  /No Firestore write happens until you confirm valid rows/i,
  /Break the world/i,
  /CPB Payment Audit Backfill/i,
  /Cole also has the actual spreadsheet/i,
]

let failures = 0

for (const file of files) {
  const text = await readFile(file, 'utf8')
  for (const pattern of blockedPhrases) {
    if (pattern.test(text)) {
      console.error(`${file}: blocked organizer-facing phrase matched ${pattern}`)
      failures += 1
    }
  }
}

if (failures > 0) {
  process.exitCode = 1
} else {
  console.log(`Copy scan passed for ${files.length} primary UI files.`)
}
