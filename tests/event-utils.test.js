import test from 'node:test'
import assert from 'node:assert/strict'
import { toDateInput } from '../src/utils/dateUtils.js'
import { buildOrganizerOverview, financialPlanTotals } from '../src/utils/eventPlanning.js'
import { validateEvent } from '../src/utils/validators.js'

const validEvent = {
  eventName: 'Cake Picnic Barbados',
  eventDate: '2026-09-12',
  location: 'Bridgetown, Barbados',
  venueName: 'LESC',
  eventType: 'cake-picnic',
  status: 'planning',
  eventStartTime: '14:00',
  capacity: '150',
  ticketPrice: '75',
  ticketTypeCount: '1',
  notes: '',
}

test('event validation accepts complete event values', () => {
  assert.deepEqual(validateEvent(validEvent), {})
})

test('event validation rejects missing and invalid required values', () => {
  const errors = validateEvent({
    ...validEvent,
    eventName: ' ',
    eventDate: '',
    capacity: '2.5',
    ticketPrice: '-1',
  })

  assert.equal(errors.eventName, 'Event name is required.')
  assert.equal(errors.eventDate, 'Event date is required.')
  assert.match(errors.capacity, /whole number/)
  assert.match(errors.ticketPrice, /zero or greater/)
})

test('active-event dates remain stable when stored locally', () => {
  assert.equal(toDateInput('2026-09-12'), '2026-09-12')
  assert.equal(toDateInput(new Date('2026-09-12T12:00:00')), '2026-09-12')
})

test('financial plan totals exclude projected income from budget totals', () => {
  const totals = financialPlanTotals({
    projectedRegistrationIncome: 4500,
    venueBudget: 1200,
    supplierBudget: 800,
    entertainmentBudget: 500,
    marketingBudget: 300,
    staffingBudget: 400,
    contingencyBudget: 250,
    otherBudget: 150,
  })

  assert.equal(totals.projectedRegistrationIncome, 4500)
  assert.equal(totals.totalBudget, 3600)
})

test('organizer overview projects cash position from income minus budgeted expenses', () => {
  const overview = buildOrganizerOverview({
    eventName: 'QA Event',
    eventDate: '2026-11-14',
    location: 'Bridgetown',
    venueName: 'Organizer QA Pavilion',
    eventType: 'hospitality-event',
    status: 'planning',
    eventStartTime: '16:00',
    capacity: 60,
    ticketPrice: 75,
    financialPlan: {
      projectedRegistrationIncome: 4500,
      venueBudget: 1200,
      supplierBudget: 800,
      entertainmentBudget: 500,
      marketingBudget: 300,
      staffingBudget: 400,
      contingencyBudget: 250,
      otherBudget: 150,
    },
  })

  assert.equal(overview.budgets.totalBudget, 3600)
  assert.equal(overview.projectedCashPosition, 900)
})
