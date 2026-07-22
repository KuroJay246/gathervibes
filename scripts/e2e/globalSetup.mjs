/* global process */
import { deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { Timestamp, getFirestore } from 'firebase-admin/firestore'

export const E2E_EMAIL = 'qa-phase23p@example.test'
export const E2E_PASSWORD = 'LocalEmulatorOnly-23P!'
export const E2E_EVENT_ID = 'phase23p-codex-test'
export const E2E_EVENT_NAME = 'CODEX_TEST Phase 23P E2E Event'

export default async function globalSetup() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('E2E requires the Firebase Auth and Firestore emulators.')
  }

  const existing = getApps().find((app) => app.name === 'phase23p-e2e-seed')
  const app = existing || initializeApp({ projectId: 'gathervibeshub' }, 'phase23p-e2e-seed')
  const auth = getAuth(app)
  const firestore = getFirestore(app)

  try {
    const currentUser = await auth.getUserByEmail(E2E_EMAIL)
    await auth.deleteUser(currentUser.uid)
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error
  }

  await auth.createUser({
    uid: 'phase23p-e2e-organizer',
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    emailVerified: true,
    displayName: 'Phase 23P QA Organizer',
  })

  const now = Timestamp.now()
  await Promise.all([
    firestore.doc('settings/accessControl').set({
      approvedEmails: [E2E_EMAIL],
      rolesByEmail: { [E2E_EMAIL]: 'admin' },
      updatedAt: now,
    }),
    firestore.doc(`events/${E2E_EVENT_ID}`).set({
      eventId: E2E_EVENT_ID,
      eventName: E2E_EVENT_NAME,
      eventDate: Timestamp.fromDate(new Date('2027-01-15T16:00:00.000Z')),
      location: 'Local Emulator',
      eventType: 'other',
      status: 'draft',
      capacity: 20,
      ticketPrice: 45,
      currency: 'BBD',
      notes: 'Synthetic local E2E fixture. Never production data.',
      createdAt: now,
      updatedAt: now,
    }),
    firestore.doc('auditLogs/phase23p-e2e-seed').set({
      logId: 'phase23p-e2e-seed',
      eventId: E2E_EVENT_ID,
      action: 'test.fixture.seed',
      targetType: 'event',
      targetId: E2E_EVENT_ID,
      performedBy: 'phase23p-e2e',
      timestamp: now,
      details: { synthetic: true },
    }),
  ])

  await deleteApp(app)
}
