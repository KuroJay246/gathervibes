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

function existingTicketFields(registration = {}) {
  return {
    ticketStatus: registration.ticketStatus || 'no-ticket-assigned',
    ticketCode: registration.ticketCode || null,
    ticketAssignedAt: registration.ticketAssignedAt || null,
    ticketAssignedBy: registration.ticketAssignedBy || null,
  }
}

function existingCheckInFields(registration = {}) {
  return {
    checkedIn: Boolean(registration.checkedIn),
    checkInTime: registration.checkInTime || null,
    checkedInBy: registration.checkedInBy || null,
  }
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

export async function updateRegistration(registrationId, eventId, values, user, existingRegistration = {}, event = {}) {
  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registrationId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'registration.finance-update',
    targetType: 'registration',
    targetId: registrationId,
    performedBy: user,
    details: { fullName: values.fullName?.trim(), financeFieldsUpdated: true },
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ...registrationPayload(values, eventId, event),
    ...existingTicketFields(existingRegistration),
    ...existingCheckInFields(existingRegistration),
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
  const firestore = requireDatabase()
  const chunkSize = 5

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)

    chunk.forEach((registration) => {
      const regRef = doc(firestore, 'registrations', registration.registrationId)
      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.delete',
        targetType: 'registration',
        targetId: registration.registrationId,
        performedBy: user,
        details: { fullName: registration.fullName, bulkAction: true },
      })

      batch.delete(regRef)
      batch.set(audit.ref, audit.data)
    })

    await batch.commit()
  }
}

export async function bulkUpdatePaymentStatus(registrations = [], eventId, paymentStatus, user) {
  const scoped = registrations.filter((registration) => registration.eventId === eventId)
  const firestore = requireDatabase()
  const nextStatus = normalizePaymentStatus(paymentStatus)
  const chunkSize = 5

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)

    chunk.forEach((registration) => {
      const regRef = doc(firestore, 'registrations', registration.registrationId)
      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.update',
        targetType: 'registration',
        targetId: registration.registrationId,
        performedBy: user,
        details: { fullName: registration.fullName, paymentStatus: nextStatus, bulkAction: true },
      })

      batch.update(regRef, {
        paymentStatus: nextStatus,
        updatedAt: serverTimestamp(),
      })
      batch.set(audit.ref, audit.data)
    })

    await batch.commit()
  }
}

export async function bulkUpdateFinanceFields(registrations = [], eventId, updates = {}, user, event = {}) {
  const scoped = registrations.filter((registration) => registration.eventId === eventId)
  const firestore = requireDatabase()
  const chunkSize = 5

  for (let i = 0; i < scoped.length; i += chunkSize) {
    const batch = writeBatch(firestore)
    const chunk = scoped.slice(i, i + chunkSize)

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
          updatedFields: Object.keys(updates).filter((key) => updates[key] !== '' && updates[key] !== null && updates[key] !== undefined).join(','),
        },
      })

      batch.update(regRef, {
        paymentStatus: normalizePaymentStatus(values.paymentStatus || 'unknown'),
        paymentReference: values.paymentReference?.trim?.() || values.paymentReference || null,
        ...financePayload(values, event),
        updatedAt: serverTimestamp(),
      })
      batch.set(audit.ref, audit.data)
    })

    await batch.commit()
  }
}
