/* global process */
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

const projectId = 'gathervibeshub-phase23t-rules-test'
const protectedOwnerUid = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const protectedOwnerEmail = 'jaylanspencer99@gmail.com'
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

async function seedAccessControl(env) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), {
      approvedEmails: ['secondary@example.com'],
      updatedAt: Timestamp.fromMillis(1710000000000),
    })
  })
}

function buildFullPlannerEvent(eventId, operationsPlanOverrides = {}) {
  return {
    eventId,
    eventName: 'QA_PHASE23T Organizer Ready Event',
    eventDate: Timestamp.fromDate(new Date('2026-11-14T12:00:00')),
    location: 'Bridgetown Organizer Rehearsal Site',
    venueName: 'Organizer QA Pavilion',
    eventType: 'hospitality-event',
    status: 'planning',
    eventStartTime: '16:00',
    eventEndTime: '21:00',
    eventDescription: 'Synthetic Phase 23T rehearsal event used to verify organizer planning, finance, ticketing, and closeout workflows.',
    capacity: 60,
    ticketPrice: 75,
    registrationRequired: true,
    ticketTypeCount: 1,
    complimentaryAllowed: true,
    doorPaymentAllowed: true,
    registrationOpenDate: Timestamp.fromDate(new Date('2026-08-15T12:00:00')),
    registrationCloseDate: Timestamp.fromDate(new Date('2026-11-10T12:00:00')),
    financialPlan: {
      projectedRegistrationIncome: 4500,
      venueBudget: 1200,
      supplierBudget: 800,
      entertainmentBudget: 500,
      marketingBudget: 300,
      staffingBudget: 400,
      contingencyBudget: 250,
      otherBudget: 150,
    },
    operationsPlan: {
      venueAccessTime: '13:00',
      emergencyContact: 'Organizer QA Lead - 246-555-0140',
      suppliersNote: 'Synthetic supplier note',
      bakerVendorNote: 'Synthetic baker and vendor note',
      sponsorNote: 'Synthetic sponsor note',
      staffNote: 'Synthetic staff note',
      equipmentNote: 'Synthetic equipment note',
      licencesNote: 'Synthetic licence note',
      insuranceNote: 'Synthetic insurance note',
      setupTime: '14:30',
      timeline: [
        { timelineId: 'timeline-1', time: '15:00', label: 'Setup review' },
        { timelineId: 'timeline-2', time: '16:00', label: 'Doors open' },
      ],
      ...operationsPlanOverrides,
    },
    readinessChecklist: {
      venueConfirmed: false,
      venueAccessConfirmed: false,
      paymentMethodsConfigured: false,
      suppliersConfirmed: false,
      staffAssigned: false,
      eventDayTimelineReady: false,
      ticketProcessReady: false,
      checkInProcessReady: false,
      communicationsPrepared: false,
      licencesReviewed: false,
      insuranceReviewed: false,
    },
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

test('Phase 23T allows protected owner to create a full planner event with its append-only audit log', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  await seedAccessControl(env)

  try {
    const db = env.authenticatedContext(protectedOwnerUid, { email: protectedOwnerEmail }).firestore()
    const eventId = 'qa-phase23t-create-pass'
    const auditLogId = 'audit-phase23t-create-pass'
    const batch = writeBatch(db)
    batch.set(doc(db, 'events', eventId), buildFullPlannerEvent(eventId))
    batch.set(doc(collection(db, 'auditLogs'), auditLogId), {
      logId: auditLogId,
      eventId,
      action: 'event.create',
      targetType: 'event',
      targetId: eventId,
      performedBy: protectedOwnerEmail,
      timestamp: serverTimestamp(),
      details: { eventName: 'QA_PHASE23T Organizer Ready Event' },
    })

    await assertSucceeds(batch.commit())
  } finally {
    await env.cleanup()
  }
})

test('Phase 23T still rejects unexpected operations plan keys during event creation', { skip: !emulatorHost }, async () => {
  const env = await createTestEnv()
  await seedAccessControl(env)

  try {
    const db = env.authenticatedContext(protectedOwnerUid, { email: protectedOwnerEmail }).firestore()
    const eventId = 'qa-phase23t-create-fail'
    const batch = writeBatch(db)
    batch.set(doc(db, 'events', eventId), buildFullPlannerEvent(eventId, { unexpectedField: 'nope' }))

    await assertFails(batch.commit())
  } finally {
    await env.cleanup()
  }
})
