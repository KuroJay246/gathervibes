import { test } from 'node:test'
import assert from 'node:assert'
import {
  parseCSV,
  normalizePaymentStatus,
  normalizeEmail,
  validateRow,
  generateStableId,
  findDuplicate,
  mapRows,
} from '../src/utils/importUtils.js'
import { validateRegistration, validTicketStatuses } from '../src/utils/validators.js'

test('parseCSV - handles simple comma separation', () => {
  const text = `Name,Email,Phone\nJohn,john@test.com,123\nJane,jane@test.com,456`
  const result = parseCSV(text)
  assert.deepStrictEqual(result.headers, ['Name', 'Email', 'Phone'])
  assert.strictEqual(result.rows.length, 2)
  assert.deepStrictEqual(result.rows[0].data, ['John', 'john@test.com', '123'])
})

test('parseCSV - handles quoted commas and newlines', () => {
  const text = `Name,"Notes, Extra"\n"Doe, John","Has\nnewlines"`
  const result = parseCSV(text)
  assert.deepStrictEqual(result.headers, ['Name', 'Notes, Extra'])
  assert.strictEqual(result.rows.length, 1)
  assert.deepStrictEqual(result.rows[0].data, ['Doe, John', 'Has\nnewlines'])
})

test('parseCSV - handles escaped quotes', () => {
  const text = `Name,Notes\nJohn,"He said ""hello"""`
  const result = parseCSV(text)
  assert.deepStrictEqual(result.rows[0].data, ['John', 'He said "hello"'])
})

test('normalizePaymentStatus', () => {
  assert.strictEqual(normalizePaymentStatus('Paid '), 'paid')
  assert.strictEqual(normalizePaymentStatus('COMP'), 'complimentary')
  assert.strictEqual(normalizePaymentStatus('door list'), 'door-list')
  assert.strictEqual(normalizePaymentStatus('random'), 'unknown')
})

test('normalizeEmail', () => {
  assert.strictEqual(normalizeEmail(' TEST@example.com '), 'test@example.com')
  assert.strictEqual(normalizeEmail(''), null)
})

test('validateRow - missing email and phone is not a hard blocker', () => {
  const row = { fullName: 'John', email: null, phone: null, personsAttending: 1 }
  const result = validateRow(row)
  assert.strictEqual(result.status, 'valid')
  assert.strictEqual(result.issues.length, 0)
})

test('validateRow - valid if at least phone is present', () => {
  const row = { fullName: 'John', email: null, phone: '123', personsAttending: 1 }
  const result = validateRow(row)
  assert.strictEqual(result.status, 'valid')
  assert.strictEqual(result.issues.length, 0)
})

test('generateStableId - is deterministic and privacy-safe', async () => {
  const row1 = { email: 'test@example.com', timestamp: new Date('2024-01-01') }
  const row2 = { email: 'test@example.com', timestamp: new Date('2024-01-01') }
  const id1 = await generateStableId('event1', row1)
  const id2 = await generateStableId('event1', row2)
  assert.strictEqual(id1, id2)
  assert.ok(id1.startsWith('imp_'))
  assert.ok(!id1.includes('test@example.com'))
})

test('generateStableId - differs across events for same email', async () => {
  const row = { email: 'test@example.com', timestamp: new Date('2024-01-01') }
  const id1 = await generateStableId('event1', row)
  const id2 = await generateStableId('event2', row)
  assert.notStrictEqual(id1, id2)
})

test('findDuplicate - detects sourceRowId against existing registrations', () => {
  const existing = [{ sourceRowId: 'row-1', email: 'a@test.com', timestamp: new Date('2024-01-01') }]
  const row = { sourceRowId: 'row-1', email: 'b@test.com', timestamp: new Date('2024-01-02') }
  assert.match(findDuplicate(existing, [], row), /already imported/)
})

test('findDuplicate - shared email is no longer a hard duplicate by itself', async () => {
  const existing = [{ email: 'test@example.com', timestamp: new Date('2024-01-01'), eventId: 'event-a' }]
  const row = { email: 'test@example.com', timestamp: new Date('2024-01-01') }
  assert.strictEqual(findDuplicate(existing, [], row), null)
})

test('mapRows - maps CSV columns using field map', () => {
  const parsedRows = [{ _sourceRowId: 'row-1', data: ['Jane Doe', 'jane@test.com', '2'] }]
  const headers = ['Name', 'Email', 'Guests']
  const fieldMap = { fullName: 0, email: 1, personsAttending: 2 }
  const mapped = mapRows(parsedRows, headers, fieldMap)
  assert.strictEqual(mapped[0].fullName, 'Jane Doe')
  assert.strictEqual(mapped[0].email, 'jane@test.com')
  assert.strictEqual(mapped[0].personsAttending, 2)
  assert.strictEqual(mapped[0].source, 'csv-import')
})

test('validateRegistration - ticket status validation', () => {
  assert.ok(validTicketStatuses.includes('no-ticket-assigned'))
  const errors = validateRegistration({
    fullName: 'Jane',
    personsAttending: 1,
    ticketStatus: 'invalid',
  })
  assert.strictEqual(errors.ticketStatus, 'Invalid ticket status.')
})
