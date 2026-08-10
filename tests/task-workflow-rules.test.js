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
  Timestamp,
  writeBatch,
} from 'firebase/firestore'

const EVENT_ID = 'task-rules-event'
const ADMIN_UID = 'task-admin'
const ADMIN_EMAIL = 'task-admin@example.com'
const SCANNER_UID = 'task-scanner'
const SCANNER_EMAIL = 'task-scanner@example.com'
const VIEWER_UID = 'task-viewer'
const VIEWER_EMAIL = 'task-viewer@example.com'
const PROTECTED_OWNER_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const PROTECTED_OWNER_EMAIL = 'jaylanspencer99@gmail.com'
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
    projectId: 'gathervibeshub-task-workflow-test',
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
    eventName: 'Task Rules Event',
    eventDate: serverTimestamp(),
    location: 'Bridgetown',
    venueName: '',
    eventType: 'food-event',
    status: 'planning',
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

function validTask(overrides = {}) {
  return {
    taskId: 'task-1',
    eventId: EVENT_ID,
    eventName: 'Task Rules Event',
    isTestEvent: true,
    title: 'Confirm table layout',
    notes: '',
    category: 'Event Setup',
    dueDate: '2026-08-05',
    followUpDate: '',
    priority: 'Normal',
    status: 'Not Started',
    responsibleType: 'organizer',
    responsibleUserId: '',
    responsibleLabel: '',
    waitingOn: '',
    blockerReason: '',
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    completedAt: null,
    cancelledAt: null,
    ...overrides,
  }
}

async function seedBaseData(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (env) => {
    const db = env.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), { approvedEmails: [ADMIN_EMAIL] })
    await setDoc(doc(db, 'events', EVENT_ID), validEvent())
    await setDoc(doc(db, 'staffProfiles', SCANNER_UID), {
      uid: SCANNER_UID,
      email: SCANNER_EMAIL,
      displayName: 'Scanner',
      status: 'active',
      defaultRole: 'scanner',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'events', EVENT_ID, 'staffAssignments', SCANNER_UID), {
      uid: SCANNER_UID,
      email: SCANNER_EMAIL,
      eventId: EVENT_ID,
      role: 'scanner',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'staffProfiles', VIEWER_UID), {
      uid: VIEWER_UID,
      email: VIEWER_EMAIL,
      displayName: 'Viewer',
      status: 'active',
      defaultRole: 'viewer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'events', EVENT_ID, 'staffAssignments', VIEWER_UID), {
      uid: VIEWER_UID,
      email: VIEWER_EMAIL,
      eventId: EVENT_ID,
      role: 'viewer',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
  })
}

rulesTest('[task-rules] approved admin can create a valid scoped task with append-only audit', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const batch = writeBatch(db)
    const taskRef = doc(db, 'events', EVENT_ID, 'tasks', 'task-1')
    const auditRef = doc(db, 'auditLogs', 'task-audit-1')
    batch.set(taskRef, validTask())
    batch.set(auditRef, {
      logId: 'task-audit-1',
      eventId: EVENT_ID,
      action: 'task.create',
      targetType: 'task',
      targetId: 'task-1',
      performedBy: ADMIN_EMAIL,
      timestamp: serverTimestamp(),
      details: { taskTitle: 'Confirm table layout' },
    })
    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[task-rules] invalid status and forged event scope are rejected', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'tasks', 'task-1'), validTask({ status: 'Done' })))
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'tasks', 'task-1'), validTask({ eventId: 'other-event' })))
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[task-rules] viewer can read scoped tasks and scanner cannot list tasks', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    await testEnv.withSecurityRulesDisabled(async (env) => {
      await setDoc(doc(env.firestore(), 'events', EVENT_ID, 'tasks', 'task-1'), validTask())
    })
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID, { email: VIEWER_EMAIL }).firestore()
    const scannerDb = testEnv.authenticatedContext(SCANNER_UID, { email: SCANNER_EMAIL }).firestore()
    await assertSucceeds(getDocs(collection(viewerDb, 'events', EVENT_ID, 'tasks')))
    await assertFails(getDocs(collection(scannerDb, 'events', EVENT_ID, 'tasks')))
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[task-rules] protected owner can list and normalize-update legitimate legacy task values without approvedEmails membership', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const createdAt = Timestamp.fromDate(new Date('2026-08-01T12:00:00.000Z'))
    await testEnv.withSecurityRulesDisabled(async (env) => {
      await setDoc(doc(env.firestore(), 'events', EVENT_ID, 'tasks', 'legacy-task'), validTask({
        taskId: 'legacy-task',
        priority: 'Medium',
        category: 'Supplier',
        createdAt,
        updatedAt: createdAt,
      }))
    })
    const db = testEnv.authenticatedContext(PROTECTED_OWNER_UID, { email: PROTECTED_OWNER_EMAIL }).firestore()
    await assertSucceeds(getDocs(collection(db, 'events', EVENT_ID, 'tasks')))

    const batch = writeBatch(db)
    batch.update(doc(db, 'events', EVENT_ID, 'tasks', 'legacy-task'), {
      priority: 'Normal',
      category: 'Suppliers and Partners',
      status: 'Completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: PROTECTED_OWNER_EMAIL,
    })
    batch.set(doc(db, 'auditLogs', 'legacy-task-owner-audit'), {
      logId: 'legacy-task-owner-audit',
      eventId: EVENT_ID,
      action: 'task.completed',
      targetType: 'task',
      targetId: 'legacy-task',
      performedBy: PROTECTED_OWNER_EMAIL,
      timestamp: serverTimestamp(),
      details: { taskTitle: 'Confirm table layout' },
    })
    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[task-rules] protected owner still cannot inject unsupported task fields', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(PROTECTED_OWNER_UID, { email: PROTECTED_OWNER_EMAIL }).firestore()
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'tasks', 'bad-task'), validTask({
      taskId: 'bad-task',
      unexpected: true,
      createdBy: PROTECTED_OWNER_EMAIL,
      updatedBy: PROTECTED_OWNER_EMAIL,
    })))
  } finally {
    await testEnv.cleanup()
  }
})
