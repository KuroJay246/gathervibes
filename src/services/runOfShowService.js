import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite, safeAuditChanges } from './auditService.js'
import { normalizeRunOfShowItem, sortRunOfShowItems } from '../utils/runOfShow.js'

const AUDIT_FIELDS = [
  'title',
  'category',
  'date',
  'startTime',
  'endTime',
  'sequence',
  'location',
  'status',
  'description',
  'notes',
  'responsibleStaffUid',
  'responsibleContactId',
  'responsibleOrganizationId',
  'responsibleLabel',
  'expectedArrivalTime',
  'actualArrivalTime',
  'arrivalStatus',
  'arrivalNote',
  'linkedTaskId',
  'linkedDocumentIds',
  'linkedResourceIds',
  'dependencyItemIds',
  'delayReason',
  'criticalForEvent',
]

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function itemsCollection(eventId) {
  return collection(requireDatabase(), 'events', eventId, 'runOfShow')
}

function itemRef(eventId, itemId) {
  return doc(requireDatabase(), 'events', eventId, 'runOfShow', itemId)
}

function auditDetails(before, after, action) {
  return {
    itemTitle: after?.title || before?.title || 'Untitled timeline item',
    action,
    changes: safeAuditChanges(before || {}, after || {}, AUDIT_FIELDS),
  }
}

export function subscribeToRunOfShow(eventId, onItems, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    itemsCollection(eventId),
    (snapshot) => {
      const rows = snapshot.docs.map((itemDocument) => normalizeRunOfShowItem({
        ...itemDocument.data(),
        itemId: itemDocument.data().itemId || itemDocument.id,
      }))
      onItems(sortRunOfShowItems(rows))
    },
    onError,
  )
}

export async function createRunOfShowItem(event, values, user) {
  const firestore = requireDatabase()
  const ref = doc(itemsCollection(event.eventId))
  const payload = stripUndefined({
    ...normalizeRunOfShowItem({ ...values, itemId: ref.id, createdBy: performedBy(user) }, event),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'run-of-show.create',
    targetType: 'runOfShow',
    targetId: ref.id,
    performedBy: user,
    details: auditDetails(null, payload, 'created'),
  })
  const batch = writeBatch(firestore)
  batch.set(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return ref.id
}

export async function updateRunOfShowItem(event, existingItem, values, user, action = 'run-of-show.update') {
  const firestore = requireDatabase()
  const existing = normalizeRunOfShowItem(existingItem, event)
  const payload = stripUndefined({
    ...normalizeRunOfShowItem({ ...existing, ...values }, event, existing),
    createdAt: existingItem.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action,
    targetType: 'runOfShow',
    targetId: existing.itemId,
    performedBy: user,
    details: auditDetails(existing, { ...existing, ...payload }, action.replace('run-of-show.', '')),
  })
  const batch = writeBatch(firestore)
  batch.update(itemRef(event.eventId, existing.itemId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function updateRunOfShowStatus(event, item, status, user, values = {}) {
  await updateRunOfShowItem(event, item, { ...values, status }, user, status === 'Delayed' ? 'run-of-show.delayed' : 'run-of-show.status')
}

export async function deleteRunOfShowItem(event, item, user) {
  const firestore = requireDatabase()
  const existing = normalizeRunOfShowItem(item, event)
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'run-of-show.delete',
    targetType: 'runOfShow',
    targetId: existing.itemId,
    performedBy: user,
    details: auditDetails(existing, null, 'deleted'),
  })
  const batch = writeBatch(firestore)
  batch.delete(itemRef(event.eventId, existing.itemId))
  batch.set(audit.ref, audit.data)
  await batch.commit()
}
