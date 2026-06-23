import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  QR_TICKET_PREFIX,
  findRegistrationByQrTicketCode,
  parseQrTicketCode,
  qrPayloadForTicketCode,
} from '../src/utils/qrTicketUtils.js'

test('QR ticket payload uses safe prefixed ticket code only', () => {
  const payload = qrPayloadForTicketCode(' cpb-001 ')

  assert.equal(payload, `${QR_TICKET_PREFIX}CPB-001`)
  assert.doesNotMatch(payload, /@|555|Jane|Guest|Notes/i)
})

test('QR ticket parser accepts raw and prefixed ticket codes', () => {
  assert.deepEqual(parseQrTicketCode('CPB-001'), { ticketCode: 'CPB-001', error: '' })
  assert.deepEqual(parseQrTicketCode('gsv-abc123'), { ticketCode: 'GSV-ABC123', error: '' })
  assert.deepEqual(parseQrTicketCode(' GSV:TICKET:cpb-002 '), { ticketCode: 'CPB-002', error: '' })
})

test('QR ticket parser rejects empty and invalid payloads', () => {
  assert.match(parseQrTicketCode('').error, /first/)
  assert.match(parseQrTicketCode('mailto:test@example.com').error, /valid ticket code/)
  assert.match(parseQrTicketCode('GSV:TICKET:test@example.com').error, /valid ticket code/)
})

test('QR lookup matches only registrations supplied for the selected Working Event', () => {
  const codexTestRegistrations = [
    { registrationId: 'codex-1', eventId: 'CODEX_TEST', ticketCode: 'CT-001', checkedIn: false },
    { registrationId: 'codex-2', eventId: 'CODEX_TEST', ticketCode: 'CT-002', checkedIn: true },
  ]
  const cpbRegistration = { registrationId: 'cpb-1', eventId: 'CPB', ticketCode: 'CPB-001', checkedIn: false }

  assert.equal(findRegistrationByQrTicketCode(codexTestRegistrations, 'GSV:TICKET:CT-001')?.registrationId, 'codex-1')
  assert.equal(findRegistrationByQrTicketCode(codexTestRegistrations, 'CT-002')?.checkedIn, true)
  assert.equal(findRegistrationByQrTicketCode(codexTestRegistrations, cpbRegistration.ticketCode), null)
})

test('Tickets page renders QR previews without adding private data to QR payloads', async () => {
  const ticketsPage = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const qrComponent = await readFile('src/components/tickets/TicketQrCode.jsx', 'utf8')

  assert.match(ticketsPage, /TicketQrCode/)
  assert.match(ticketsPage, /QR codes encode only the assigned ticket code/)
  assert.match(qrComponent, /qrPayloadForTicketCode\(ticketCode\)/)
  assert.doesNotMatch(qrComponent, /email|phone|fullName|groupName|notes/)
})

test('Check-In QR scanner selects a guest but does not auto check in', async () => {
  const checkInPage = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const scanner = await readFile('src/components/checkin/QrScannerPanel.jsx', 'utf8')

  assert.match(checkInPage, /QrScannerPanel/)
  assert.match(scanner, /Manual ticket fallback/)
  assert.match(scanner, /Check-in still requires confirmation/)
  assert.doesNotMatch(scanner, /completeCheckIn|recordDuplicateCheckInAttempt|undoCheckIn/)
})
