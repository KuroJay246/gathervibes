import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.GSV_FIREBASE_PROJECT_ID || 'gathervibeshub'
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'
const FIXTURE_EMAIL = process.env.GSV_MOBILE_E2E_EMAIL || 'mobilee2e@gsv.test'
const FIXTURE_PASSWORD = process.env.GSV_MOBILE_E2E_PASSWORD || 'MobileE2E123'
const EVENT_ID = 'codex_demo_full_system_walkthrough'
const EVENT_NAME = 'CODEX_DEMO - Full System Walkthrough'
const FIXTURE_UID = 'mobile-e2e-staff'

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST
process.env.FIREBASE_AUTH_EMULATOR_HOST = FIREBASE_AUTH_EMULATOR_HOST

const app = getApps().length ? getApps()[0] : initializeApp({ projectId: PROJECT_ID })
const auth = getAuth(app)
const db = getFirestore(app)

async function ensureUser() {
  try {
    await auth.deleteUser(FIXTURE_UID)
  } catch {}

  return auth.createUser({
    uid: FIXTURE_UID,
    email: FIXTURE_EMAIL,
    emailVerified: true,
    password: FIXTURE_PASSWORD,
    displayName: 'Mobile E2E Staff',
  })
}

function registration(id, fullName, ticketCode, checkedIn = false) {
  return {
    registrationId: id,
    eventId: EVENT_ID,
    fullName,
    buyerName: fullName,
    email: `${id}@example.test`,
    phone: '2465550000',
    paymentStatus: 'paid',
    ticketCode,
    checkedIn,
    checkInTime: checkedIn ? Timestamp.fromDate(new Date('2026-08-24T08:00:00.000Z')) : null,
    checkedInBy: checkedIn ? 'prior-scanner@example.com' : null,
    createdAt: Timestamp.fromDate(new Date('2026-08-24T07:00:00.000Z')),
    updatedAt: Timestamp.fromDate(new Date('2026-08-24T08:05:00.000Z')),
  }
}

async function seedFirestore(userRecord) {
  const batch = db.batch()
  const eventRef = db.collection('events').doc(EVENT_ID)
  const profileRef = db.collection('staffProfiles').doc(userRecord.uid)
  const assignmentRef = eventRef.collection('staffAssignments').doc(userRecord.uid)

  batch.set(eventRef, {
    eventId: EVENT_ID,
    eventName: EVENT_NAME,
    eventDate: '2026-08-24',
    location: 'Training Event',
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  batch.set(profileRef, {
    uid: userRecord.uid,
    email: FIXTURE_EMAIL,
    displayName: 'Mobile E2E Staff',
    status: 'active',
    defaultRole: 'scanner',
    assignedEventIds: [EVENT_ID],
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  batch.set(assignmentRef, {
    uid: userRecord.uid,
    email: FIXTURE_EMAIL,
    eventId: EVENT_ID,
    role: 'scanner',
    status: 'active',
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  for (const row of [
    registration('mobile-e2e-ready', 'Fixture Guest', 'GSV-E2E-READY'),
    registration('mobile-e2e-duplicate', 'Duplicate Guest', 'GSV-E2E-DUPLICATE', true),
    registration('mobile-e2e-search', 'Lookup Guest', 'GSV-E2E-LOOKUP'),
  ]) {
    batch.set(db.collection('registrations').doc(row.registrationId), row, { merge: true })
  }

  batch.set(eventRef.collection('tasks').doc('mobile-e2e-task'), {
    taskId: 'mobile-e2e-task',
    title: 'Verify scanner readiness',
    status: 'Open',
    dueDate: '2026-08-24T09:00:00.000Z',
  }, { merge: true })

  batch.set(eventRef.collection('documents').doc('mobile-e2e-doc'), {
    documentId: 'mobile-e2e-doc',
    title: 'Check-In Checklist',
    category: 'operations',
  }, { merge: true })

  batch.set(db.collection('contacts').doc('mobile-e2e-contact'), {
    contactId: 'mobile-e2e-contact',
    displayName: 'E2E Venue Lead',
    category: 'venue',
  }, { merge: true })

  await batch.commit()
}

async function main() {
  const userRecord = await ensureUser()
  await seedFirestore(userRecord)
  console.log(JSON.stringify({
    result: 'ok',
    projectId: PROJECT_ID,
    authEmulator: FIREBASE_AUTH_EMULATOR_HOST,
    firestoreEmulator: FIRESTORE_EMULATOR_HOST,
    fixture: {
      uid: userRecord.uid,
      email: FIXTURE_EMAIL,
      password: FIXTURE_PASSWORD,
      eventId: EVENT_ID,
      eventName: EVENT_NAME,
      readyTicket: 'GSV-E2E-READY',
      duplicateTicket: 'GSV-E2E-DUPLICATE',
      invalidTicket: 'GSV-E2E-INVALID',
      searchText: 'Lookup Guest',
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
