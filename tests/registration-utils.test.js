import { test } from 'node:test'
import assert from 'node:assert'
import { validateRegistration } from '../src/utils/validators.js'

test('validateRegistration - accepts valid registration', () => {
  const values = {
    fullName: 'John Doe',
    personsAttending: 2,
    paymentStatus: 'paid',
  }
  const errors = validateRegistration(values)
  assert.deepStrictEqual(errors, {})
})

test('validateRegistration - rejects missing fullName', () => {
  const values = {
    fullName: '   ',
    personsAttending: 1,
  }
  const errors = validateRegistration(values)
  assert.strictEqual(errors.fullName, 'Full name is required.')
})

test('validateRegistration - rejects non-integer personsAttending', () => {
  const values = {
    fullName: 'John Doe',
    personsAttending: 1.5,
  }
  const errors = validateRegistration(values)
  assert.strictEqual(errors.personsAttending, 'Persons attending must be a whole number of at least 1.')
})

test('validateRegistration - rejects zero personsAttending', () => {
  const values = {
    fullName: 'John Doe',
    personsAttending: 0,
  }
  const errors = validateRegistration(values)
  assert.strictEqual(errors.personsAttending, 'Persons attending must be a whole number of at least 1.')
})

test('validateRegistration - rejects invalid paymentStatus', () => {
  const values = {
    fullName: 'John Doe',
    personsAttending: 1,
    paymentStatus: 'invalid-status',
  }
  const errors = validateRegistration(values)
  assert.strictEqual(errors.paymentStatus, 'Invalid payment status.')
})
