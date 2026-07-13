import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  listApprovedAccessEntries,
  resolveAccessRole,
  roleCapabilitySummary,
} from '../src/utils/accessRoles.js'
import {
  COMMUNICATION_SEGMENTS,
  COMMUNICATION_TEMPLATES,
  buildCommunicationMessages,
  buildCommunicationsCsvPacket,
  buildCommunicationsSegmentSummary,
  buildMessagePreview,
  buildRecipientList,
  filterCommunicationsRegistrations,
} from '../src/utils/communicationsUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const event = { eventName: 'CODEX_TEST Live Verification Event', eventDate: '2026-12-20T18:00:00.000Z', location: 'Test Venue', ticketPrice: 50 }

const registrations = [
  {
    registrationId: 'paid',
    fullName: 'Paid Guest',
    buyerName: 'Paid Buyer',
    attendeeNames: ['Paid Guest'],
    email: 'paid@example.com',
    phone: '2465550001',
    groupName: 'Group A',
    personsAttending: 1,
    paymentStatus: 'paid',
    paymentReference: '',
    ticketPrice: 50,
    amountPaid: 50,
    ticketCode: 'QA-001',
    checkedIn: true,
    notes: 'Preferred school: North School',
    sourceRowId: 'import-1',
  },
  {
    registrationId: 'balance',
    fullName: 'Balance Guest',
    buyerName: 'Balance Buyer',
    attendeeNames: ['Balance Guest', 'Second Guest'],
    email: '',
    phone: '2465550002',
    groupName: 'Group B',
    personsAttending: 2,
    paymentStatus: 'pending',
    ticketPrice: 50,
    amountPaid: 25,
    ticketCode: '',
    checkedIn: false,
  },
  {
    registrationId: 'door',
    fullName: 'Door Guest',
    buyerName: 'Door Buyer',
    attendeeNames: [],
    email: 'door@example.com',
    phone: '',
    groupName: '',
    personsAttending: 1,
    paymentStatus: 'door',
    ticketPrice: 50,
    amountPaid: 0,
    ticketCode: 'QA-003',
    checkedIn: false,
  },
]

test('Phase 10 role detection keeps approvedEmails backward compatible', () => {
  const accessControl = {
    approvedEmails: ['owner@example.com', 'admin@example.com', 'staff@example.com', 'viewer@example.com'],
    rolesByEmail: {
      'owner@example.com': 'owner',
      'staff@example.com': 'checkInStaff',
      'viewer@example.com': 'viewer',
    },
  }

  assert.equal(resolveAccessRole(accessControl, 'OWNER@EXAMPLE.COM'), 'owner')
  assert.equal(resolveAccessRole(accessControl, 'admin@example.com'), 'admin')
  assert.equal(resolveAccessRole(accessControl, 'staff@example.com'), 'checkInStaff')
  assert.equal(resolveAccessRole(accessControl, 'viewer@example.com'), 'viewer')
  assert.equal(resolveAccessRole(accessControl, 'random@example.com'), null)
  assert.equal(resolveAccessRole({ approvedEmails: ['legacy@example.com'] }, 'legacy@example.com'), 'admin')
  assert.equal(listApprovedAccessEntries(accessControl).length, 4)
  assert.match(roleCapabilitySummary('viewer'), /does not enforce scoped rules yet/)
})

test('Phase 10 UI displays roles without weakening Firestore rules', async () => {
  const auth = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(auth, /rolesByEmail|resolveAccessRole/)
  assert.match(settings, /Approved accounts and staff boundaries/)
  assert.match(settings, /Role editing is not exposed/)
  assert.match(shell, /currentRoleLabel/)
  assert.match(rules, /isApprovedAdmin/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
  assert.doesNotMatch(rules, /allow (read|write|create|update|delete|list|get): if request\.auth != null/)
})

test('Phase 11 communications templates and placeholders are copy-only and safe', () => {
  const labels = COMMUNICATION_TEMPLATES.map((template) => template.label)
  assert.ok(labels.includes('Payment Reminder'))
  assert.ok(labels.includes('Balance Due Reminder'))
  assert.ok(labels.includes('Door Payment Instructions'))
  assert.ok(labels.includes('Payment Received Confirmation'))
  assert.ok(labels.includes('Ticket / QR Reminder'))
  assert.ok(labels.includes('Missing Ticket Code Follow-up'))
  assert.ok(labels.includes('Post-event Follow-up'))

  const message = buildMessagePreview(
    'Hello {{buyerName}} for {{eventName}}. Pay {{balanceDue}} by {{paymentMethod}}. Code {{ticketCode}}. Ref {{paymentReference}}.',
    registrations[1],
    event,
  )

  assert.match(message, /Balance Buyer/)
  assert.match(message, /CODEX_TEST Live Verification Event/)
  assert.match(message, /BBD \$75\.00/)
  assert.match(message, /Unknown/)
  assert.match(message, /your ticket code/)
  assert.match(message, /your payment reference/)
})

test('Phase 11 segment counts, recipient list, and CSV packet are generated without sending', () => {
  const balanceRows = filterCommunicationsRegistrations(registrations, {
    paymentStatus: 'all',
    financeSegment: 'balance-due',
    checkInStatus: 'all',
    ticketStatus: 'all',
    contactSegment: 'all',
    groupName: '',
  })
  const missingTickets = filterCommunicationsRegistrations(registrations, {
    paymentStatus: 'all',
    financeSegment: 'all',
    checkInStatus: 'all',
    ticketStatus: 'not-assigned',
    contactSegment: 'all',
    groupName: '',
  })
  const schoolRows = filterCommunicationsRegistrations(registrations, {
    paymentStatus: 'all',
    financeSegment: 'all',
    checkInStatus: 'all',
    ticketStatus: 'all',
    contactSegment: 'school',
    groupName: '',
  })

  const summary = buildCommunicationsSegmentSummary(registrations, event)
  const messages = buildCommunicationMessages(registrations, COMMUNICATION_TEMPLATES[0].content, event)
  const recipients = buildRecipientList(registrations)
  const csv = buildCommunicationsCsvPacket(registrations, COMMUNICATION_TEMPLATES[0].content, event)

  assert.equal(balanceRows.length, 2)
  assert.equal(missingTickets.length, 1)
  assert.equal(schoolRows.length, 1)
  assert.equal(summary.totalRegistrations, 3)
  assert.equal(summary.totalPersons, 4)
  assert.equal(summary.missingEmailOrPhone, 2)
  assert.equal(summary.missingTicket, 1)
  assert.equal(summary.outstandingBalance, 2)
  assert.equal(messages.length, 3)
  assert.match(messages[1].warnings.join(' '), /Missing email/)
  assert.match(recipients, /paid@example\.com/)
  assert.match(csv, /Name,Buyer,Email,Phone,Ticket Code,Payment Status,Balance Due,Message/)
})

test('Phase 11 UI has packet builder and no sending or OAuth implementation', async () => {
  const page = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  const packageJson = await readFile('package.json', 'utf8')

  assert.match(page, /Recipients/)
  assert.match(page, /Template Library/)
  assert.match(page, /Copy & Use/)
  assert.match(page, /Missing email\/phone/)
  assert.match(page, /Copy One Message/)
  assert.match(page, /Copy All Messages/)
  assert.match(page, /Copy Recipient List/)
  assert.match(page, /Copy CSV Packet/)
  assert.doesNotMatch(page, /sendEmail|sendMessage|sendWhatsApp|sendOutlook|sendGmail/i)
  assert.doesNotMatch(packageJson, /gmail|googleapis|openai|@google-cloud\/storage|twilio/i)
  assert.equal(qrPayloadForTicketCode('QA-001'), 'GSV:TICKET:QA-001')
  assert.doesNotMatch(qrPayloadForTicketCode('QA-001'), /paid|balance|@|phone|guest/i)
})

test('System QA includes access and copy-only message checks', async () => {
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const helper = await readFile('src/utils/qaHelper.js', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')

  assert.match(qa, /Current user role detected/)
  assert.match(qa, /Communications templates available/)
  assert.match(qa, /No external message sending enabled/)
  assert.match(helper, /staff roles\/admin access|current user role/i)
  assert.match(helper, /Message Builder/)
  assert.match(health, /Message Builder safety/)
})
