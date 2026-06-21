import test from 'node:test'
import assert from 'node:assert/strict'
import { toDateInput } from '../src/utils/dateUtils.js'
import { validateEvent } from '../src/utils/validators.js'

const validEvent = {
  eventName: 'Cake Picnic Barbados',
  eventDate: '2026-09-12',
  location: 'Bridgetown, Barbados',
  eventType: 'cake-picnic',
  status: 'upcoming',
  capacity: '150',
  ticketPrice: '75',
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
