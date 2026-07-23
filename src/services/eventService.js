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
import {
  hydrateEventForPlanning,
  normalizePartnerRecord,
  normalizePlanningTask,
} from '../utils/eventPlanning.js'

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

function toTimestamp(value) {
  if (!value) return null
  return Timestamp.fromDate(new Date(`${value}T12:00:00`))
}

function eventPayload(values) {
  const event = hydrateEventForPlanning(values)
  const payload = {
    eventName: event.eventName.trim(),
    eventDate: Timestamp.fromDate(new Date(`${event.eventDate}T12:00:00`)),
    location: event.location.trim(),
    venueName: event.venueName.trim(),
    eventType: event.eventType,
    status: event.status,
    eventStartTime: event.eventStartTime || '',
    eventEndTime: event.eventEndTime || '',
    eventDescription: event.eventDescription || '',
    capacity: Number(event.capacity),
    ticketPrice: Number(event.ticketPrice),
    registrationRequired: Boolean(event.registrationRequired),
    ticketTypeCount: Number(event.ticketTypeCount) || 1,
    complimentaryAllowed: Boolean(event.complimentaryAllowed),
    doorPaymentAllowed: Boolean(event.doorPaymentAllowed),
    registrationOpenDate: toTimestamp(event.registrationOpenDate),
    registrationCloseDate: toTimestamp(event.registrationCloseDate),
    financialPlan: event.financialPlan,
    operationsPlan: event.operationsPlan,
    readinessChecklist: event.readinessChecklist,
    notes: event.notes.trim(),
  }

  const tiers = normalisePriceTiers(event.priceTiers)
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

async function updateEventDocument(eventId, updates, user, eventName) {
  const firestore = requireDatabase()
  const eventRef = doc(firestore, 'events', eventId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'event.update',
    targetId: eventId,
    performedBy: user,
    details: { eventName },
  })
  const batch = writeBatch(firestore)

  batch.update(eventRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function updateEventPlanningFields(event, updates, user) {
  await updateEventDocument(event.eventId, updates, user, event.eventName)
}

export async function savePlanningTask(event, values, user) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const nextTask = normalizePlanningTask(values)
  const tasks = hydratedEvent.planningTasks.some((task) => task.taskId === nextTask.taskId)
    ? hydratedEvent.planningTasks.map((task) => (task.taskId === nextTask.taskId ? nextTask : task))
    : [...hydratedEvent.planningTasks, nextTask]

  await updateEventDocument(event.eventId, { planningTasks: tasks }, user, event.eventName)
  return nextTask.taskId
}

export async function deletePlanningTask(event, taskId, user) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const tasks = hydratedEvent.planningTasks.filter((task) => task.taskId !== taskId)
  await updateEventDocument(event.eventId, { planningTasks: tasks }, user, event.eventName)
}

export async function savePartnerRecord(event, values, user) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const nextRecord = normalizePartnerRecord(values)
  const partnerRecords = hydratedEvent.partnerRecords.some((record) => record.partnerId === nextRecord.partnerId)
    ? hydratedEvent.partnerRecords.map((record) => (record.partnerId === nextRecord.partnerId ? nextRecord : record))
    : [...hydratedEvent.partnerRecords, nextRecord]

  await updateEventDocument(event.eventId, { partnerRecords }, user, event.eventName)
  return nextRecord.partnerId
}

export async function deletePartnerRecord(event, partnerId, user) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const partnerRecords = hydratedEvent.partnerRecords.filter((record) => record.partnerId !== partnerId)
  await updateEventDocument(event.eventId, { partnerRecords }, user, event.eventName)
}

export async function markPartnerRecordPaid(event, partnerId, paymentPatch, user) {
  const hydratedEvent = hydrateEventForPlanning(event)
  const partnerRecords = hydratedEvent.partnerRecords.map((record) => {
    if (record.partnerId !== partnerId) return record
    return normalizePartnerRecord({
      ...record,
      ...paymentPatch,
      status: 'Paid',
    })
  })

  await updateEventDocument(event.eventId, { partnerRecords }, user, event.eventName)
}
