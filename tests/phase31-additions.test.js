import { test } from 'node:test'
import assert from 'node:assert'

import {
  validateEvent,
  validatePriceTier,
  validatePriceTiers,
  VALID_TIER_NAMES,
  VALID_TIER_STATUSES,
  MAX_PRICE_TIERS,
} from '../src/utils/validators.js'

import {
  getCountdown,
  formatCountdown,
  upcomingEvents,
} from '../src/utils/dateUtils.js'

import { parseCSV } from '../src/utils/importUtils.js'

// ── Price tier validation ─────────────────────────────────────────────────────

test('VALID_TIER_NAMES includes all 7 expected names', () => {
  const expected = ['Early Bird', 'General', 'Door', 'Tier 1', 'Tier 2', 'Tier 3', 'Complimentary']
  expected.forEach((name) => {
    assert.ok(VALID_TIER_NAMES.includes(name), `Missing tier name: ${name}`)
  })
  assert.strictEqual(VALID_TIER_NAMES.length, 7)
})

test('VALID_TIER_STATUSES has active, sold-out, hidden', () => {
  assert.ok(VALID_TIER_STATUSES.includes('active'))
  assert.ok(VALID_TIER_STATUSES.includes('sold-out'))
  assert.ok(VALID_TIER_STATUSES.includes('hidden'))
})

test('validatePriceTier - valid tier passes', () => {
  const errs = validatePriceTier({ name: 'Early Bird', price: 50, status: 'active' }, 0)
  assert.deepStrictEqual(errs, {})
})

test('validatePriceTier - rejects missing name', () => {
  const errs = validatePriceTier({ name: '', price: 50, status: 'active' }, 0)
  assert.ok(errs.name)
})

test('validatePriceTier - rejects negative price', () => {
  const errs = validatePriceTier({ name: 'General', price: -1, status: 'active' }, 0)
  assert.ok(errs.price)
})

test('validatePriceTier - allows zero price (Complimentary)', () => {
  const errs = validatePriceTier({ name: 'Complimentary', price: 0, status: 'active' }, 0)
  assert.deepStrictEqual(errs, {})
})

test('validatePriceTier - rejects invalid status', () => {
  const errs = validatePriceTier({ name: 'General', price: 50, status: 'bogus' }, 0)
  assert.ok(errs.status)
})

test('validatePriceTiers - returns empty for empty array', () => {
  assert.deepStrictEqual(validatePriceTiers([]), {})
})

test('validatePriceTiers - returns empty for null', () => {
  assert.deepStrictEqual(validatePriceTiers(null), {})
})

test('validatePriceTiers - rejects more than MAX_PRICE_TIERS', () => {
  const tiers = Array.from({ length: MAX_PRICE_TIERS + 1 }, (_, i) => ({
    name: 'General', price: i * 10, status: 'active',
  }))
  const errs = validatePriceTiers(tiers)
  assert.ok(errs._array)
})

test('validatePriceTiers - collects errors per index', () => {
  const tiers = [
    { name: 'Early Bird', price: 20, status: 'active' }, // valid
    { name: '', price: -5, status: 'active' },            // invalid
  ]
  const errs = validatePriceTiers(tiers)
  assert.ok(!errs[0])
  assert.ok(errs[1]?.name)
  assert.ok(errs[1]?.price)
})

test('validateEvent - accepts event with no priceTiers', () => {
  const errs = validateEvent({
    eventName: 'Cake Picnic',
    eventDate: '2027-03-01',
    location: 'Bridgetown',
    eventType: 'cake-picnic',
    status: 'upcoming',
    capacity: '100',
    ticketPrice: '75',
    notes: '',
  })
  assert.deepStrictEqual(errs, {})
})

test('validateEvent - accepts event with valid priceTiers', () => {
  const errs = validateEvent({
    eventName: 'Cake Picnic',
    eventDate: '2027-03-01',
    location: 'Bridgetown',
    eventType: 'cake-picnic',
    status: 'upcoming',
    capacity: '100',
    ticketPrice: '0',
    notes: '',
    priceTiers: [
      { name: 'Early Bird', price: 50, status: 'active' },
      { name: 'General', price: 75, status: 'active' },
      { name: 'Complimentary', price: 0, status: 'active' },
    ],
  })
  assert.deepStrictEqual(errs, {})
})

test('validateEvent - rejects event with invalid priceTier', () => {
  const errs = validateEvent({
    eventName: 'Cake Picnic',
    eventDate: '2027-03-01',
    location: 'Bridgetown',
    eventType: 'cake-picnic',
    status: 'upcoming',
    capacity: '100',
    ticketPrice: '0',
    notes: '',
    priceTiers: [{ name: '', price: -1, status: 'active' }],
  })
  assert.ok(errs.priceTiers)
})

// ── Countdown utility ─────────────────────────────────────────────────────────

test('getCountdown - returns null for past date', () => {
  const past = new Date(Date.now() - 10000)
  assert.strictEqual(getCountdown(past), null)
})

test('getCountdown - returns null for invalid value', () => {
  assert.strictEqual(getCountdown(null), null)
  assert.strictEqual(getCountdown('not-a-date'), null)
})

test('getCountdown - returns positive values for future date', () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 48) // 48 hours
  const c = getCountdown(future)
  assert.ok(c !== null)
  assert.strictEqual(c.days, 2)
  assert.ok(c.total > 0)
})

test('formatCountdown - returns "Past" for past date', () => {
  const past = new Date(Date.now() - 1000)
  assert.strictEqual(formatCountdown(past), 'Past')
})

test('formatCountdown - returns days+hours string for far future', () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 25) // 25 hours
  const result = formatCountdown(future)
  assert.ok(result.includes('d') || result.includes('h'), `Unexpected result: ${result}`)
})

// ── Upcoming event sorting ────────────────────────────────────────────────────

test('upcomingEvents - returns empty for empty array', () => {
  assert.deepStrictEqual(upcomingEvents([]), [])
})

test('upcomingEvents - excludes past events', () => {
  const events = [
    { eventId: 'past', eventDate: new Date(Date.now() - 86400000), status: 'completed' },
    { eventId: 'future', eventDate: new Date(Date.now() + 86400000), status: 'upcoming' },
  ]
  const result = upcomingEvents(events)
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].eventId, 'future')
})

test('upcomingEvents - sorts by date ascending', () => {
  const events = [
    { eventId: 'b', eventDate: new Date(Date.now() + 200000000), status: 'upcoming' },
    { eventId: 'a', eventDate: new Date(Date.now() + 100000000), status: 'upcoming' },
  ]
  const result = upcomingEvents(events)
  assert.strictEqual(result[0].eventId, 'a')
  assert.strictEqual(result[1].eventId, 'b')
})

test('upcomingEvents - excludes cancelled events', () => {
  const events = [
    { eventId: 'cancelled', eventDate: new Date(Date.now() + 86400000), status: 'cancelled' },
    { eventId: 'active', eventDate: new Date(Date.now() + 86400000), status: 'active' },
  ]
  const result = upcomingEvents(events)
  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].eventId, 'active')
})

// ── Adaptive header detection (blank rows before header) ─────────────────────

test('parseCSV - skips blank rows before header row', () => {
  // Simulate CSV where first rows are blank
  const text = `\n\n\nName,Email,Phone\nJohn,john@test.com,555`
  const result = parseCSV(text)
  // After filtering blank rows, the first non-blank row becomes the header
  assert.deepStrictEqual(result.headers, ['Name', 'Email', 'Phone'])
  assert.strictEqual(result.rows.length, 1)
})

test('parseCSV - handles single blank line at top', () => {
  const text = `\nName,Email\nJane,jane@test.com`
  const result = parseCSV(text)
  assert.deepStrictEqual(result.headers, ['Name', 'Email'])
})

test('parseCSV - returns empty for all-blank input', () => {
  const result = parseCSV('\n\n\n   \n')
  assert.deepStrictEqual(result.headers, [])
  assert.deepStrictEqual(result.rows, [])
})

test('parseCSV - handles different header names for auto-detection', () => {
  // These would be detected by keyword matching in ImportsPage
  const text = `Full Name,Email Address,Mobile Number,Number of Guests,Registration Date\nJane Doe,jane@test.com,5550100,2,2025-01-15`
  const result = parseCSV(text)
  assert.deepStrictEqual(result.headers, ['Full Name', 'Email Address', 'Mobile Number', 'Number of Guests', 'Registration Date'])
  assert.strictEqual(result.rows.length, 1)
})
