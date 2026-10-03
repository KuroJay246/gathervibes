/* global process */
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { Timestamp, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
const projectId = 'gathervibeshub-event-rules-test'
const eventId = 'codex-event-rules-1'
const adminEmail = 'codex-admin@gsv.test'
const organizerUid = 'codex-approved-organizer'
const protectedOwnerUid = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'

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
    await setDoc(doc(db, 'accessCapabilities', organizerUid), {
      uid: organizerUid,
      email: adminEmail,
      accessState: 'authorized',
      approvedOrganizer: true,
      schemaVersion: 1,
      updatedAt: Timestamp.fromMillis(1710000000000),
    })
    await setDoc(doc(db, 'events', eventId), eventData())
  })
}

async function withOrganizer(testBody) {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext(organizerUid, { email: adminEmail }).firestore()
    await testBody(db)
  } finally {
    await env.cleanup()
  }
}

test('event update accepts a canonical mutable field and server timestamp', { skip: !emulatorHost }, async () => {
  await withOrganizer(async (db) => {
    await assertSucceeds(updateDoc(doc(db, 'events', eventId), {
      location: 'Updated QA Venue',
      updatedAt: serverTimestamp(),
    }))
  })
})

test('approved organizer can create and delete a canonical Event', { skip: !emulatorHost }, async () => {
  await withOrganizer(async (db) => {
    const createdEventId = 'codex-created-event'
    await assertSucceeds(setDoc(doc(db, 'events', createdEventId), eventData({
      eventId: createdEventId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })))
    await assertSucceeds(updateDoc(doc(db, 'events', createdEventId), {
      location: 'Created Event Venue',
      updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(deleteDoc(doc(db, 'events', createdEventId)))
  })
})

test('event update rejects unknown fields and immutable identity changes', { skip: !emulatorHost }, async () => {
  await withOrganizer(async (db) => {
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
  await withOrganizer(async (db) => {
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      eventType: 'event',
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      location: 'No timestamp update',
    }))
  })
})

test('Protected Owner manages canonical Events without a capability document', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext(protectedOwnerUid, { email: 'owner@gsv.test' }).firestore()
    await assertSucceeds(updateDoc(doc(db, 'events', eventId), {
      location: 'Protected Owner Venue',
      updatedAt: serverTimestamp(),
    }))
  } finally {
    await env.cleanup()
  }
})

test('email allowlist alone cannot authorize Event writes', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext('legacy-email-only', { email: adminEmail }).firestore()
    await assertFails(updateDoc(doc(db, 'events', eventId), {
      location: 'Legacy Allowlist Venue',
      updatedAt: serverTimestamp(),
    }))
  } finally {
    await env.cleanup()
  }
})

test('revoked and malformed organizer capabilities cannot authorize Event writes', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, 'accessCapabilities', 'revoked-organizer'), {
        uid: 'revoked-organizer', email: 'revoked@gsv.test', accessState: 'revoked',
        approvedOrganizer: false, schemaVersion: 1, updatedAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'accessCapabilities', 'mismatched-organizer'), {
        uid: 'different-uid', email: 'mismatch@gsv.test', accessState: 'authorized',
        approvedOrganizer: true, schemaVersion: 1, updatedAt: Timestamp.now(),
      })
    })
    for (const uid of ['revoked-organizer', 'mismatched-organizer']) {
      const db = env.authenticatedContext(uid, { email: `${uid}@gsv.test` }).firestore()
      await assertFails(updateDoc(doc(db, 'events', eventId), {
        location: 'Denied Venue', updatedAt: serverTimestamp(),
      }))
    }
  } finally {
    await env.cleanup()
  }
})

test('ordinary users cannot create, alter, or delete organizer capabilities', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    const ordinaryDb = env.authenticatedContext('ordinary-user', { email: 'ordinary@gsv.test' }).firestore()
    const capability = {
      uid: 'ordinary-user', email: 'ordinary@gsv.test', accessState: 'authorized',
      approvedOrganizer: true, schemaVersion: 1, updatedAt: serverTimestamp(),
    }
    await assertFails(setDoc(doc(ordinaryDb, 'accessCapabilities', 'ordinary-user'), capability))
    const organizerDb = env.authenticatedContext(organizerUid, { email: adminEmail }).firestore()
    await assertFails(updateDoc(doc(organizerDb, 'accessCapabilities', organizerUid), {
      accessState: 'revoked', approvedOrganizer: false, updatedAt: serverTimestamp(),
    }))
  } finally {
    await env.cleanup()
  }
})

test('Protected Owner can materialize and revoke a strictly validated capability', { skip: !emulatorHost }, async () => {
  const env = await createEnv()
  try {
    await seed(env)
    const db = env.authenticatedContext(protectedOwnerUid, { email: 'owner@gsv.test' }).firestore()
    const ref = doc(db, 'accessCapabilities', 'new-organizer')
    await assertSucceeds(setDoc(ref, {
      uid: 'new-organizer', email: 'new@gsv.test', accessState: 'authorized',
      approvedOrganizer: true, schemaVersion: 1, updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(ref, {
      accessState: 'revoked', approvedOrganizer: false, updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(ref, { uid: 'forged-uid', updatedAt: serverTimestamp() }))
  } finally {
    await env.cleanup()
  }
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
