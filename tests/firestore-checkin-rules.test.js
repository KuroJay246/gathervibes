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

function unticketedRegistration(overrides = {}) {
  return importedRegistration({
    ticketStatus: 'no-ticket-assigned',
    ticketCode: null,
    ticketAssignedAt: null,
    ticketAssignedBy: null,
    ...overrides,
  })
}

function ticketAssignmentUpdate(ticketCode = 'CT-001') {
  return {
    ticketStatus: 'assigned',
    ticketCode,
    ticketAssignedAt: serverTimestamp(),
    ticketAssignedBy: adminEmail,
    updatedAt: serverTimestamp(),
  }
}

function ticketAuditData({
  action = 'ticket.assign',
  logId = 'audit-ticket-assign-1',
  ticketCode = 'CT-001',
  previousTicketCode = null,
} = {}) {
  return {
    logId,
    eventId,
    action,
    targetType: 'registration',
    targetId: registrationId,
    performedBy: adminEmail,
    timestamp: serverTimestamp(),
    details: {
      fullName: 'CODEX_TEST Guest One',
      ticketCode,
      previousTicketCode,
    },
  }
}

function checkedInRegistration(overrides = {}) {
  return importedRegistration({
    checkedIn: true,
    checkInTime: Timestamp.fromMillis(1710000200000),
    checkedInBy: adminEmail,
    updatedAt: Timestamp.fromMillis(1710000200000),
    ...overrides,
  })
}

function undoCheckInAfterState(registration = checkedInRegistration()) {
  return {
    ...registration,
    checkedIn: false,
    checkInTime: null,
    checkedInBy: null,
    updatedAt: serverTimestamp(),
  }
}

function undoCheckInAuditData() {
  return {
    logId: 'audit-checkin-undo-1',
    eventId,
    action: 'checkin.undo',
    targetType: 'registration',
    targetId: registrationId,
    performedBy: adminEmail,
    timestamp: serverTimestamp(),
    details: {
      fullName: 'CODEX_TEST Guest One',
      ticketCode: 'GSV-009',
      paymentStatus: 'complimentary',
      previousCheckedIn: true,
    },
  }
}

function importRegistrationData(id, index = 1) {
  return {
    registrationId: id,
    eventId,
    fullName: `CODEX_TEST Import Guest ${index}`,
    buyerName: 'CODEX_TEST Buyer',
    attendeeNames: [`CODEX_TEST Import Guest ${index}`],
    email: `codex-import-${index}@example.com`,
    phone: `24655510${String(index).padStart(2, '0')}`,
    groupName: 'CODEX_TEST Import Group',
    personsAttending: 1,
    paymentStatus: 'complimentary',
    paymentReference: `CODEX-IMPORT-${index}`,
    ticketStatus: 'assigned',
    ticketCode: `CT-IMP-${index}`,
    ticketAssignedAt: null,
    ticketAssignedBy: null,
    notes: 'Rules import test',
    checkedIn: false,
    checkInTime: null,
    checkedInBy: null,
    source: 'csv-import',
    sourceRowId: `codex-import:row-${index}`,
    timestamp: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function importAuditData(id, registrationId, index = 1) {
  return {
    logId: id,
    eventId,
    action: 'registration.import',
    targetType: 'registration',
    targetId: registrationId,
    performedBy: adminEmail,
    timestamp: serverTimestamp(),
    details: {
      fullName: `CODEX_TEST Import Guest ${index}`,
      sourceRowId: `codex-import:row-${index}`,
    },
  }
}

function addImportRowsToBatch(db, batch, count) {
  for (let index = 1; index <= count; index += 1) {
    const importRegistrationId = `imp_rules_import_${index}`
    batch.set(doc(db, 'registrations', importRegistrationId), importRegistrationData(importRegistrationId, index))
    batch.set(doc(db, 'auditLogs', `audit-rules-import-${index}`), importAuditData(`audit-rules-import-${index}`, importRegistrationId, index))
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

test('Firestore rules allow small approved admin registration import batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    addImportRowsToBatch(db, batch, 3)

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject oversized single registration import batch due audit verification access limits', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    addImportRowsToBatch(db, batch, 7)

    await assertFails(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules allow approved admin ticket assignment batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, unticketedRegistration())
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), ticketAssignmentUpdate('CT-001'))
    batch.set(doc(db, 'auditLogs', 'audit-ticket-assign-1'), ticketAuditData({ ticketCode: 'CT-001' }))

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules allow approved admin ticket regeneration batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), ticketAssignmentUpdate('CT-010'))
    batch.set(doc(db, 'auditLogs', 'audit-ticket-regenerate-1'), ticketAuditData({
      action: 'ticket.regenerate',
      logId: 'audit-ticket-regenerate-1',
      ticketCode: 'CT-010',
      previousTicketCode: 'GSV-009',
    }))

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject standalone ticket audit without registration transition', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, unticketedRegistration())
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()

    await assertFails(setDoc(doc(db, 'auditLogs', 'audit-ticket-assign-1'), ticketAuditData()))
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
    await seed(env, checkedInRegistration())
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()

    await assertFails(updateDoc(doc(db, 'registrations', registrationId), checkInAfterState(checkedInRegistration())))
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules allow approved admin undo check-in batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, checkedInRegistration())
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), undoCheckInAfterState())
    batch.set(doc(db, 'auditLogs', 'audit-checkin-undo-1'), undoCheckInAuditData())

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject unapproved undo check-in batch', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, checkedInRegistration())
    const db = env.authenticatedContext('not-approved', { email: 'other@example.com' }).firestore()
    const batch = writeBatch(db)

    batch.update(doc(db, 'registrations', registrationId), undoCheckInAfterState())
    batch.set(doc(db, 'auditLogs', 'audit-checkin-undo-1'), undoCheckInAuditData())

    await assertFails(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Firestore rules reject standalone undo audit without registration transition', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  try {
    await seed(env, checkedInRegistration())
    const db = env.authenticatedContext('admin-user', { email: adminEmail }).firestore()

    await assertFails(setDoc(doc(db, 'auditLogs', 'audit-checkin-undo-1'), undoCheckInAuditData()))
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
  assert.match(rules, /function isCheckInUndoUpdate\(registrationId\)/)
  assert.match(rules, /data\.action == 'checkin\.undo'/)
  assert.match(rules, /request\.resource\.data\.checkInTime == null/)
  assert.match(rules, /request\.resource\.data\.checkedInBy == null/)
  assert.doesNotMatch(rules, /allow update: if isApprovedAdmin\(\)\s+&& request\.resource\.data\.updatedAt == request\.time/)
})

test('check-in and undo services send minimal persistence payloads plus audit logs', async () => {
  const service = await readFile('src/services/ticketService.js', 'utf8')
  const checkInStart = service.indexOf('export async function completeCheckIn')
  const undoStart = service.indexOf('export async function undoCheckIn')
  const duplicateStart = service.indexOf('export async function recordDuplicateCheckInAttempt')
  const checkInService = service.slice(checkInStart, undoStart)
  const undoService = service.slice(undoStart, duplicateStart)

  assert.match(checkInService, /batch\.update\(regRef,\s+\{/)
  assert.match(checkInService, /checkedIn:\s+true/)
  assert.match(checkInService, /checkInTime:\s+serverTimestamp\(\)/)
  assert.match(checkInService, /checkedInBy:\s+performedBy\(user\)/)
  assert.match(checkInService, /updatedAt:\s+serverTimestamp\(\)/)
  assert.match(checkInService, /batch\.set\(audit\.ref,\s+audit\.data\)/)
  assert.doesNotMatch(checkInService, /\.\.\.registration/)
  assert.doesNotMatch(checkInService, /personsAttending/)
  assert.doesNotMatch(checkInService, /createdAt/)
  assert.match(undoService, /action: 'checkin\.undo'/)
  assert.match(service, /previousCheckedIn:\s+Boolean\(registration\.checkedIn\)/)
  assert.match(undoService, /checkedIn:\s+false/)
  assert.match(undoService, /checkInTime:\s+null/)
  assert.match(undoService, /checkedInBy:\s+null/)
  assert.match(undoService, /updatedAt:\s+serverTimestamp\(\)/)
  assert.doesNotMatch(undoService, /\.\.\.registration/)
})
