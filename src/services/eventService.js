import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { createAuditLogWrite } from './auditService'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

/**
 * Normalise priceTiers from form state into a clean array for Firestore.
 * Returns undefined when no tiers are present so the field is omitted.
 */
function normalisePriceTiers(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) return undefined
  return tiers.map((tier) => ({
    name: tier.name.trim(),
    price: Number(tier.price),
    status: tier.status || 'active',
  }))
}

function eventPayload(values) {
  const payload = {
    eventName: values.eventName.trim(),
    eventDate: Timestamp.fromDate(new Date(`${values.eventDate}T12:00:00`)),
    location: values.location.trim(),
    eventType: values.eventType,
    status: values.status,
    capacity: Number(values.capacity),
    ticketPrice: Number(values.ticketPrice),
    notes: values.notes.trim(),
  }

  const tiers = normalisePriceTiers(values.priceTiers)
  if (tiers !== undefined) payload.priceTiers = tiers

  return payload
}

export function subscribeToEvents(onEvents, onError) {
  const firestore = requireDatabase()
  const eventsQuery = query(collection(firestore, 'events'), orderBy('eventDate', 'asc'))

  return onSnapshot(
    eventsQuery,
    (snapshot) => onEvents(snapshot.docs.map((eventDocument) => ({
      ...eventDocument.data(),
      eventId: eventDocument.data().eventId || eventDocument.id,
    }))),
    onError,
  )
}

export async function createEvent(values, user) {
  const firestore = requireDatabase()
  const eventRef = doc(collection(firestore, 'events'))
  const audit = createAuditLogWrite({
    eventId: eventRef.id,
    action: 'event.create',
    targetId: eventRef.id,
    performedBy: user,
    details: { eventName: values.eventName.trim() },
  })
  const batch = writeBatch(firestore)

  batch.set(eventRef, {
    eventId: eventRef.id,
    ...eventPayload(values),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()

  return eventRef.id
}

export async function updateEvent(eventId, values, user) {
  const firestore = requireDatabase()
  const eventRef = doc(firestore, 'events', eventId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'event.update',
    targetId: eventId,
    performedBy: user,
    details: { eventName: values.eventName.trim() },
  })
  const batch = writeBatch(firestore)

  const payload = eventPayload(values)

  // When priceTiers is not present in the new values (user removed all tiers),
  // explicitly delete the field so stale tiers don't linger.
  if (normalisePriceTiers(values.priceTiers) === undefined) {
    payload.priceTiers = null
  }

  batch.update(eventRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function deleteEvent(event, user) {
  const firestore = requireDatabase()
  const eventRef = doc(firestore, 'events', event.eventId)
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'event.delete',
    targetId: event.eventId,
    performedBy: user,
    details: { eventName: event.eventName },
  })
  const batch = writeBatch(firestore)

  batch.delete(eventRef)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}
