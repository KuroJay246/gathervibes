import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  buildFinanceSummary,
  calculateRegistrationFinance,
  financeFilterMatches,
  financeWarnings,
  formatCurrency,
  getCurrencyCode,
  normalizeCurrency,
  normalizePaymentMethod,
} from '../src/utils/financeUtils.js'
import { buildInitialFieldMap, mapRows, parseCSV, processAndValidate } from '../src/utils/importUtils.js'
import { filterCommunicationsRegistrations, COMMUNICATION_TEMPLATES } from '../src/utils/communicationsUtils.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Phase 8.3 canonical domain and route health stay loop-safe', async () => {
  const auth = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')

  assert.match(auth, /FIREBASE_APP_HOST = 'gathervibeshub\.firebaseapp\.com'/)
  assert.match(auth, /WEB_APP_HOST = 'gathervibeshub\.web\.app'/)
  assert.match(auth, /window\.location\.replace/)
  assert.match(auth, /pathname\.startsWith\('\/__\/auth\/'\)/)
  assert.doesNotMatch(auth, /window\.location\.assign\(targetUrl\.toString\(\)\)/)
  assert.match(app, /path="\/security" element=\{<Navigate to="\/settings" replace/)
  assert.match(health, /https:\/\/gathervibeshub\.web\.app\/login/)
})

test('finance calculations use amounts, not paymentStatus alone', () => {
  const event = { ticketPrice: 50, currency: 'BBD' }
  const paid = calculateRegistrationFinance({ personsAttending: 2, paymentStatus: 'paid', ticketPrice: 50, amountPaid: 100 }, event)
  const pending = calculateRegistrationFinance({ personsAttending: 2, paymentStatus: 'paid', ticketPrice: 50, amountPaid: 25 }, event)
  const comp = calculateRegistrationFinance({ personsAttending: 2, paymentStatus: 'complimentary', ticketPrice: 0, amountPaid: '' }, event)

  assert.equal(paid.amountDue, 100)
  assert.equal(paid.balanceDue, 0)
  assert.equal(pending.balanceDue, 75)
  assert.ok(financeWarnings({ personsAttending: 2, paymentStatus: 'paid', ticketPrice: 50, amountPaid: 25 }, event).some((warning) => /outstanding/.test(warning)))
  assert.equal(calculateRegistrationFinance({ personsAttending: 2, paymentStatus: 'paid', amountPaid: 25 }, event).amountDue, null)
  assert.equal(comp.amountDue, 0)
  assert.equal(comp.amountPaid, 0)
  assert.equal(formatCurrency(100), 'BBD $100.00')
})

test('finance summary separates expected, collected, outstanding, door, and complimentary values', () => {
  const summary = buildFinanceSummary([
    { personsAttending: 2, ticketPrice: 50, amountPaid: 100, paymentStatus: 'paid' },
    { personsAttending: 1, ticketPrice: 40, amountPaid: 10, paymentStatus: 'pending' },
    { personsAttending: 1, ticketPrice: 30, amountPaid: 0, paymentStatus: 'door-list' },
    { personsAttending: 1, ticketPrice: 20, amountDue: 0, amountPaid: 0, paymentStatus: 'complimentary' },
  ])

  assert.equal(summary.totalExpected, 170)
  assert.equal(summary.totalCollected, 110)
  assert.equal(summary.totalOutstanding, 60)
  assert.equal(summary.doorTotal, 30)
  assert.equal(summary.doorListTotal, 30)
  assert.equal(summary.complimentaryValue, 20)
  assert.equal(summary.doorListRegistrations, 1)
})

test('finance currency helpers fall back safely for null clean-browser state', () => {
  assert.equal(normalizeCurrency(null), 'BBD')
  assert.equal(normalizeCurrency(undefined), 'BBD')
  assert.equal(normalizeCurrency(''), 'BBD')
  assert.equal(normalizeCurrency('usd'), 'USD')
  assert.equal(getCurrencyCode(null), 'BBD')
  assert.equal(getCurrencyCode({ currency: null }), 'BBD')
  assert.equal(formatCurrency(100, null), 'BBD $100.00')
})

test('finance summary does not crash when selected event or registrations are null', () => {
  const noEventSummary = buildFinanceSummary([
    { personsAttending: 2, ticketPrice: 50, amountPaid: 25, paymentStatus: 'pending' },
  ], null)
  const noRowsSummary = buildFinanceSummary(null, null)
  const missingCurrencySummary = buildFinanceSummary([], { eventName: 'No currency event' })

  assert.equal(noEventSummary.currency, 'BBD')
  assert.equal(noEventSummary.totalExpected, 100)
  assert.equal(noEventSummary.totalCollected, 25)
  assert.equal(noRowsSummary.currency, 'BBD')
  assert.equal(noRowsSummary.totalExpected, 0)
  assert.equal(missingCurrencySummary.currency, 'BBD')
})

test('Import Center maps finance fields and flags missing event price for review', async () => {
  const parsed = parseCSV('Full Name,Ticket Price,Amount Paid,Payment Method,Payment Reference,Persons Attending\nJane,50,25,FirstPay,FP-001,2\nDoor Guest,,0,door,,1')
  const fieldMap = buildInitialFieldMap(parsed.headers)
  const rows = mapRows(parsed.rows, parsed.headers, fieldMap, { importBatchId: 'finance', event: { ticketPrice: 50 } })
  const missingPriceRows = mapRows(parsed.rows, parsed.headers, fieldMap, { importBatchId: 'finance', event: {} })
  const processed = await processAndValidate(missingPriceRows, 'codex-test', [])

  assert.equal(fieldMap.ticketPrice, 1)
  assert.equal(fieldMap.amountPaid, 2)
  assert.equal(fieldMap.paymentMethod, 3)
  assert.equal(fieldMap.paymentReference, 4)
  assert.equal(rows[0].amountDue, 100)
  assert.equal(rows[0].amountPaid, 25)
  assert.equal(rows[0].balanceDue, 75)
  assert.equal(normalizePaymentMethod(rows[0].paymentMethod), 'firstpay')
  assert.equal(processed[1].status, 'needs-review')
  assert.ok(processed[1].issues.some((issue) => /Missing ticket price/.test(issue)))
})

test('finance filters, communications segments, and QR privacy are safe', () => {
  const registrations = [
    { id: 'paid', paymentStatus: 'paid', ticketPrice: 50, personsAttending: 1, amountPaid: 50, ticketCode: 'COD-001' },
    { id: 'balance', paymentStatus: 'pending', ticketPrice: 50, personsAttending: 2, amountPaid: 25, ticketCode: '' },
    { id: 'door', paymentStatus: 'door', ticketPrice: 30, personsAttending: 1, amountPaid: 0 },
  ]
  const filters = { paymentStatus: 'all', financeSegment: 'outstanding', checkInStatus: 'all', ticketStatus: 'all', groupName: '' }

  assert.equal(financeFilterMatches(registrations[1], 'Outstanding Balance'), true)
  assert.equal(filterCommunicationsRegistrations(registrations, filters, '').length, 2)
  assert.ok(COMMUNICATION_TEMPLATES.some((template) => template.id === 'balance-due-reminder'))
  assert.equal(qrPayloadForTicketCode('COD-001'), 'GSV:TICKET:COD-001')
  assert.doesNotMatch(qrPayloadForTicketCode('COD-001'), /50|paid|amount|@|guest/i)
})

test('Phase 9 UI and Firestore rules expose finance without broad access', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const registrations = await readFile('src/pages/RegistrationsPage.jsx', 'utf8')
  const tickets = await readFile('src/pages/TicketsPage.jsx', 'utf8')
  const checkIn = await readFile('src/pages/CheckInPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(dashboard, /Finance Snapshot/)
  assert.match(registrations, /Outstanding Balance/)
  assert.match(registrations, /bulkUpdateFinanceFields/)
  assert.match(tickets, /Balance/)
  assert.match(checkIn, /Door payment/)
  assert.match(qa, /Missing ticket price/)
  assert.match(rules, /validOptionalMoney/)
  assert.match(rules, /registration\.finance-update/)
  assert.doesNotMatch(rules, /allow read, write: if true/)
})

test('Dashboard documents missing selected event, default currency, and missing pricing fallbacks', async () => {
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')

  assert.match(dashboard, /BBD default/)
  assert.match(dashboard, /No selected Working Event/)
  assert.match(dashboard, /No pricing configured/)
  assert.match(dashboard, /buildFinanceSummary\(registrations, selectedFull\)/)
  assert.match(dashboard, /formatCurrency\(tier\.price, financeSummary\.currency\)/)
})
