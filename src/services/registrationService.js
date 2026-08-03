import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite } from './auditService.js'
import { normalizeAttendeeNames } from '../utils/importUtils.js'
import { financePayload, normalizePaymentMethod } from '../utils/financeUtils.js'
import { normalizePaymentStatus } from '../utils/paymentStatus.js'
import { historicalAttendancePayload } from '../utils/attendanceUtils.js'
import { safeAuditChanges } from '../utils/auditUtils.js'
import {
  assertBulkPaymentStatusAllowed,
  assertEventScopedRecords,
  buildOperationManifest,
  operationAuditLogId,
  summarizeBulkOperation,
} from '../utils/bulkOperation.js'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function registrationPayload(values, eventId, event = {}) {
  return {
    eventId,
    fullName: values.fullName?.trim() || '',
    buyerName: values.buyerName?.trim() || null,
    attendeeNames: normalizeAttendeeNames(values.attendeeNames),
    email: values.email?.trim().toLowerCase() || null,
    phone: values.phone?.trim() || null,
    groupName: values.groupName?.trim() || null,
    personsAttending: Number(values.personsAttending) || 1,
    paymentStatus: normalizePaymentStatus(values.paymentStatus || 'unknown'),
    ...financePayload(values, event),
    paymentReference: values.paymentReference?.trim() || null,
    notes: values.notes?.trim() || '',
  }
}

function registrationTicketDefaults() {
  return {
    ticketStatus: 'no-ticket-assigned',
    ticketCode: null,
    ticketAssignedAt: null,
    ticketAssignedBy: null,
  }
}

function registrationCheckInDefaults() {
  return {
    checkedIn: false,
    checkInTime: null,
    checkedInBy: null,
  }
}

function registrationAttendanceDefaults() {
  return {
    attendanceRecordType: 'none',
    attendanceConfirmedAt: null,
    attendanceConfirmedBy: null,
    attendanceEvidenceNote: '',
  }
}

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

export function subscribeToRegistrations(eventId, onRegistrations, onError) {
  if (!eventId) return () => {}
  const firestore = requireDatabase()
  const registrationsQuery = query(
    collection(firestore, 'registrations'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    registrationsQuery,
    (snapshot) => onRegistrations(snapshot.docs.map((doc) => ({
      ...doc.data(),
      registrationId: doc.data().registrationId || doc.id,
    }))),
    onError,
  )
}

export async function createRegistration(values, eventId, user, event = {}) {
  const firestore = requireDatabase()
  const regRef = doc(collection(firestore, 'registrations'))
  const audit = createAuditLogWrite({
    eventId,
    action: 'registration.create',
    targetType: 'registration',
    targetId: regRef.id,
    performedBy: user,
    details: { fullName: values.fullName?.trim() },
  })
  const batch = writeBatch(firestore)

  batch.set(regRef, {
    registrationId: regRef.id,
    ...registrationPayload(values, eventId, event),
    ...registrationTicketDefaults(),
    ...registrationCheckInDefaults(),
    ...registrationAttendanceDefaults(),
    source: 'manual',
    sourceRowId: null,
    timestamp: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()

  return regRef.id
}

export async function updateRegistration(registrationId, eventId, values, user, _existingRegistration = {}, event = {}) {
  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registrationId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'registration.update',
    targetType: 'registration',
    targetId: registrationId,
    performedBy: user,
    details: { fullName: values.fullName?.trim(), registrationUpdated: true },
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ...registrationPayload(values, eventId, event),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function recordHistoricalAttendance(registration, user, note = '') {
  if (!registration?.registrationId || !registration?.eventId) throw new Error('Registration is required.')
  if (registration.checkedIn) throw new Error('This registration already has a live system check-in.')
  const evidenceNote = String(note || '').trim()
  if (!evidenceNote) throw new Error('Historical attendance requires an evidence note.')

  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'registration.attendance-update',
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: {
      fullName: registration.fullName,
      attendanceRecordType: 'organizer-confirmed-historical',
      previousAttendanceRecordType: registration.attendanceRecordType || 'none',
      note: evidenceNote,
    },
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ...historicalAttendancePayload(evidenceNote, performedBy(user)),
    attendanceConfirmedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function deleteRegistration(registration, user) {
  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'registration.delete',
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: { fullName: registration.fullName },
  })
  const batch = writeBatch(firestore)

  batch.delete(regRef)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function bulkDeleteRegistrations(registrations = [], eventId, user) {
  const scoped = registrations.filter((registration) => registration.eventId === eventId)
  assertEventScopedRecords(registrations, eventId)
  const firestore = requireDatabase()
  const chunkSize = 5
  const manifest = buildOperationManifest({
    operationType: 'registration.bulk-delete',
    eventId,
    user,
    recordIds: scoped.map((registration) => registration.registrationId),
    chunkSize,
  })
  const completedChunks = []

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)
    const chunkIndex = i / chunkSize

    chunk.forEach((registration) => {
      const regRef = doc(firestore, 'registrations', registration.registrationId)
      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.delete',
        targetType: 'registration',
        targetId: registration.registrationId,
        performedBy: user,
        logId: operationAuditLogId(manifest.operationId, chunkIndex, registration.registrationId),
        details: {
          fullName: registration.fullName,
          bulkAction: true,
          operationId: manifest.operationId,
          chunkIndex,
          before: { registrationId: registration.registrationId, eventId: registration.eventId },
          after: null,
        },
      })

      batch.delete(regRef)
      batch.set(audit.ref, audit.data)
    })

    try {
      await batch.commit()
      completedChunks.push({
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
      })
    } catch (err) {
      const result = summarizeBulkOperation(manifest, completedChunks, {
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
        error: err?.message || String(err),
      })
      const error = new Error(result.message)
      error.operationResult = result
      throw error
    }
  }

  return summarizeBulkOperation(manifest, completedChunks)
}

export async function bulkUpdatePaymentStatus(registrations = [], eventId, paymentStatus, user, event = {}) {
  const scoped = registrations.filter((registration) => registration.eventId === eventId)
  assertEventScopedRecords(registrations, eventId)
  const firestore = requireDatabase()
  const nextStatus = assertBulkPaymentStatusAllowed(scoped, paymentStatus, event)
  const chunkSize = 5
  const manifest = buildOperationManifest({
    operationType: 'registration.bulk-payment-status',
    eventId,
    user,
    recordIds: scoped.map((registration) => registration.registrationId),
    chunkSize,
  })
  const completedChunks = []

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)
    const chunkIndex = i / chunkSize

    chunk.forEach((registration) => {
      const regRef = doc(firestore, 'registrations', registration.registrationId)
      const after = { ...registration, paymentStatus: nextStatus }
      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.update',
        targetType: 'registration',
        targetId: registration.registrationId,
        performedBy: user,
        logId: operationAuditLogId(manifest.operationId, chunkIndex, registration.registrationId),
        details: {
          fullName: registration.fullName,
          paymentStatus: nextStatus,
          bulkAction: true,
          operationId: manifest.operationId,
          chunkIndex,
          changes: safeAuditChanges(registration, after, ['paymentStatus']),
        },
      })

      batch.update(regRef, {
        paymentStatus: nextStatus,
        updatedAt: serverTimestamp(),
      })
      batch.set(audit.ref, audit.data)
    })

    try {
      await batch.commit()
      completedChunks.push({
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
      })
    } catch (err) {
      const result = summarizeBulkOperation(manifest, completedChunks, {
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
        error: err?.message || String(err),
      })
      const error = new Error(result.message)
      error.operationResult = result
      throw error
    }
  }

  return summarizeBulkOperation(manifest, completedChunks)
}

export async function bulkUpdateFinanceFields(registrations = [], eventId, updates = {}, user, event = {}) {
  const scoped = registrations.filter((registration) => registration.eventId === eventId)
  assertEventScopedRecords(registrations, eventId)
  const proposed = scoped.map((registration) => ({
    ...registration,
    ...updates,
    paymentStatus: updates.paymentStatus ? normalizePaymentStatus(updates.paymentStatus) : registration.paymentStatus,
    paymentMethod: updates.paymentMethod ? normalizePaymentMethod(updates.paymentMethod) : registration.paymentMethod,
  }))
  if (updates.paymentStatus) assertBulkPaymentStatusAllowed(proposed, updates.paymentStatus, event)
  const firestore = requireDatabase()
  const chunkSize = 5
  const manifest = buildOperationManifest({
    operationType: 'registration.bulk-finance-update',
    eventId,
    user,
    recordIds: scoped.map((registration) => registration.registrationId),
    chunkSize,
  })
  const completedChunks = []

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)
    const chunkIndex = i / chunkSize

    chunk.forEach((registration) => {
      const regRef = doc(firestore, 'registrations', registration.registrationId)
      const values = {
        ...registration,
        ...updates,
        paymentStatus: updates.paymentStatus ? normalizePaymentStatus(updates.paymentStatus) : registration.paymentStatus,
        paymentMethod: updates.paymentMethod ? normalizePaymentMethod(updates.paymentMethod) : registration.paymentMethod,
      }
      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.finance-update',
        targetType: 'registration',
        targetId: registration.registrationId,
        performedBy: user,
        details: {
          fullName: registration.fullName,
          bulkAction: true,
          operationId: manifest.operationId,
          chunkIndex,
          updatedFields: Object.keys(updates).filter((key) => updates[key] !== '' && updates[key] !== null && updates[key] !== undefined).join(','),
          changes: safeAuditChanges(registration, {
            ...registration,
            paymentStatus: normalizePaymentStatus(values.paymentStatus || 'unknown'),
            paymentReference: values.paymentReference?.trim?.() || values.paymentReference || null,
            ...financePayload(values, event),
          }, ['paymentStatus', 'paymentReference', 'priceTier', 'ticketPrice', 'amountDue', 'amountPaid', 'balanceDue', 'paymentMethod']),
        },
        logId: operationAuditLogId(manifest.operationId, chunkIndex, registration.registrationId),
      })

      batch.update(regRef, {
        paymentStatus: normalizePaymentStatus(values.paymentStatus || 'unknown'),
        paymentReference: values.paymentReference?.trim?.() || values.paymentReference || null,
        ...financePayload(values, event),
        updatedAt: serverTimestamp(),
      })
      batch.set(audit.ref, audit.data)
    })

    try {
      await batch.commit()
      completedChunks.push({
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
      })
    } catch (err) {
      const result = summarizeBulkOperation(manifest, completedChunks, {
        chunkIndex,
        recordIds: chunk.map((registration) => registration.registrationId),
        error: err?.message || String(err),
      })
      const error = new Error(result.message)
      error.operationResult = result
      throw error
    }
  }

  return summarizeBulkOperation(manifest, completedChunks)
}
