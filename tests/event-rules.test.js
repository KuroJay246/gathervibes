/* global process */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
const projectId = 'gathervibeshub-event-rules-test'
const eventId = 'codex-event-rules-1'
const adminEmail = 'codex-admin@gsv.test'

function eventData(overrides = {}) {
  const createdAt = Timestamp.fromMillis(1710000000000)
  return {
    eventId,
    eventName: 'CODEX Event Rules Fixture',
    eventDate: Timestamp.fromMillis(1893456000000),
    location: 'QA Venue',
    venueName: 'QA Hall',
    eventType: 'workshop',
    status: 'planning',
    eventStartTime: '',
    eventEndTime: '',
    eventDescription: '',
    capacity: 100,
    ticketPrice: 25,
    registrationRequired: true,
    ticketTypeCount: 1,
    complimentaryAllowed: false,
    doorPaymentAllowed: false,
    registrationOpenDate: null,
    registrationCloseDate: null,
    priceTiers: [],
    eventCapabilities: { publicRegistration: true },
    financialPlan: {},
    operationsPlan: {},
    readinessChecklist: {},
    planningTasks: [],
    partnerRecords: [],
    notes: 'Fixture',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  }
}

async function createEnv() {
  return initializeTestEnvironment({
    projectId,
    firestore: {
      host: emulatorHost?.split(':')[0] || '127.0.0.1',
      port: Number(emulatorHost?.split(':')[1] || 8080),
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
}

async function seed(env) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), {
      approvedEmails: [adminEmail],
      updatedAt: Timestamp.fromMillis(1710000000000),
    })
    await setDoc(doc(db, 'events', eventId), eventData())
  })
}

async function withAdmin(testBody) {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('codex-admin', { email: adminEmail }).firestore()
    await testBody(db)
  } finally {
    await env.cleanup()
  }
}

test('event update accepts a canonical mutable field and server timestamp', { skip: !emulatorHost }, async () => {
  await withAdmin(async (db) => {
    await assertSucceeds(updateDoc(doc(db, 'events', eventId), {
      location: 'Updated QA Venue',
      updatedAt: serverTimestamp(),
    }))
  })
})

test('event update rejects unknown fields and immutable identity changes', { skip: !emulatorHost }, async () => {
  await withAdmin(async (db) => {
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      unknownField: true,
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      eventId: 'other-event',
      updatedAt: serverTimestamp(),
    }))
  })
})

test('event update rejects invalid mutable values and timestamp omission', { skip: !emulatorHost }, async () => {
  await withAdmin(async (db) => {
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      eventType: 'event',
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      location: 'No timestamp update',
    }))
  })
})

test('event update rejects unauthorized actors', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('not-approved', { email: 'not-approved@gsv.test' }).firestore()
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      location: 'Denied',
      updatedAt: serverTimestamp(),
    }))
  } finally {
    await env.cleanup()
  }
})
