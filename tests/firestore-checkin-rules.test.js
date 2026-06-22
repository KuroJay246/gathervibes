/* global process */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'gathervibeshub-rules-test'
const adminEmail = 'jaylanspencer99@gmail.com'
const eventId = 'xPfa0b3KZyLSDnAD2uGI'
const registrationId = 'imp_12593bf58f029033'

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

async function createTestEnv() {
  return initializeTestEnvironment({
    projectId,
    firestore: {
      host: emulatorHost?.split(':')[0] || '127.0.0.1',
      port: Number(emulatorHost?.split(':')[1] || 8080),
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
}

function importedRegistration(overrides = {}) {
  const createdAt = Timestamp.fromMillis(1710000000000)
  return {
    registrationId,
    eventId,
    fullName: 'CODEX_TEST Guest One',
    email: 'codex@example.com',
    phone: '2465550101',
    groupName: 'CODEX_TEST Group',
    personsAttending: 1,
    paymentStatus: 'complimentary',
    paymentReference: 'CODEX_TEST-001',
    ticketStatus: 'assigned',
    ticketCode: 'GSV-009',
    ticketAssignedAt: Timestamp.fromMillis(1710000100000),
    ticketAssignedBy: adminEmail,
    notes: 'Imported CODEX_TEST registration',
    checkedIn: false,
    checkInTime: null,
    checkedInBy: null,
    source: 'csv-import',
    sourceRowId: 'row-1',
    timestamp: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

async function seed(env, registration = importedRegistration()) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), {
      approvedEmails: [adminEmail],
      updatedAt: Timestamp.fromMillis(1710000000000),
    })
    await setDoc(doc(db, 'events', eventId), {
      eventId,
      eventName: 'CODEX_TEST Live Verification Event',
      eventDate: Timestamp.fromMillis(1893456000000),
      location: 'QA',
      eventType: 'other',
      status: 'upcoming',
      capacity: 10,
      ticketPrice: 0,
      priceTiers: [],
      notes: 'Permanent QA fixture',
      createdAt: Timestamp.fromMillis(1710000000000),
      updatedAt: Timestamp.fromMillis(1710000000000),
    })
    await setDoc(doc(db, 'registrations', registration.registrationId), registration)
  })
}

function checkInAfterState(registration = importedRegistration()) {
  return {
    ...registration,
    checkedIn: true,
    checkInTime: serverTimestamp(),
    checkedInBy: adminEmail,
    updatedAt: serverTimestamp(),
  }
}

function checkInAuditData(action = 'checkin.complete') {
  return {
    logId: 'audit-checkin-1',
    eventId,
    action,
    targetType: 'registration',
    targetId: registrationId,
    performedBy: adminEmail,
    timestamp: serverTimestamp(),
    details: {
      fullName: 'CODEX_TEST Guest One',
      ticketCode: 'GSV-009',
      paymentStatus: 'complimentary',
    },
  }
}

test('Firestore rules allow approved admin check-in batch for imported ticketed registration', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), checkInAfterState())
    batch.set(doc(db, 'auditLogs', 'audit-checkin-1'), checkInAuditData())

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject unapproved check-in batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('not-approved', { email: 'other@example.com' }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), checkInAfterState())
    batch.set(doc(db, 'auditLogs', 'audit-checkin-1'), checkInAuditData())

    await assertFails(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject standalone check-in audit without registration transition', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()

    await assertFails(setDoc(doc(db, 'auditLogs', 'audit-checkin-1'), checkInAuditData()))
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject duplicate check-in registration update', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, importedRegistration({
      checkedIn: true,
      checkInTime: Timestamp.fromMillis(1710000200000),
      checkedInBy: adminEmail,
    }))
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()

    await assertFails(updateDoc(doc(db, 'registrations', registrationId), checkInAfterState(importedRegistration({
      checkedIn: true,
      checkInTime: Timestamp.fromMillis(1710000200000),
      checkedInBy: adminEmail,
    }))))
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules test harness is skipped unless the Firestore emulator is running', () => {
  assert.equal(typeof emulatorHost === 'string' || emulatorHost === undefined, true)
})

test('check-in rules allow only check-in field changes without broad schema loosening', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(rules, /function checkInCompletionChangedKeysOnly\(\)/)
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\[/)
  assert.match(rules, /'checkedIn', 'checkInTime', 'checkedInBy', 'updatedAt'/)
  assert.match(rules, /resource\.data\.checkedIn == false/)
  assert.match(rules, /request\.resource\.data\.checkedIn == true/)
  assert.match(rules, /request\.resource\.data\.checkInTime == request\.time/)
  assert.match(rules, /validPerformedBy\(request\.resource\.data\.checkedInBy\)/)
  assert.doesNotMatch(rules, /allow update: if isApprovedAdmin\(\)\s+&& request\.resource\.data\.updatedAt == request\.time/)
})

test('check-in service sends a minimal persistence payload plus audit log', async () => {
  const service = await readFile('src/services/ticketService.js', 'utf8')
  const checkInStart = service.indexOf('export async function completeCheckIn')
  const duplicateStart = service.indexOf('export async function recordDuplicateCheckInAttempt')
  const checkInService = service.slice(checkInStart, duplicateStart)

  assert.match(checkInService, /batch\.update\(regRef,\s+\{/)
  assert.match(checkInService, /checkedIn:\s+true/)
  assert.match(checkInService, /checkInTime:\s+serverTimestamp\(\)/)
  assert.match(checkInService, /checkedInBy:\s+performedBy\(user\)/)
  assert.match(checkInService, /updatedAt:\s+serverTimestamp\(\)/)
  assert.match(checkInService, /batch\.set\(audit\.ref,\s+audit\.data\)/)
  assert.doesNotMatch(checkInService, /\.\.\.registration/)
  assert.doesNotMatch(checkInService, /personsAttending/)
  assert.doesNotMatch(checkInService, /createdAt/)
})
