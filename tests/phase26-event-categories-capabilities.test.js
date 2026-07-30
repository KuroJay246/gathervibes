import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  EVENT_CAPABILITY_OPTIONS,
  EVENT_TYPE_OPTIONS,
  defaultEventCapabilitiesForType,
  eventTypeLabel,
  hydrateEventForPlanning,
  normalizeEventCapabilities,
} from '../src/utils/eventPlanning.js'
import { validateEvent } from '../src/utils/validators.js'

const REQUIRED_TYPES = [
  'birthday',
  'bridal-shower',
  'wedding',
  'workshop',
  'cake-tasting-food-showcase',
  'cultural-experience',
  'corporate-event',
  'hospitality-event',
  'party',
  'private-event',
  'other',
]

const REQUIRED_CAPABILITIES = [
  'publicRegistration',
  'ticketing',
  'checkIn',
  'seating',
  'suppliers',
  'vendors',
  'sponsors',
  'bakers',
  'tastingZones',
  'allergens',
  'schoolsYouth',
  'speakers',
  'sessions',
  'certificates',
  'bridalParty',
  'accommodation',
  'transport',
]

function validEvent(overrides = {}) {
  return {
    eventName: 'Universal Event',
    eventDate: '2026-09-01',
    venueName: 'Event Hall',
    location: 'Bridgetown',
    eventType: 'birthday',
    status: 'planning',
    eventStartTime: '10:00',
    capacity: '50',
    ticketTypeCount: '1',
    ticketPrice: '0',
    registrationRequired: true,
    financialPlan: {},
    operationsPlan: {},
    priceTiers: [],
    ...overrides,
  }
}

test('event categories include universal event types and preserve legacy values', () => {
  const values = EVENT_TYPE_OPTIONS.map((option) => option.value)
  for (const type of REQUIRED_TYPES) assert.ok(values.includes(type), type)
  for (const legacy of ['cake-picnic', 'cake-tasting', 'brunch', 'tasting', 'food-event', 'vendor-pop-up', 'private-food-experience']) {
    assert.ok(values.includes(legacy), legacy)
    assert.notEqual(eventTypeLabel(legacy), 'Other')
  }
})

test('event capabilities support category defaults and organizer overrides', () => {
  const capabilityKeys = EVENT_CAPABILITY_OPTIONS.map((option) => option.key)
  assert.deepEqual(capabilityKeys, REQUIRED_CAPABILITIES)

  const weddingDefaults = defaultEventCapabilitiesForType('wedding')
  assert.equal(weddingDefaults.seating, true)
  assert.equal(weddingDefaults.bridalParty, true)
  assert.equal(weddingDefaults.ticketing, true)

  const workshopDefaults = defaultEventCapabilitiesForType('workshop')
  assert.equal(workshopDefaults.sessions, true)
  assert.equal(workshopDefaults.certificates, true)

  const overridden = normalizeEventCapabilities({ seating: false, ticketing: false }, 'wedding')
  assert.equal(overridden.seating, false)
  assert.equal(overridden.ticketing, false)
  assert.equal(overridden.bridalParty, true)
})

test('old events without capability data continue working', () => {
  const hydrated = hydrateEventForPlanning({
    eventName: 'Legacy CPB',
    eventType: 'cake-picnic',
    eventDate: '2026-07-01',
    status: 'completed',
  })

  assert.equal(hydrated.eventType, 'cake-picnic')
  assert.equal(hydrated.eventCapabilities.bakers, true)
  assert.equal(hydrated.eventCapabilities.tastingZones, true)
  assert.equal(hydrated.eventCapabilities.checkIn, true)
})

test('event validation accepts each category and rejects unsafe capability shape', () => {
  for (const eventType of REQUIRED_TYPES) {
    assert.deepEqual(validateEvent(validEvent({ eventType })), {}, eventType)
  }

  assert.deepEqual(validateEvent(validEvent({ eventCapabilities: { seating: true } })), {})
  assert.ok(validateEvent(validEvent({ eventCapabilities: { seating: 'yes' } })).eventCapabilities.seating)
  assert.ok(validateEvent(validEvent({ eventCapabilities: { unknownThing: true } })).eventCapabilities.unknownThing)
})

test('event save path persists capabilities without changing routes or rules', async () => {
  const service = await readFile('src/services/eventService.js', 'utf8')
  const modal = await readFile('src/components/events/EventFormModal.jsx', 'utf8')
  const app = await readFile('src/App.jsx', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(service, /eventCapabilities: event\.eventCapabilities/)
  assert.match(modal, /EVENT_CAPABILITY_OPTIONS\.map/)
  assert.match(modal, /Turning a capability off only hides optional planning prompts/)
  assert.doesNotMatch(app, /capabilities/)
  assert.match(rules, /function validEventCapabilities/)
  assert.match(rules, /'eventCapabilities'/)
})
