import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { TUTORIAL_VERSION, guidedTutorialSteps } from './tutorialSteps.js'

export function onboardingDocRefForUser(uid) {
  return doc(db, 'staffProfiles', uid, 'preferences', 'onboarding')
}

export async function loadTutorialState(user) {
  if (!user?.uid) return null
  const snap = await getDoc(onboardingDocRefForUser(user.uid))
  if (!snap.exists()) {
    return {
      version: null,
      completed: false,
      completedAt: null,
      lastStep: 0,
      skippedAt: null,
      replayRequestedAt: null,
    }
  }
  const data = snap.data()
  const isCurrentVersion = data.version === TUTORIAL_VERSION
  return {
    version: data.version || null,
    completed: isCurrentVersion && data.completed === true,
    completedAt: isCurrentVersion ? data.completedAt || null : null,
    lastStep: isCurrentVersion ? normalizeLastStep(data.lastStep) : 0,
    skippedAt: data.skippedAt || null,
    replayRequestedAt: data.replayRequestedAt || null,
    legacyVersion: isCurrentVersion ? null : data.version || null,
  }
}

export async function markTutorialStarted(user, lastStep = 1) {
  await setDoc(onboardingDocRefForUser(user.uid), {
    version: TUTORIAL_VERSION,
    startedAt: serverTimestamp(),
    lastStep,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function markTutorialProgress(user, lastStep) {
  await setDoc(onboardingDocRefForUser(user.uid), {
    version: TUTORIAL_VERSION,
    lastStep: normalizeLastStep(lastStep),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function markTutorialSkipped(user, lastStep) {
  await setDoc(onboardingDocRefForUser(user.uid), {
    version: TUTORIAL_VERSION,
    skippedAt: serverTimestamp(),
    lastStep: normalizeLastStep(lastStep),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function markTutorialReplay(user) {
  await setDoc(onboardingDocRefForUser(user.uid), {
    replayRequestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function markTutorialCompleted(user, currentState) {
  const payload = {
    version: TUTORIAL_VERSION,
    completed: true,
    lastStep: guidedTutorialSteps.length,
    updatedAt: serverTimestamp(),
  }
  if (!currentState?.completedAt) {
    payload.completedAt = serverTimestamp()
  }
  await setDoc(onboardingDocRefForUser(user.uid), payload, { merge: true })
}

function normalizeLastStep(value) {
  const number = Number(value) || 0
  return Math.max(0, Math.min(guidedTutorialSteps.length, number))
}
