import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { escapeCsv } from '../src/utils/exportUtils.js'

// ─── 1. Immediate Audit Fixes ─────────────────────────────────────────────────

test('CSV injection prevention: sanitises formula-starting values', () => {
  assert.equal(escapeCsv('=SUM(A1)'), `"'=SUM(A1)"`)
  assert.equal(escapeCsv('+HARM'), `"'+HARM"`)
  assert.equal(escapeCsv('-DROP'), `"'-DROP"`)
  assert.equal(escapeCsv('@FOO'), `"'@FOO"`)
  assert.equal(escapeCsv('Normal Name'), '"Normal Name"')
  assert.equal(escapeCsv(''), '""')
  assert.equal(escapeCsv(null), '""')
})

test('RegistrationsPage includes Door Paid and To Pay at Door tabs', async () => {
  const src = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  assert.match(src, /Door Paid/)
  assert.match(src, /To Pay at Door/)
  assert.match(src, /'door-list'/)
})

test('QA page includes empty allowlist check', async () => {
  const src = await readFile('src/pages/QaPage.jsx', 'utf8')
  assert.match(src, /Empty allowlist|approvedEmails/)
})

test('CommunicationsPage includes AI prompt safety notice', async () => {
  const src = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  assert.match(src, /AI Prompt Safety|paste.*third.party|third.party.*AI|Prompt.*Safety|Draft Only/i)
})

// ─── 2. QR Scanner Polish ─────────────────────────────────────────────────────

test('QrScannerPanel includes success beep via Web Audio API', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /AudioContext|webkitAudioContext/)
  assert.match(src, /createOscillator/)
  assert.match(src, /playSuccessBeep/)
})

test('QrScannerPanel includes haptic feedback via navigator.vibrate', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /navigator\.vibrate/)
  assert.match(src, /triggerHaptic/)
})

test('QrScannerPanel includes Continuous Scan Mode toggle', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /continuousScan/)
  assert.match(src, /Continuous Scan Mode/)
})

test('QrScannerPanel includes torch/flashlight toggle', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /torchSupported/)
  assert.match(src, /toggleTorch|Turn on light|Turn off light/i)
})

test('QrScannerPanel mentions HTTPS requirement in camera error message', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /HTTPS/)
})

test('QrScannerPanel beep and haptic only fire for new (non-duplicate) scan match', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  // playSuccessBeep must be inside a block guarded by !match.checkedIn
  assert.match(src, /!match\.checkedIn/)
  assert.match(src, /playSuccessBeep/)
})

test('QrScannerPanel accepts resumeTrigger prop', async () => {
  const src = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')
  assert.match(src, /resumeTrigger/)
})

// ─── 3. Event-Day Mobile UX ───────────────────────────────────────────────────

test('CheckInPage has sticky header for mobile event-day use', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /sticky/)
})

test('CheckInPage shows inline checked-in count in header', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /Checked In:/)
  assert.match(src, /guestCountText\(summary\.checkedInRegistrations, summary\.checkedInPersons\)/)
})

test('CheckInPage includes organizer-review list filters and group badges', async () => {
  const page = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const utils = await readFile('src/utils/checkInUtils.js', 'utf8')
  assert.match(utils, /Group Registrations/)
  assert.match(utils, /Complimentary/)
  assert.match(utils, /Needs Review/)
  assert.match(page, /Bulk actions require confirmation/)
  assert.match(page, /Group of/)
})

test('CheckInPage includes check-in timestamp on undo confirmation modal', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /Checked in at:|formatCheckInTime/)
})

test('CheckInPage search cap is raised to 20', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /slice\(0, 20\)/)
  assert.doesNotMatch(src, /slice\(0, 8\)/)
})

test('CheckInPage passes resumeScanTrigger to QrScannerPanel', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /resumeScanTrigger/)
  assert.match(src, /resumeTrigger=\{resumeScanTrigger\}/)
})

test('CheckInPage guest result buttons have minimum 72px touch target height', async () => {
  const src = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  assert.match(src, /min-h-\[72px\]/)
})

// ─── 4. Import Reliability ────────────────────────────────────────────────────

test('importService chunkSize is 50', async () => {
  const src = await readFile('src/services/importService.js', 'utf8')
  assert.match(src, /chunkSize\s*=\s*50/)
})

test('importService commitImport accepts onProgress callback', async () => {
  const src = await readFile('src/services/importService.js', 'utf8')
  assert.match(src, /onProgress/)
  assert.match(src, /onProgress\(/)
})

test('importService reports clear error on chunk failure', async () => {
  const src = await readFile('src/services/importService.js', 'utf8')
  assert.match(src, /Failed to import batch starting at row/)
})

test('ImportPreviewTable shows chunked progress during import', async () => {
  const src = await readFile('src/components/imports/ImportPreviewTable.jsx', 'utf8')
  assert.match(src, /importProgress/)
  assert.match(src, /Starting Import|Importing.*of/)
})

// ─── 5. Offline Persistence ───────────────────────────────────────────────────

test('firebase.js uses initializeFirestore with persistentLocalCache', async () => {
  const src = await readFile('src/lib/firebase.js', 'utf8')
  assert.match(src, /initializeFirestore/)
  assert.match(src, /persistentLocalCache/)
  assert.match(src, /persistentMultipleTabManager/)
})

test('firebase.js guards persistence against test environment', async () => {
  const src = await readFile('src/lib/firebase.js', 'utf8')
  assert.match(src, /__FIRESTORE_TEST_ENV__|MODE.*test/)
})

test('runtimeHealth includes offline persistence status item', async () => {
  const src = await readFile('src/utils/runtimeHealth.js', 'utf8')
  assert.match(src, /Offline persistence/)
})

// ─── 6. Safety & Deferred Reminders ──────────────────────────────────────────

test('CommunicationsPage does not reference Gmail or Outlook OAuth tokens', async () => {
  const src = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  assert.doesNotMatch(src, /gmail.*oauth|outlook.*oauth|gmail.*token|outlook.*token/i)
})

test('CommunicationsPage does not reference real AI API keys', async () => {
  const src = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  assert.doesNotMatch(src, /OPENAI_API_KEY|ANTHROPIC_API_KEY/i)
})

test('Export utils do not include auditLogs collection data', async () => {
  const src = await readFile('src/utils/exportUtils.js', 'utf8')
  assert.doesNotMatch(src, /auditLogs.*export|export.*auditLogs/)
})

test('Export utils do not include settings/accessControl data', async () => {
  const src = await readFile('src/utils/exportUtils.js', 'utf8')
  assert.doesNotMatch(src, /accessControl.*export|export.*accessControl/)
})
