import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildEventReview } from '../src/utils/eventReview.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

const baseEvent = {
  eventId: 'phase-22-event',
  eventName: 'CODEX_TEST Live Verification Event',
  eventDate: '2026-07-20',
  status: 'upcoming',
  capacity: 10,
  currency: 'BBD',
}

test('Phase 22 event review handles no selected event safely', () => {
  const review = buildEventReview(null, [], [])

  assert.equal(review.hasEvent, false)
  assert.equal(review.followUp.items.length, 0)
  assert.equal(review.paymentReview, null)
  assert.equal(review.summary, null)
})

test('Phase 22 follow-up flags missing contact, duplicate contacts, missing tickets, and open operations', () => {
  const review = buildEventReview(baseEvent, [
    {
      registrationId: 'reg-1',
      fullName: 'No Contact Guest',
      personsAttending: 1,
      paymentStatus: 'pending',
      ticketPrice: 100,
      amountDue: 100,
      amountPaid: 0,
      balanceDue: 100,
      ticketCode: null,
      checkedIn: false,
    },
    {
      registrationId: 'reg-2',
      fullName: 'Paid Missing Ticket',
      personsAttending: 2,
      paymentStatus: 'paid',
      ticketPrice: 100,
      amountDue: 200,
      amountPaid: 200,
      balanceDue: 0,
      email: 'shared@example.com',
      ticketCode: null,
      checkedIn: false,
    },
    {
      registrationId: 'reg-3',
      fullName: 'Shared Contact Guest',
      personsAttending: 1,
      paymentStatus: 'unknown',
      email: 'shared@example.com',
      ticketCode: 'GSV-003',
      checkedIn: false,
    },
  ], [
    { ledgerEntryId: 'op-1', entryType: 'income', status: 'expected', amount: 300, label: 'Sponsor pledge' },
  ])

  const keys = review.followUp.items.map((item) => item.key)

  assert.ok(keys.includes('missing-contact'))
  assert.ok(keys.includes('payment-review'))
  assert.ok(keys.includes('paid-missing-ticket'))
  assert.ok(keys.includes('other-missing-ticket'))
  assert.ok(keys.includes('duplicate-contacts'))
  assert.ok(keys.includes('open-operations'))
  assert.ok(keys.includes('checkin-not-started'))
})

test('Phase 22 follow-up identifies check-in in progress and complete states', () => {
  const inProgress = buildEventReview(baseEvent, [
    { registrationId: 'reg-1', fullName: 'Checked In Guest', personsAttending: 2, paymentStatus: 'paid', ticketPrice: 100, amountDue: 200, amountPaid: 200, balanceDue: 0, ticketCode: 'GSV-001', checkedIn: true },
    { registrationId: 'reg-2', fullName: 'Waiting Guest', personsAttending: 1, paymentStatus: 'paid', ticketPrice: 100, amountDue: 100, amountPaid: 100, balanceDue: 0, ticketCode: 'GSV-002', checkedIn: false },
  ], [])
  assert.ok(inProgress.followUp.items.some((item) => item.key === 'checkin-in-progress'))

  const complete = buildEventReview(baseEvent, [
    { registrationId: 'reg-1', fullName: 'Checked In Guest', personsAttending: 2, paymentStatus: 'paid', ticketPrice: 100, amountDue: 200, amountPaid: 200, balanceDue: 0, ticketCode: 'GSV-001', checkedIn: true },
  ], [])
  assert.ok(complete.followUp.items.some((item) => item.key === 'checkin-complete'))
})

test('Phase 22 follow-up flags completed event with unresolved issues', () => {
  const review = buildEventReview(
    { ...baseEvent, eventDate: '2026-06-01', status: 'completed' },
    [
      { registrationId: 'reg-1', fullName: 'Past Event Guest', personsAttending: 1, paymentStatus: 'pending', ticketCode: null, checkedIn: false },
    ],
    [],
    { asOf: new Date('2026-07-09T12:00:00Z') },
  )

  assert.equal(review.summary.title, 'Post-Event Summary')
  assert.ok(review.followUp.items.some((item) => item.key === 'post-event-unresolved'))
})

test('Phase 22 payment review preserves registration finance distinctions', () => {
  const review = buildEventReview(baseEvent, [
    {
      registrationId: 'reg-1',
      fullName: 'Paid Guest',
      personsAttending: 2,
      paymentStatus: 'paid',
      ticketPrice: 80,
      amountDue: 160,
      amountPaid: 160,
      balanceDue: 0,
      ticketCode: 'GSV-001',
      checkedIn: true,
    },
    {
      registrationId: 'reg-2',
      fullName: 'Door Guest',
      personsAttending: 1,
      paymentStatus: 'door-list',
      ticketPrice: 80,
      amountDue: 80,
      amountPaid: 0,
      balanceDue: 80,
      ticketCode: null,
      checkedIn: false,
    },
    {
      registrationId: 'reg-3',
      fullName: 'Unknown Guest',
      personsAttending: 1,
      paymentStatus: 'unknown',
      ticketCode: null,
      checkedIn: false,
    },
  ], [])

  assert.equal(review.paymentReview.registrationRecords.expectedIncome, 240)
  assert.equal(review.paymentReview.registrationRecords.collectedAmount, 160)
  assert.equal(review.paymentReview.registrationRecords.outstandingAmount, 80)
  assert.equal(review.paymentReview.registrationRecords.doorListCount, 1)
  assert.equal(review.paymentReview.registrationRecords.unknownCount, 1)
  assert.ok(review.paymentReview.explanation.includes('separate'))
  assert.ok(review.paymentReview.comparison.note.includes('not an accounting reconciliation'))
})

test('Phase 22 payment review does not silently derive missing registration price from event default', () => {
  const review = buildEventReview(
    { ...baseEvent, ticketPrice: 120 },
    [
      {
        registrationId: 'reg-1',
        fullName: 'Needs Pricing Review',
        personsAttending: 1,
        paymentStatus: 'paid',
        amountPaid: 120,
        ticketCode: 'GSV-001',
        checkedIn: false,
      },
    ],
    [],
  )

  assert.equal(review.paymentReview.registrationRecords.expectedIncome, 0)
  assert.equal(review.paymentReview.registrationRecords.pricingReviewCount, 1)
  assert.equal(review.paymentReview.registrationRecords.financeWarningCount, 0)
})

test('Phase 22 operations summary separates received and pending ledger values', () => {
  const review = buildEventReview(baseEvent, [], [
    { ledgerEntryId: 'income-received', entryType: 'income', status: 'received', amount: 500, label: 'Sponsor paid' },
    { ledgerEntryId: 'income-pending', entryType: 'income', status: 'expected', amount: 100, label: 'Sponsor pending' },
    { ledgerEntryId: 'expense-paid', entryType: 'expense', status: 'paid', amount: 150, label: 'Venue paid' },
    { ledgerEntryId: 'expense-pending', entryType: 'expense', status: 'pending', amount: 80, label: 'Decor pending' },
    { ledgerEntryId: 'refund-paid', entryType: 'refund', status: 'paid', amount: 20, label: 'Refund sent' },
    { ledgerEntryId: 'refund-pending', entryType: 'refund', status: 'pending', amount: 10, label: 'Refund pending' },
    { ledgerEntryId: 'adjustment', entryType: 'adjustment', status: 'paid', amount: 30, label: 'Float adjustment' },
    { ledgerEntryId: 'cancelled', entryType: 'expense', status: 'cancelled', amount: 999, label: 'Cancelled item' },
  ])

  assert.equal(review.paymentReview.operationsLedger.incomeReceived, 500)
  assert.equal(review.paymentReview.operationsLedger.incomePending, 100)
  assert.equal(review.paymentReview.operationsLedger.expensesPaid, 150)
  assert.equal(review.paymentReview.operationsLedger.expensesPending, 80)
  assert.equal(review.paymentReview.operationsLedger.refundsPaid, 20)
  assert.equal(review.paymentReview.operationsLedger.refundsPending, 10)
  assert.equal(review.paymentReview.operationsLedger.adjustments, 30)
  assert.equal(review.paymentReview.operationsLedger.cancelledItems, 1)
  assert.equal(review.paymentReview.operationsLedger.openItemCount, 3)
  assert.equal(review.paymentReview.operationsLedger.netPosition, 370)
})

test('Phase 22 event summary keeps registrations and guests distinct and uses personsAttending for attendance', () => {
  const review = buildEventReview(baseEvent, [
    { registrationId: 'reg-1', fullName: 'Group One', personsAttending: 3, paymentStatus: 'paid', ticketPrice: 60, amountDue: 180, amountPaid: 180, balanceDue: 0, ticketCode: 'GSV-001', checkedIn: true },
    { registrationId: 'reg-2', fullName: 'Group Two', personsAttending: 2, paymentStatus: 'complimentary', ticketPrice: 0, amountDue: 0, amountPaid: 0, balanceDue: 0, ticketCode: 'GSV-002', checkedIn: false },
  ], [])

  assert.equal(review.summary.registrationCount, 2)
  assert.equal(review.summary.guestCount, 5)
  assert.equal(review.summary.checkedInRegistrations, 1)
  assert.equal(review.summary.checkedInGuests, 3)
  assert.equal(review.summary.attendanceRate, 60)
  assert.equal(review.summary.capacityUsagePercent, 50)
  assert.ok(review.summary.attendanceNote.includes('personsAttending'))
})

test('Phase 22 event summary handles zero-data and invalid-capacity cases safely', () => {
  const noData = buildEventReview({ ...baseEvent, capacity: null }, [], [])
  assert.equal(noData.summary.registrationCount, 0)
  assert.equal(noData.summary.guestCount, 0)
  assert.equal(noData.summary.attendanceRate, 0)
  assert.equal(noData.summary.capacityUsagePercent, 0)
  assert.equal(noData.summary.capacity, 0)
})

test('Phase 22 current-event wording stays separate from post-event wording', () => {
  const currentReview = buildEventReview(baseEvent, [], [], { asOf: new Date('2026-07-09T12:00:00Z') })
  assert.equal(currentReview.summary.title, 'Current Event Summary')

  const postReview = buildEventReview({ ...baseEvent, eventDate: '2026-06-01', status: 'completed' }, [], [], { asOf: new Date('2026-07-09T12:00:00Z') })
  assert.equal(postReview.summary.title, 'Post-Event Summary')
})

test('Phase 22 route, guardrails, and read-only page structure are present without rules or dependency changes', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const dashboard = await readFile('src/pages/DashboardPage.jsx', 'utf8')
  const operations = await readFile('src/pages/OperationsPage.jsx', 'utf8')
  const page = await readFile('src/pages/EventReviewPage.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')
  const indexes = await readFile('firestore.indexes.json', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
  const packageLock = await readFile('package-lock.json', 'utf8')

  assert.match(app, /path="\/event-review"/)
  assert.match(dashboard, /to: '\/event-review'/)
  assert.match(operations, /to="\/event-review"/)
  assert.match(page, /read-only/i)
  assert.doesNotMatch(page, /createLedgerEntry|updateLedgerEntry|deleteRegistration|commitImport|submitAccessRequest|approveAccessRequest/)
  assert.doesNotMatch(page, /collection\(|doc\(|setDoc\(|updateDoc\(|addDoc\(/)
  assert.equal(qrPayloadForTicketCode('PH22-001'), 'GSV:TICKET:PH22-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
  assert.doesNotMatch(packageLock, /node_modules\/xlsx/)
  assert.match(rules, /match \/accessRequests\/\{requestId\}/)
  assert.match(indexes, /registrations/)
})
