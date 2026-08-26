import {
  collection,
  doc,
  getDocFromServer,
  serverTimestamp,
  waitForPendingWrites,
  writeBatch,
} from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'
import { canCompleteCheckIn } from '@gsv/contracts/ticketUtils'

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

function createAuditLogWrite({ eventId, action, targetType = 'registration', targetId, performedByUser, details }) {
  const auditRef = doc(collection(firestore, 'auditLogs'))
  return {
    ref: auditRef,
    data: {
      logId: auditRef.id,
      eventId,
      action,
      targetType,
      targetId,
      performedBy: performedBy(performedByUser),
      timestamp: serverTimestamp(),
      details,
    },
  }
}

function checkInAuditDetails(registration) {
  return {
    fullName: registration.fullName,
    ticketCode: registration.ticketCode || null,
    paymentStatus: registration.paymentStatus,
  }
}

function undoCheckInAuditDetails(registration) {
  return {
    ...checkInAuditDetails(registration),
    previousCheckedIn: Boolean(registration.checkedIn),
  }
}

function offlineError(message = 'A live connection is required before check-in can be saved.') {
  const error = new Error(message)
  error.code = 'mobile/offline-write-blocked'
  return error
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(offlineError(message)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function completeCheckIn(registration, user, { networkConnected = true } = {}) {
  const allowed = canCompleteCheckIn(registration)
  if (!allowed.allowed) throw new Error(allowed.reason)
  if (!networkConnected) throw offlineError()

  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'checkin.complete',
    targetId: registration.registrationId,
    performedByUser: user,
    details: checkInAuditDetails(registration),
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    checkedIn: true,
    checkInTime: serverTimestamp(),
    checkedInBy: performedBy(user),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()

  await withTimeout(waitForPendingWrites(firestore), 12000, 'The server did not confirm this check-in before the confirmation window expired.')
  const confirmedSnapshot = await withTimeout(getDocFromServer(regRef), 12000, 'The server did not confirm this check-in before the confirmation window expired.')
  if (!confirmedSnapshot.exists() || confirmedSnapshot.data()?.checkedIn !== true) {
    throw new Error('Check-in could not be confirmed by the server.')
  }
}

export async function undoCheckIn(registration, user, { networkConnected = true } = {}) {
  if (!registration?.checkedIn) throw new Error('This guest is not currently checked in.')
  if (!networkConnected) throw offlineError('A live connection is required before Undo Check-In can be saved.')

  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'checkin.undo',
    targetId: registration.registrationId,
    performedByUser: user,
    details: undoCheckInAuditDetails(registration),
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    checkedIn: false,
    checkInTime: null,
    checkedInBy: null,
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()

  await withTimeout(waitForPendingWrites(firestore), 12000, 'Undo Check-In could not be confirmed by the server.')
  const confirmedSnapshot = await withTimeout(getDocFromServer(regRef), 12000, 'Undo Check-In could not be confirmed by the server.')
  if (!confirmedSnapshot.exists() || confirmedSnapshot.data()?.checkedIn !== false) {
    throw new Error('Undo Check-In could not be confirmed by the server.')
  }
}

export async function recordDuplicateCheckInAttempt(registration, user, { networkConnected = true } = {}) {
  if (!networkConnected) throw offlineError('A live connection is required before a duplicate-attempt audit can be saved.')

  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'checkin.duplicate-attempt',
    targetId: registration.registrationId,
    performedByUser: user,
    details: checkInAuditDetails(registration),
  })
  const batch = writeBatch(firestore)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  await withTimeout(waitForPendingWrites(firestore), 12000, 'Duplicate-attempt audit could not be confirmed by the server.')
}
