import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPaymentsWorkspace,
  classifyRegistrationFinance,
  paymentFilterMatches,
} from '../src/utils/financeUtils.js'
import { filterCommunicationsRegistrations } from '../src/utils/communicationsUtils.js'

const event = {
  eventId: 'phase23q-event',
  eventName: 'Phase 23Q Finance Status Classification',
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

test('Phase 23Q paid records with complete finance fields stay resolved with no review state', () => {
  const finance = classifyRegistrationFinance({
    registrationId: 'paid-complete',
    fullName: 'QA_PHASE23Q_PaidComplete',
    personsAttending: 2,
    ticketPrice: 50,
    amountDue: 100,
    amountPaid: 100,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    paymentReference: 'QA23Q-FP-001',
  }, event)

  assert.equal(finance.statusGroup, 'paid')
  assert.equal(finance.isResolvedPaid, true)
  assert.equal(finance.paymentFollowUpRequired, false)
  assert.equal(finance.dataReviewRequired, false)
  assert.equal(finance.reviewLabel, null)
  assert.equal(finance.outstandingPayment, false)
  assert.equal(finance.displayBalanceDue, 0)
  assert.equal(finance.paymentReminderEligible, false)
})

test('Phase 23Q paid records with missing amounts stay paid, move to Data Review, and stay out of reminder audiences', () => {
  const ingridLike = {
    registrationId: 'paid-organizer-confirmed',
    fullName: 'QA_PHASE23Q_OrganizerConfirmed',
    personsAttending: 1,
    balanceDue: 0,
    paymentStatus: 'paid',
    paymentMethod: 'firstpay',
    paymentEvidenceClass: 'Payment Organizer Confirmed',
  }

  const finance = classifyRegistrationFinance(ingridLike, event)
  const workspace = buildPaymentsWorkspace([ingridLike], event)
  const [row] = workspace.rows

  assert.equal(finance.statusGroup, 'paid')
  assert.equal(finance.paymentFollowUpRequired, false)
  assert.equal(finance.dataReviewRequired, true)
  assert.equal(finance.reviewCategoryLabel, 'Internal Cleanup')
  assert.equal(finance.reviewLabel, 'Paid — Amount Not Recorded')
  assert.equal(finance.reviewMessage, 'Payment is confirmed, but the exact ticket amount was not recorded.')
  assert.equal(finance.outstandingPayment, false)
  assert.equal(finance.displayBalanceDue, 0)
  assert.equal(finance.paymentReminderEligible, false)
  assert.equal(finance.dataReviewInternalCleanup, true)
  assert.equal(finance.dataReviewProminent, true)

  assert.equal(row.paymentEvidenceClass, 'Payment Organizer Confirmed')
  assert.equal(row.displayStatus, 'Paid')
  assert.equal(row.reviewLabel, 'Paid — Amount Not Recorded')
  assert.equal(paymentFilterMatches(row, 'paid'), true)
  assert.equal(paymentFilterMatches(row, 'data-review'), true)
  assert.equal(paymentFilterMatches(row, 'payment-follow-up'), false)
  assert.equal(paymentFilterMatches(row, 'finance-review'), true)
  assert.equal(workspace.summary.paidRegistrations, 1)
  assert.equal(workspace.summary.outstandingBalance, 0)
  assert.equal(workspace.summary.paymentFollowUpCount, 0)
  assert.equal(workspace.summary.dataReviewCount, 1)
  assert.equal(workspace.summary.internalCleanupCount, 1)
  assert.equal(workspace.summary.actionRequiredCount, 0)
  assert.equal(workspace.summary.historicalLimitationCount, 0)

  assert.equal(filterCommunicationsRegistrations([ingridLike], communicationsFilters('payment-follow-up')).length, 0)
  assert.equal(filterCommunicationsRegistrations([ingridLike], communicationsFilters('outstanding')).length, 0)
  assert.equal(filterCommunicationsRegistrations([ingridLike], communicationsFilters('data-review')).length, 1)
  assert.equal(filterCommunicationsRegistrations([ingridLike], communicationsFilters('amount-paid-zero')).length, 1)
  assert.equal(filterCommunicationsRegistrations([ingridLike], communicationsFilters('paid-guests')).length, 1)
})

test('Phase 23Q complimentary and unresolved payment states split Data Review from patron payment follow-up', () => {
  const complimentary = classifyRegistrationFinance({
    registrationId: 'complimentary',
    fullName: 'QA_PHASE23Q_Complimentary',
    personsAttending: 1,
    ticketPrice: 0,
    amountDue: 0,
    amountPaid: 0,
    balanceDue: 0,
    paymentStatus: 'complimentary',
    paymentMethod: 'complimentary',
  }, event)
  const pending = classifyRegistrationFinance({
    registrationId: 'pending',
    fullName: 'QA_PHASE23Q_Pending',
    personsAttending: 2,
    ticketPrice: 75,
    amountDue: 150,
    amountPaid: 0,
    balanceDue: 150,
    paymentStatus: 'pending',
  }, event)
  const partial = classifyRegistrationFinance({
    registrationId: 'partial',
    fullName: 'QA_PHASE23Q_Partial',
    personsAttending: 1,
    ticketPrice: 100,
    amountDue: 100,
    amountPaid: 40,
    balanceDue: 60,
    paymentStatus: 'pending',
    paymentMethod: 'firstpay',
    paymentReference: 'QA23Q-PARTIAL',
  }, event)
  const doorList = classifyRegistrationFinance({
    registrationId: 'door-list',
    fullName: 'QA_PHASE23Q_DoorList',
    personsAttending: 1,
    ticketPrice: 110,
    amountDue: 110,
    amountPaid: 0,
    balanceDue: 110,
    paymentStatus: 'door-list',
    paymentMethod: 'door',
  }, event)
  const unknown = classifyRegistrationFinance({
    registrationId: 'unknown',
    fullName: 'QA_PHASE23Q_Unknown',
    personsAttending: 1,
    amountPaid: 0,
    paymentStatus: 'unknown',
  }, event)

  assert.equal(complimentary.statusGroup, 'complimentary')
  assert.equal(complimentary.paymentFollowUpRequired, false)
  assert.equal(complimentary.dataReviewRequired, false)

  assert.equal(pending.reviewLabel, 'Outstanding Payment')
  assert.equal(pending.outstandingPayment, true)
  assert.equal(pending.paymentFollowUpRequired, true)
  assert.equal(pending.dataReviewRequired, false)
  assert.equal(pending.paymentReminderEligible, true)

  assert.equal(partial.statusGroup, 'partial')
  assert.equal(partial.outstandingPayment, true)
  assert.equal(partial.paymentFollowUpRequired, true)
  assert.equal(partial.displayBalanceDue, 60)

  assert.equal(doorList.statusGroup, 'door-list')
  assert.equal(doorList.reviewLabel, 'Outstanding Payment')
  assert.equal(doorList.paymentFollowUpRequired, true)
  assert.equal(doorList.dataReviewRequired, false)

  assert.equal(unknown.statusGroup, 'unknown')
  assert.equal(unknown.outstandingPayment, false)
  assert.equal(unknown.paymentFollowUpRequired, true)
  assert.equal(unknown.dataReviewRequired, false)
  assert.equal(unknown.reviewLabel, 'Payment Follow-Up Required')
})

test('Phase 23Q workspace counts and filters keep collection work separate from internal data cleanup', () => {
  const rows = [
    { registrationId: 'paid-complete', fullName: 'QA_PHASE23Q_PaidComplete', personsAttending: 2, ticketPrice: 50, amountDue: 100, amountPaid: 100, balanceDue: 0, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentReference: 'QA23Q-FP-001' },
    { registrationId: 'paid-organizer-confirmed', fullName: 'QA_PHASE23Q_OrganizerConfirmed', personsAttending: 1, paymentStatus: 'paid', paymentMethod: 'firstpay', paymentEvidenceClass: 'Payment Organizer Confirmed', balanceDue: 0 },
    { registrationId: 'complimentary', fullName: 'QA_PHASE23Q_Complimentary', personsAttending: 1, ticketPrice: 0, amountDue: 0, amountPaid: 0, balanceDue: 0, paymentStatus: 'complimentary', paymentMethod: 'complimentary' },
    { registrationId: 'pending', fullName: 'QA_PHASE23Q_Pending', personsAttending: 2, ticketPrice: 75, amountDue: 150, amountPaid: 0, balanceDue: 150, paymentStatus: 'pending' },
    { registrationId: 'partial', fullName: 'QA_PHASE23Q_Partial', personsAttending: 1, ticketPrice: 100, amountDue: 100, amountPaid: 40, balanceDue: 60, paymentStatus: 'pending', paymentMethod: 'firstpay', paymentReference: 'QA23Q-PARTIAL' },
    { registrationId: 'door-list', fullName: 'QA_PHASE23Q_DoorList', personsAttending: 1, ticketPrice: 110, amountDue: 110, amountPaid: 0, balanceDue: 110, paymentStatus: 'door-list', paymentMethod: 'door' },
    { registrationId: 'unknown', fullName: 'QA_PHASE23Q_Unknown', personsAttending: 1, amountPaid: 0, paymentStatus: 'unknown' },
  ]

  const workspace = buildPaymentsWorkspace(rows, event)

  assert.equal(workspace.summary.registrationCount, 7)
  assert.equal(workspace.summary.paidRegistrations, 2)
  assert.equal(workspace.summary.outstandingRegistrations, 3)
  assert.equal(workspace.summary.paymentFollowUpCount, 4)
  assert.equal(workspace.summary.dataReviewCount, 1)
  assert.equal(workspace.filterCounts.paid, 2)
  assert.equal(workspace.filterCounts['payment-follow-up'], 4)
  assert.equal(workspace.filterCounts['needs-follow-up'], 4)
  assert.equal(workspace.filterCounts['data-review'], 1)
  assert.equal(workspace.filterCounts['internal-cleanup'], 1)
  assert.equal(workspace.filterCounts['finance-review'], 1)
})
