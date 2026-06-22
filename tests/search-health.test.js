import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { buildAdminSearchResults } from '../src/utils/adminSearch.js'
import { buildRuntimeHealthItems } from '../src/utils/runtimeHealth.js'

test('admin search returns events without a Working Event and explains scoped search in UI', async () => {
  const results = buildAdminSearchResults({
    query: 'supper',
    events: [{ eventId: 'event-1', eventName: 'Summer Supper', location: 'Bridgetown' }],
    registrations: [{ registrationId: 'reg-1', fullName: 'Guest Supper', email: 'guest@example.com' }],
    activeEvent: null,
  })
  const component = await readFile('src/components/AdminSearch.jsx', 'utf8')

  assert.equal(results.length, 1)
  assert.equal(results[0].type, 'Event')
  assert.match(component, /Select a Working Event to search registrations, tickets, and check-in records/)
})

test('admin search includes registration, ticket, and check-in scoped to Working Event', () => {
  const results = buildAdminSearchResults({
    query: 'gsv',
    events: [],
    registrations: [{
      registrationId: 'reg-1',
      fullName: 'Ticket Guest',
      email: 'ticket@example.com',
      phone: '2465550000',
      ticketCode: 'GSV-ABC123',
      checkedIn: true,
    }],
    activeEvent: { eventId: 'event-1', eventName: 'CODEX_TEST Live Verification Event' },
  })

  assert.deepEqual(results.map((result) => result.type), ['Registration', 'Ticket', 'Check-In'])
  assert.ok(results.every((result) => ['/registrations', '/tickets', '/check-in'].includes(result.to)))
})

test('runtime health helpers hide allowlist contents while reporting approval', () => {
  const items = buildRuntimeHealthItems({
    firebaseConfigured: true,
    projectId: 'gathervibeshub',
    user: { email: 'jaylanspencer99@gmail.com' },
    allowlistApproved: true,
    eventsStatus: 'ok',
    registrationsStatus: 'warn',
    auditStatus: 'ok',
    serviceWorkerSafe: true,
    activeEvent: null,
    buildCommit: 'local-test',
  })

  assert.equal(items.find((item) => item.label === 'Firebase project').status, 'ok')
  assert.equal(items.find((item) => item.label === 'Current email approved').status, 'ok')
  assert.doesNotMatch(JSON.stringify(items), /approvedEmails/)
})

