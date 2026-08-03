/* global process */
import { before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

const EVENT_ID = 'run-resource-event'
const ADMIN_UID = 'run-resource-admin'
const ADMIN_EMAIL = 'run-resource-admin@example.com'
const MANAGER_UID = 'run-resource-manager'
const MANAGER_EMAIL = 'run-resource-manager@example.com'
const VIEWER_UID = 'run-resource-viewer'
const VIEWER_EMAIL = 'run-resource-viewer@example.com'
const SCANNER_UID = 'run-resource-scanner'
const SCANNER_EMAIL = 'run-resource-scanner@example.com'
const OPS_UID = 'run-resource-ops'
const OPS_EMAIL = 'run-resource-ops@example.com'
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
let emulatorAvailable = false

async function isFirestoreEmulatorAvailable() {
  if (!emulatorHost) return false
  const [host, port] = emulatorHost.split(':')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 750)
  try {
    const response = await fetch(`http://${host}:${port}`, { signal: controller.signal })
    return response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

before(async () => {
  emulatorAvailable = await isFirestoreEmulatorAvailable()
})

function rulesTest(name, fn) {
  test(name, async (t) => {
    if (!emulatorAvailable) {
      t.skip('Firestore emulator is not running')
      return
    }
    await fn()
  })
}

async function createTestEnv() {
  return initializeTestEnvironment({
    projectId: 'gathervibeshub-run-resource-rules-test',
    firestore: {
      host: emulatorHost?.split(':')[0] || '127.0.0.1',
      port: Number(emulatorHost?.split(':')[1] || 8080),
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
}

function validEvent() {
  return {
    eventId: EVENT_ID,
    eventName: 'Run Resource Rules Event',
    eventDate: serverTimestamp(),
    location: 'Bridgetown',
    venueName: '',
    eventType: 'food-event',
    status: 'completed',
    eventStartTime: '',
    eventEndTime: '',
    eventDescription: '',
    capacity: 50,
    ticketPrice: 100,
    registrationRequired: true,
    ticketTypeCount: 1,
    complimentaryAllowed: false,
    doorPaymentAllowed: true,
    registrationOpenDate: null,
    registrationCloseDate: null,
    eventCapabilities: { publicRegistration: true, ticketing: true, checkIn: true },
    financialPlan: {},
    operationsPlan: {},
    readinessChecklist: {},
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function runItem(overrides = {}) {
  return {
    itemId: 'run-1',
    eventId: EVENT_ID,
    eventName: 'Run Resource Rules Event',
    title: 'Supplier arrival',
    category: 'Supplier Arrival',
    date: '2026-08-05',
    startTime: '13:00',
    endTime: '13:30',
    sequence: 0,
    location: 'Loading bay',
    status: 'Planned',
    description: '',
    notes: '',
    responsibleStaffUid: '',
    responsibleContactId: 'old-contact',
    responsibleOrganizationId: '',
    responsibleLabel: 'Organizer',
    expectedArrivalTime: '12:45',
    actualArrivalTime: '',
    arrivalStatus: 'Expected',
    arrivalNote: '',
    dependencyItemIds: [],
    linkedTaskId: '',
    linkedDocumentIds: ['old-document'],
    linkedResourceIds: ['resource-1'],
    delayReason: '',
    criticalForEvent: false,
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

function resourceItem(overrides = {}) {
  return {
    resourceId: 'resource-1',
    eventId: EVENT_ID,
    eventName: 'Run Resource Rules Event',
    name: 'Folding tables',
    category: 'Equipment',
    sourceType: 'Rented',
    status: 'Needed',
    quantityNeeded: 10,
    quantityConfirmed: 4,
    shortage: 6,
    unit: 'tables',
    location: 'Hall',
    supplierContactId: 'old-contact',
    supplierOrganizationId: '',
    supplierLabel: 'Vendor',
    packingRequired: true,
    pickupRequired: true,
    returnRequired: true,
    pickupDueDate: '2026-08-05',
    returnDueDate: '2026-08-06',
    notes: '',
    linkedTaskId: '',
    linkedDocumentIds: ['old-document'],
    linkedOperationId: 'old-operation',
    linkedCommitmentId: 'old-commitment',
    linkedRunOfShowItemIds: ['run-1'],
    criticalForEvent: false,
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

function audit(logId, eventId, action, targetType, targetId, performedBy, details = {}) {
  return {
    logId,
    eventId,
    action,
    targetType,
    targetId,
    performedBy,
    timestamp: serverTimestamp(),
    details,
  }
}

async function seedBaseData(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (env) => {
    const db = env.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), { approvedEmails: [ADMIN_EMAIL] })
    await setDoc(doc(db, 'events', EVENT_ID), validEvent())
    for (const [uid, email, role] of [
      [MANAGER_UID, MANAGER_EMAIL, 'event-manager'],
      [VIEWER_UID, VIEWER_EMAIL, 'viewer'],
      [SCANNER_UID, SCANNER_EMAIL, 'scanner'],
      [OPS_UID, OPS_EMAIL, 'operations-helper'],
    ]) {
      await setDoc(doc(db, 'staffProfiles', uid), {
        uid,
        email,
        displayName: role,
        status: 'active',
        defaultRole: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: ADMIN_EMAIL,
        updatedBy: ADMIN_EMAIL,
      })
      await setDoc(doc(db, 'events', EVENT_ID, 'staffAssignments', uid), {
        uid,
        email,
        eventId: EVENT_ID,
        role,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: ADMIN_EMAIL,
        updatedBy: ADMIN_EMAIL,
      })
    }
  })
}

rulesTest('[run-resource-rules] approved admin can create run item and resource with append-only audits', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem())
    batch.set(doc(db, 'events', EVENT_ID, 'resources', 'resource-1'), resourceItem())
    batch.set(doc(db, 'auditLogs', 'audit-run-1'), audit('audit-run-1', EVENT_ID, 'run-of-show.create', 'runOfShow', 'run-1', ADMIN_EMAIL, { title: 'Supplier arrival' }))
    batch.set(doc(db, 'auditLogs', 'audit-resource-1'), audit('audit-resource-1', EVENT_ID, 'resource.create', 'resource', 'resource-1', ADMIN_EMAIL, { name: 'Folding tables' }))

    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[run-resource-rules] approved admin can mark a run item arrived with append-only audit', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    await testEnv.withSecurityRulesDisabled(async (env) => {
      await setDoc(doc(env.firestore(), 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem())
    })
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const batch = writeBatch(db)
    batch.update(doc(db, 'events', EVENT_ID, 'runOfShow', 'run-1'), {
      arrivalStatus: 'Arrived',
      actualArrivalTime: '12:50',
      updatedAt: serverTimestamp(),
      updatedBy: ADMIN_EMAIL,
    })
    batch.set(doc(db, 'auditLogs', 'audit-run-arrival-1'), audit('audit-run-arrival-1', EVENT_ID, 'run-of-show.arrival', 'runOfShow', 'run-1', ADMIN_EMAIL, { title: 'Supplier arrival' }))

    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[run-resource-rules] event manager cannot create organizer-only run/resource records in this foundation', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(MANAGER_UID, { email: MANAGER_EMAIL }).firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem({ createdBy: MANAGER_EMAIL, updatedBy: MANAGER_EMAIL }))
    batch.set(doc(db, 'auditLogs', 'audit-run-manager-1'), audit('audit-run-manager-1', EVENT_ID, 'run-of-show.create', 'runOfShow', 'run-1', MANAGER_EMAIL, { title: 'Supplier arrival' }))

    await assertFails(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[run-resource-rules] viewer can read but cannot create, scanner and operations helper cannot read planning collections', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    await testEnv.withSecurityRulesDisabled(async (env) => {
      await setDoc(doc(env.firestore(), 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem())
      await setDoc(doc(env.firestore(), 'events', EVENT_ID, 'resources', 'resource-1'), resourceItem())
    })
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID, { email: VIEWER_EMAIL }).firestore()
    const scannerDb = testEnv.authenticatedContext(SCANNER_UID, { email: SCANNER_EMAIL }).firestore()
    const opsDb = testEnv.authenticatedContext(OPS_UID, { email: OPS_EMAIL }).firestore()

    await assertSucceeds(getDocs(collection(viewerDb, 'events', EVENT_ID, 'runOfShow')))
    await assertFails(setDoc(doc(viewerDb, 'events', EVENT_ID, 'resources', 'resource-2'), resourceItem({ resourceId: 'resource-2', createdBy: VIEWER_EMAIL, updatedBy: VIEWER_EMAIL })))
    await assertFails(getDocs(collection(scannerDb, 'events', EVENT_ID, 'runOfShow')))
    await assertFails(getDocs(collection(opsDb, 'events', EVENT_ID, 'resources')))
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[run-resource-rules] invalid event scope, invalid timing, quantity over-confirmation, and unknown fields are rejected', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()

    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem({ eventId: 'other-event' })))
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'runOfShow', 'run-1'), runItem({ endTime: '12:00' })))
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'resources', 'resource-1'), resourceItem({ quantityConfirmed: 11, shortage: -1 })))
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'resources', 'resource-1'), { ...resourceItem(), unexpected: true }))
  } finally {
    await testEnv.cleanup()
  }
})
