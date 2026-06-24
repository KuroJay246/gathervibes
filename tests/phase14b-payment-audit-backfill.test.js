import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  CPB_AUDIT_APPROVAL_TEXT,
  assertApplyApproval,
  generateAuditMatches,
  mapAuditPaymentMethod,
  mapAuditPaymentStatus,
  safeEvidenceSummary,
  workbookHeadersRecognized,
} from '../src/services/cpbAuditBackfill.js'
import { calculateRegistrationFinance } from '../src/utils/financeUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const headers = [
  'Source Register',
  'Ticket/Door ID',
  'Guest Name',
  'Buyer/Contact',
  'Email/Phone',
  'Price Tier',
  'Unit Price',
  'Amount Paid Confirmed',
  'Expected Total',
  'Balance/Due',
  'Payment Status',
  'Evidence Summary',
  'Evidence Date',
  'Gmail Link',
  'Confidence',
  'Notes',
]

function row(values) {
  return {
    data: headers.map((header) => values[header] ?? ''),
  }
}

const sheet = {
  headers,
  rows: [
    row({
      'Ticket/Door ID': 'CPB-001',
      'Guest Name': 'Exact Ticket Guest',
      'Buyer/Contact': 'Buyer One',
      'Email/Phone': 'buyer@example.com / 2465550101',
      'Price Tier': 'Early Bird',
      'Unit Price': '$85',
      'Amount Paid Confirmed': '$85',
      'Expected Total': '$85',
      'Balance/Due': '$0',
      'Payment Status': 'Paid – Confirmed',
      'Evidence Summary': 'Confirmed by safe receipt summary https://mail.google.com/mail/#x',
      'Gmail Link': 'https://mail.google.com/mail/#x',
      Confidence: 'High',
    }),
    row({
      'Ticket/Door ID': 'CPB-002',
      'Guest Name': 'Exact Name Guest',
      'Buyer/Contact': 'Buyer Two',
      'Email/Phone': 'name@example.com',
      'Price Tier': 'General',
      'Unit Price': '$100',
      'Amount Paid Confirmed': '$100',
      'Expected Total': '$100',
      'Balance/Due': '$0',
      'Payment Status': 'Paid – Confirmed',
      'Evidence Summary': 'Confirmed payment',
      Confidence: 'High',
    }),
    row({
      'Guest Name': 'Buyer Guest',
      'Buyer/Contact': 'Group Buyer',
      'Email/Phone': '',
      'Price Tier': 'General',
      'Unit Price': '$100',
      'Amount Paid Confirmed': '$100',
      'Expected Total': '$100',
      'Payment Status': 'Paid – Confirmed',
      'Evidence Summary': 'Buyer paid',
      Confidence: 'High',
    }),
    row({
      'Guest Name': 'Contact Match Guest',
      'Buyer/Contact': 'Contact Buyer',
      'Email/Phone': 'contact@example.com 2465550199',
      'Price Tier': 'Door/Late',
      'Unit Price': '$110',
      'Amount Paid Confirmed': '$110',
      'Expected Total': '$110',
      'Payment Status': 'Paid – Confirmed',
      'Evidence Summary': 'Door late proof',
      Confidence: 'High',
    }),
    row({
      'Guest Name': 'Fuzzy Guest Jr',
      'Buyer/Contact': '',
      'Price Tier': 'General',
      'Unit Price': '$100',
      'Amount Paid Confirmed': '$100',
      'Expected Total': '$100',
      'Payment Status': 'Paid – Confirmed',
      'Evidence Summary': 'Fuzzy test',
      Confidence: 'High',
    }),
    row({
      'Guest Name': 'Christina Morris – Ticket 1',
      'Buyer/Contact': 'Christina Morris',
      'Price Tier': 'Early Bird',
      'Unit Price': '$85',
      'Amount Paid Confirmed': '$85',
      'Expected Total': '$85',
      'Payment Status': 'Paid – Confirmed',
      Confidence: 'High',
    }),
    row({
      'Ticket/Door ID': 'EMAIL-DOOR-001',
      'Guest Name': 'Guest 3 of Gabriela Cumberbatch',
      'Buyer/Contact': 'Gabriela Cumberbatch',
      'Price Tier': 'Door/Late',
      'Unit Price': '$110',
      'Amount Paid Confirmed': '$110',
      'Expected Total': '$110',
      'Payment Status': 'Paid – Confirmed / Register Mismatch',
      'Evidence Summary': 'Gabriela paid for 3 tickets; missing third guest.',
      Confidence: 'High',
    }),
    row({
      'Guest Name': 'Roger Walcott',
      'Buyer/Contact': 'Roger Walcott',
      'Price Tier': 'General',
      'Unit Price': '$100',
      'Expected Total': '$100',
      'Payment Status': 'No Gmail proof found',
      Confidence: 'Medium',
    }),
  ],
}

const registrations = [
  { registrationId: 'ticket', fullName: 'Different Name', ticketCode: 'CPB-001', email: 'buyer@example.com', phone: '2465550101', paymentStatus: 'pending' },
  { registrationId: 'name', fullName: 'Exact Name Guest', ticketCode: '', email: 'name@example.com', paymentStatus: 'pending' },
  { registrationId: 'buyer', fullName: 'Group Buyer registration', buyerName: 'Group Buyer', attendeeNames: ['Buyer Guest'], paymentStatus: 'pending' },
  { registrationId: 'contact', fullName: 'Someone Else', email: 'contact@example.com', phone: '2465550199', paymentStatus: 'pending' },
  { registrationId: 'fuzzy', fullName: 'Fuzzy Guest', paymentStatus: 'pending' },
]

test('CPB payment audit workbook headers are recognized', () => {
  assert.equal(workbookHeadersRecognized(headers), true)
})

test('CPB audit dry-run matches rows, flags review, and writes nothing', () => {
  const result = generateAuditMatches(sheet, registrations)

  assert.equal(result.writesPerformed, false)
  assert.ok(result.matches.some((item) => item.matchType === 'Exact ticket match'))
  assert.ok(result.matches.some((item) => item.matchType === 'Exact name match'))
  assert.ok(result.matches.some((item) => item.matchType === 'Buyer/guest match'))
  assert.ok(result.matches.some((item) => item.matchType === 'Contact match'))
  assert.ok(result.reviewNeeded.some((item) => item.auditData.guestName === 'Fuzzy Guest Jr'))
  assert.ok(result.createCandidates.some((item) => /Christina Morris/.test(item.auditData.guestName)))
  assert.ok(result.createCandidates.some((item) => /Gabriela/.test(item.auditData.guestName)))
  assert.ok(result.reviewNeeded.some((item) => /Roger Walcott/.test(item.auditData.guestName)))
  assert.ok(result.reviewNeeded.some((item) => item.confidence === 'medium'))
})

test('CPB audit finance mapping is explicit and privacy-safe', () => {
  const result = generateAuditMatches(sheet, registrations)
  const ticket = result.matches.find((item) => item.auditData.ticketDoorId === 'CPB-001')
  const door = result.matches.find((item) => item.auditData.guestName === 'Contact Match Guest')

  assert.equal(ticket.proposedUpdates.priceTier, 'Early Bird')
  assert.equal(ticket.proposedUpdates.ticketPrice, 85)
  assert.equal(ticket.proposedUpdates.amountDue, 85)
  assert.equal(ticket.proposedUpdates.amountPaid, 85)
  assert.equal(ticket.proposedUpdates.balanceDue, 0)
  assert.equal(ticket.proposedUpdates.paymentMethod, 'unknown')
  assert.equal(ticket.proposedUpdates.paymentReference, 'PAYMENT-AUDIT:CPB-001')
  assert.doesNotMatch(JSON.stringify(ticket.proposedUpdates), /mail\.google|https?:\/\//i)
  assert.equal(door.proposedUpdates.paymentStatus, 'door')
  assert.equal(door.proposedUpdates.paymentMethod, 'door')
})

test('CPB apply requires exact organizer approval text', () => {
  assert.throws(() => assertApplyApproval('APPROVE'), /requires exact confirmation/)
  assert.equal(assertApplyApproval(CPB_AUDIT_APPROVAL_TEXT), true)
})

test('CPB payment mapping does not invent methods or store Gmail links', () => {
  assert.equal(mapAuditPaymentStatus('Paid – Confirmed (Price Inferred)'), 'paid')
  assert.equal(mapAuditPaymentStatus('General Partial / Balance Due'), 'pending')
  assert.equal(mapAuditPaymentStatus('To Pay at Door'), 'door-list')
  assert.equal(mapAuditPaymentStatus('No Gmail proof found'), 'unknown')
  assert.equal(mapAuditPaymentMethod('Paid – Confirmed'), 'unknown')
  assert.equal(mapAuditPaymentMethod('To Pay at Door'), 'door')
  assert.doesNotMatch(safeEvidenceSummary('Proof https://mail.google.com/mail/#all/abc user@gmail.com'), /mail\.google|user@gmail/i)
})

test('base ticket price does not silently calculate missing amount due', () => {
  const finance = calculateRegistrationFinance({ personsAttending: 3, paymentStatus: 'pending' }, { ticketPrice: 100 })
  assert.equal(finance.ticketPrice, null)
  assert.equal(finance.amountDue, null)
  assert.equal(finance.needsFinanceReview, true)
})

test('Phase 14B UI and rules expose required safe surfaces', async () => {
  const importsPage = await readFile('src/pages/ImportsPage.jsx', 'utf8')
  const registrationsPage = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const ticketsPage = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const checkInPage = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const templatesPanel = await readFile('src/components/imports/ImportTemplatesPanel.jsx', 'utf8')
  const operationsPage = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const operationsService = await readFile('src/services/operationsLedgerService.js', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(importsPage, /CPB Payment Audit Backfill|Dry-run first|Gmail links are not stored/)
  assert.match(registrationsPage, /Finance Warning|Showing all registrations|Group of/)
  assert.match(ticketsPage, /Advanced Filters|Pending|Review Needed/)
  assert.match(checkInPage, /Check in selected|Undo check-in selected|Copy selected door list|Group registrations|registrations \/ .* persons/)
  assert.match(checkInPage, /window\.confirm/)
  assert.doesNotMatch(checkInPage, /bulkDelete/)
  assert.match(templatesPanel, /What to leave blank|What not to put|CPB Payment Audit Backfill/)
  assert.match(operationsPage, /Event Operations \/ Money Tracker|Unknown \/ Not recorded|Short description \/ title|This tracker is separate from ticket sales/)
  assert.doesNotMatch(operationsService, /orderBy\('date'/)
  assert.match(operationsService, /where\('eventId', '==', eventId\)/)
  assert.match(importsPage, /Cole also has the actual spreadsheet/)
  assert.match(await readFile('src/components/imports/PaymentAuditBackfillPanel.jsx', 'utf8'), /Dry-run row review|All confidence levels|Cole for independent review/)
  assert.match(app, /path="\/operations"/)
  assert.match(rules, /match \/operationsLedger/)
  assert.match(rules, /operation\.create|operation\.update|operation\.cancel/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
})

test('QR payload remains ticket-code only', () => {
  assert.equal(qrPayloadForTicketCode('CPB-001'), 'GSV:TICKET:CPB-001')
  assert.doesNotMatch(qrPayloadForTicketCode('CPB-001'), /guest|paid|amount|@|phone/i)
})
