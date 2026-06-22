import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite } from './auditService.js'
import {
  canCompleteCheckIn,
  normalizeTicketCode,
  ticketStatusForCode,
  validateTicketCode,
} from '../utils/ticketUtils.js'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

export function buildTicketAuditDetails(registration, ticketCode) {
  return {
    fullName: registration.fullName,
    ticketCode: ticketCode || null,
    previousTicketCode: registration.ticketCode || null,
  }
}

export async function saveTicketAssignment(registration, ticketCode, existingRegistrations, user, action = 'ticket.assign') {
  const firestore = requireDatabase()
  const code = normalizeTicketCode(ticketCode)
  const validationError = validateTicketCode(code, existingRegistrations, registration.registrationId)

  if (validationError) throw new Error(validationError)

  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action,
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: buildTicketAuditDetails(registration, code),
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ticketStatus: ticketStatusForCode(code),
    ticketCode: code,
    ticketAssignedAt: serverTimestamp(),
    ticketAssignedBy: performedBy(user),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function clearTicketAssignment(registration, user) {
  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'ticket.unassign',
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: buildTicketAuditDetails(registration, null),
  })
  const batch = writeBatch(firestore)

  batch.update(regRef, {
    ticketStatus: 'no-ticket-assigned',
    ticketCode: null,
    ticketAssignedAt: null,
    ticketAssignedBy: null,
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export function buildCheckInAuditDetails(registration) {
  return {
    fullName: registration.fullName,
    ticketCode: registration.ticketCode || null,
    paymentStatus: registration.paymentStatus,
  }
}

export async function completeCheckIn(registration, user) {
  const allowed = canCompleteCheckIn(registration)
  if (!allowed.allowed) throw new Error(allowed.reason)

  const firestore = requireDatabase()
  const regRef = doc(firestore, 'registrations', registration.registrationId)
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'checkin.complete',
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: buildCheckInAuditDetails(registration),
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
}

export async function recordDuplicateCheckInAttempt(registration, user) {
  const firestore = requireDatabase()
  const audit = createAuditLogWrite({
    eventId: registration.eventId,
    action: 'checkin.duplicate-attempt',
    targetType: 'registration',
    targetId: registration.registrationId,
    performedBy: user,
    details: buildCheckInAuditDetails(registration),
  })
  const batch = writeBatch(firestore)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}
