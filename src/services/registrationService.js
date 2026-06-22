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

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function registrationPayload(values, eventId) {
  return {
    eventId,
    fullName: values.fullName?.trim() || '',
    email: values.email?.trim().toLowerCase() || null,
    phone: values.phone?.trim() || null,
    groupName: values.groupName?.trim() || null,
    personsAttending: Number(values.personsAttending) || 1,
    paymentStatus: values.paymentStatus || 'unknown',
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

export async function createRegistration(values, eventId, user) {
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
    ...registrationPayload(values, eventId),
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

export async function updateRegistration(registrationId, eventId, values, user, existingRegistration = {}) {
  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registrationId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'registration.update',
    targetType: 'registration',
    targetId: registrationId,
    performedBy: user,
    details: { fullName: values.fullName?.trim() },
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ...registrationPayload(values, eventId),
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
