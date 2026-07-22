import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPaymentsWorkspace,
  classifyRegistrationFinance,
  paymentFilterMatches,
} from '../src/utils/financeUtils.js'
import { filterCommunicationsRegistrations } from '../src/utils/communicationsUtils.js'

const completedEvent = {
  eventId: 'phase23r-cpb',
  eventName: 'CPB',
  status: 'completed',
  eventDate: '2026-06-29',
  currency: 'BBD',
}

const activeEvent = {
  eventId: 'phase23r-active',
  eventName: 'Upcoming Event',
  status: 'active',
  eventDate: '2026-07-30',
  currency: 'BBD',
}

function communicationsFilters(financeSegment) {
  return {
    paymentStatus: 'all',
    financeSegment,
    checkInStatus: 'all',
    ticketStatus: 'all',
    contactSegment: 'all',
    groupName: '',
  }
}

test('Phase 23R organizer-confirmed payment stays Paid and visible as internal cleanup only', () => {
  const row = {
    registrationId: 'ingrid',
    fullName: 'Ingrid Gall',
    personsAttending: 1,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    paymentEvidenceClass: 'Payment Organizer Confirmed',
    balanceDue: 0,
  }

  const finance = classifyRegistrationFinance(row, completedEvent)

  assert.equal(finance.statusGroup, 'paid')
  assert.equal(finance.paymentFollowUpRequired, false)
  assert.equal(finance.dataReviewRequired, true)
  assert.equal(finance.dataReviewInternalCleanup, true)
  assert.equal(finance.dataReviewProminent, true)
  assert.equal(finance.reviewLabel, 'Paid — Amount Not Recorded')
})

test('Phase 23R missing optional payment reference alone becomes historical, not urgent', () => {
  const workspace = buildPaymentsWorkspace([{
    registrationId: 'historical-ref',
    fullName: 'Historical Ref Guest',
    personsAttending: 1,
    ticketPrice: 110,
    amountDue: 110,
    amountPaid: 110,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    source: 'csv-import',
    sourceRowId: 'Legacy Import:sheet-1:row-7',
  }], completedEvent)
  const [row] = workspace.rows

  assert.equal(row.dataReviewRequired, true)
  assert.equal(row.dataReviewProminent, false)
  assert.equal(row.dataReviewHistoricalLimitation, true)
  assert.equal(row.reviewLabel, 'Missing Payment Reference')
  assert.equal(workspace.summary.historicalLimitationCount, 1)
  assert.equal(workspace.summary.paymentFollowUpCount, 0)
  assert.equal(paymentFilterMatches(row, 'historical-limitation'), true)
  assert.equal(paymentFilterMatches(row, 'missing-reference'), true)
})

test('Phase 23R group guests covered by a payer do not require individual payment metadata', () => {
  const workspace = buildPaymentsWorkspace([
    {
      registrationId: 'payer',
      fullName: 'Group Buyer',
      buyerName: 'Group Buyer',
      personsAttending: 2,
      ticketPrice: 110,
      amountDue: 220,
      amountPaid: 220,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentReference: 'GROUP-001',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-1:row-1',
    },
    {
      registrationId: 'guest',
      fullName: 'Covered Guest',
      buyerName: 'Group Buyer',
      personsAttending: 1,
      amountDue: 0,
      amountPaid: 0,
      balanceDue: 0,
      paymentStatus: 'paid',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-1:row-2',
    },
  ], completedEvent)
  const byId = Object.fromEntries(workspace.rows.map((row) => [row.registrationId, row]))

  assert.equal(byId.guest.dataReviewRequired, false)
  assert.equal(byId.guest.paymentFollowUpRequired, false)
  assert.equal(workspace.summary.dataReviewCount, 0)
})

test('Phase 23R active missing payment method remains internal cleanup before an event is historical', () => {
  const finance = classifyRegistrationFinance({
    registrationId: 'active-missing-method',
    fullName: 'Active Missing Method',
    personsAttending: 1,
    ticketPrice: 85,
    amountDue: 85,
    amountPaid: 85,
    balanceDue: 0,
    paymentStatus: 'paid',
  }, activeEvent)

  assert.equal(finance.dataReviewRequired, true)
  assert.equal(finance.dataReviewInternalCleanup, true)
  assert.equal(finance.dataReviewProminent, true)
  assert.equal(finance.reviewLabel, 'Missing Payment Method')
})

test('Phase 23R amount mismatches remain action required', () => {
  const finance = classifyRegistrationFinance({
    registrationId: 'mismatch',
    fullName: 'Mismatch Guest',
    personsAttending: 1,
    ticketPrice: 100,
    amountDue: 100,
    amountPaid: 130,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    paymentReference: 'MISMATCH-001',
  }, activeEvent)

  assert.equal(finance.dataReviewRequired, true)
  assert.equal(finance.dataReviewActionRequired, true)
  assert.equal(finance.reviewLabel, 'Amount Mismatch')
})

test('Phase 23R duplicate references remain action required', () => {
  const workspace = buildPaymentsWorkspace([
    {
      registrationId: 'dup-a',
      fullName: 'Duplicate A',
      personsAttending: 1,
      ticketPrice: 100,
      amountDue: 100,
      amountPaid: 100,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentReference: 'DUP-001',
    },
    {
      registrationId: 'dup-b',
      fullName: 'Duplicate B',
      personsAttending: 1,
      ticketPrice: 100,
      amountDue: 100,
      amountPaid: 100,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentReference: 'DUP-001',
    },
  ], activeEvent)

  assert.equal(workspace.summary.actionRequiredCount, 2)
  assert.equal(workspace.filterCounts['possible-duplicate'], 2)
  assert.equal(workspace.rows.every((row) => row.dataReviewActionRequired), true)
})

test('Phase 23R paid amount not recorded remains visible but never enters collection follow-up', () => {
  const workspace = buildPaymentsWorkspace([{
    registrationId: 'no-amount',
    fullName: 'No Amount Guest',
    personsAttending: 1,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    balanceDue: 0,
    paymentEvidenceClass: 'Payment Organizer Confirmed',
  }], completedEvent)
  const [row] = workspace.rows

  assert.equal(row.dataReviewCategoryKeys.includes('paid-amount-not-recorded'), true)
  assert.equal(row.paymentFollowUpRequired, false)
  assert.equal(row.paymentReminderEligible, false)
  assert.equal(workspace.summary.paidAmountNotRecordedCount, 1)
})

test('Phase 23R resolved CPB-style review rows keep outstanding and payment follow-up at zero', () => {
  const workspace = buildPaymentsWorkspace([
    {
      registrationId: 'historical-method',
      fullName: 'Historical Method Guest',
      personsAttending: 1,
      ticketPrice: 85,
      amountDue: 85,
      amountPaid: 85,
      balanceDue: 0,
      paymentStatus: 'paid',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-1:row-12',
    },
    {
      registrationId: 'historical-reference',
      fullName: 'Historical Reference Guest',
      personsAttending: 1,
      ticketPrice: 110,
      amountDue: 110,
      amountPaid: 110,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-2:row-8',
    },
    {
      registrationId: 'ingrid',
      fullName: 'Ingrid Gall',
      personsAttending: 1,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentEvidenceClass: 'Payment Organizer Confirmed',
      balanceDue: 0,
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-2:row-12',
    },
  ], completedEvent)

  assert.equal(workspace.summary.outstandingBalance, 0)
  assert.equal(workspace.summary.paymentFollowUpCount, 0)
  assert.equal(workspace.summary.actionRequiredCount, 0)
  assert.equal(workspace.summary.internalCleanupCount, 1)
  assert.equal(workspace.summary.historicalLimitationCount, 2)
})

test('Phase 23R reminder audiences exclude resolved historical data-review rows', () => {
  const rows = [
    {
      registrationId: 'historical-ref',
      fullName: 'Historical Ref Guest',
      personsAttending: 1,
      ticketPrice: 110,
      amountDue: 110,
      amountPaid: 110,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-1:row-7',
    },
    {
      registrationId: 'ingrid',
      fullName: 'Ingrid Gall',
      personsAttending: 1,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentEvidenceClass: 'Payment Organizer Confirmed',
      balanceDue: 0,
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-2:row-12',
    },
  ]

  assert.equal(filterCommunicationsRegistrations(rows, communicationsFilters('payment-follow-up'), '', completedEvent).length, 0)
  assert.deepEqual(
    filterCommunicationsRegistrations(rows, communicationsFilters('data-review'), '', completedEvent).map((row) => row.registrationId),
    ['ingrid'],
  )
  assert.deepEqual(
    filterCommunicationsRegistrations(rows, communicationsFilters('missing-payment-reference'), '', completedEvent).map((row) => row.registrationId),
    ['ingrid'],
  )
})

test('Phase 23R data-review category counts reconcile to their named records', () => {
  const workspace = buildPaymentsWorkspace([
    {
      registrationId: 'historical-method',
      fullName: 'Historical Method Guest',
      personsAttending: 1,
      ticketPrice: 85,
      amountDue: 85,
      amountPaid: 85,
      balanceDue: 0,
      paymentStatus: 'paid',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-1:row-12',
    },
    {
      registrationId: 'historical-reference',
      fullName: 'Historical Reference Guest',
      personsAttending: 1,
      ticketPrice: 110,
      amountDue: 110,
      amountPaid: 110,
      balanceDue: 0,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-2:row-8',
    },
    {
      registrationId: 'ingrid',
      fullName: 'Ingrid Gall',
      personsAttending: 1,
      paymentStatus: 'paid',
      paymentMethod: 'firstpay',
      paymentEvidenceClass: 'Payment Organizer Confirmed',
      balanceDue: 0,
      source: 'csv-import',
      sourceRowId: 'Legacy Import:sheet-2:row-12',
    },
  ], completedEvent)

  assert.equal(workspace.summary.dataReviewCount, 3)
  assert.equal(workspace.summary.internalCleanupCount, 1)
  assert.equal(workspace.summary.historicalLimitationCount, 2)
  assert.equal(workspace.filterCounts['missing-method'], 1)
  assert.equal(workspace.filterCounts['missing-reference'], 2)
  assert.equal(workspace.filterCounts['paid-amount-not-recorded'], 1)
  assert.equal(workspace.rows.filter((row) => row.dataReviewCategoryKeys.includes('missing-payment-method')).length, 1)
  assert.equal(workspace.rows.filter((row) => row.dataReviewCategoryKeys.includes('missing-payment-reference')).length, 2)
  assert.equal(workspace.rows.filter((row) => row.dataReviewCategoryKeys.includes('paid-amount-not-recorded')).length, 1)
})
