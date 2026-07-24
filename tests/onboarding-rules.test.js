/* global process */
/**
 * Firestore Emulator Security Rules Tests — Onboarding Preferences Subcollection
 *
 * Tests the dedicated onboarding path:
 *   staffProfiles/{uid}/preferences/onboarding
 *
 * Verifies:
 *   - create (document does not exist yet)
 *   - update / merge (document already exists)
 *   - cross-user write denial
 *   - extra field write denial
 *   - lastStep out-of-range denial
 *   - correct type validation
 *   - read isolation
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

const JAYLAN_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const ANICA_UID = 'WM2UOQtSeuOglCI5uMZQKrYYqP53'
const OTHER_UID = 'some-other-user-uid-123'
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST

async function createTestEnv() {
  return initializeTestEnvironment({
    projectId: 'gathervibeshub-onboarding-test',
    firestore: {
      host: emulatorHost?.split(':')[0] || '127.0.0.1',
      port: Number(emulatorHost?.split(':')[1] || 8080),
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
}

function onboardingDocRef(db, uid) {
  return doc(db, 'staffProfiles', uid, 'preferences', 'onboarding')
}

function validOnboarding(overrides = {}) {
  return {
    version: 'mother-launch-v1',
    completed: false,
    lastStep: 1,
    updatedAt: serverTimestamp(),
    ...overrides,
  }
}

// ── Create (document does not exist) ────────────────────────────────────────

test('[onboarding-rules] Jaylan can create their own onboarding document (new user)', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding()))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Jaylan can create with all optional onboarding fields', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(
      setDoc(
        onboardingDocRef(ctx.firestore(), JAYLAN_UID),
        validOnboarding({
          startedAt: serverTimestamp(),
          completed: true,
          completedAt: serverTimestamp(),
          skippedAt: serverTimestamp(),
          lastStep: 13,
          replayRequestedAt: serverTimestamp(),
        })
      )
    )
  } finally {
    await testEnv.cleanup()
  }
})

// ── Update / merge (document already exists) ────────────────────────────────

test('[onboarding-rules] Jaylan can merge-update their existing onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    await testEnv.withSecurityRulesDisabled(async (env) => {
      await setDoc(doc(env.firestore(), 'staffProfiles', JAYLAN_UID, 'preferences', 'onboarding'), validOnboarding())
    })
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(
      setDoc(
        onboardingDocRef(ctx.firestore(), JAYLAN_UID),
        { completed: true, completedAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      )
    )
  } finally {
    await testEnv.cleanup()
  }
})

// ── Anica create ─────────────────────────────────────────────────────────────

test('[onboarding-rules] Anica can create her own onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(ANICA_UID)
    await assertSucceeds(setDoc(onboardingDocRef(ctx.firestore(), ANICA_UID), validOnboarding()))
  } finally {
    await testEnv.cleanup()
  }
})

// ── Cross-user write denial ───────────────────────────────────────────────────

test('[onboarding-rules] Jaylan cannot write to Anica onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), ANICA_UID), validOnboarding()))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Anica cannot write to Jaylan onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(ANICA_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding()))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Third-party user cannot write to Jaylan onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(OTHER_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding()))
  } finally {
    await testEnv.cleanup()
  }
})

// ── Extra field denial ────────────────────────────────────────────────────────

test('[onboarding-rules] Rejects write with unauthorized field "role"', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ role: 'event-manager' })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects write with unauthorized field "status"', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ status: 'active' })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects write with unauthorized field "email"', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ email: 'test@example.com' })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects write with arbitrary extra field "adminOverride"', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ adminOverride: true })))
  } finally {
    await testEnv.cleanup()
  }
})

// ── Field type validation ─────────────────────────────────────────────────────

test('[onboarding-rules] Rejects lastStep below minimum (0)', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ lastStep: 0 })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects lastStep above maximum (14)', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ lastStep: 14 })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Accepts lastStep at minimum boundary (1)', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ lastStep: 1 })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Accepts lastStep at maximum boundary (13)', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ lastStep: 13 })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects non-boolean "completed" value', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ completed: 'yes' })))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Rejects version string longer than 64 characters', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(setDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID), validOnboarding({ version: 'a'.repeat(65) })))
  } finally {
    await testEnv.cleanup()
  }
})

// ── Read isolation ────────────────────────────────────────────────────────────

test('[onboarding-rules] Jaylan can read their own onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertSucceeds(getDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID)))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Jaylan cannot read Anica onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.authenticatedContext(JAYLAN_UID)
    await assertFails(getDoc(onboardingDocRef(ctx.firestore(), ANICA_UID)))
  } finally {
    await testEnv.cleanup()
  }
})

test('[onboarding-rules] Unauthenticated user cannot read onboarding document', async () => {
  const testEnv = await createTestEnv()
  try {
    const ctx = testEnv.unauthenticatedContext()
    await assertFails(getDoc(onboardingDocRef(ctx.firestore(), JAYLAN_UID)))
  } finally {
    await testEnv.cleanup()
  }
})

// ── Sanity: rules file describes the expected path ───────────────────────────

test('[onboarding-rules] firestore.rules contains the dedicated onboarding subcollection match block', async () => {
  const rules = await readFile('firestore.rules', 'utf8')
  assert.match(rules, /\/staffProfiles\/\{uid\}\/preferences\/onboarding/)
  assert.match(rules, /validOnboardingData/)
  assert.doesNotMatch(rules, /onboardingFieldsUnchanged/)
})
