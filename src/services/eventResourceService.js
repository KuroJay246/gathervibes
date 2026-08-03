import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite, safeAuditChanges } from './auditService.js'
import { normalizeEventResource } from '../utils/eventResources.js'

const AUDIT_FIELDS = [
  'name',
  'category',
  'sourceType',
  'status',
  'quantityNeeded',
  'quantityConfirmed',
  'unit',
  'shortage',
  'location',
  'supplierContactId',
  'supplierOrganizationId',
  'supplierLabel',
  'packingRequired',
  'pickupRequired',
  'returnRequired',
  'pickupDueDate',
  'returnDueDate',
  'notes',
  'linkedTaskId',
  'linkedDocumentIds',
  'linkedOperationId',
  'linkedCommitmentId',
  'linkedRunOfShowItemIds',
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

function resourcesCollection(eventId) {
  return collection(requireDatabase(), 'events', eventId, 'resources')
}

function resourceRef(eventId, resourceId) {
  return doc(requireDatabase(), 'events', eventId, 'resources', resourceId)
}

function auditDetails(before, after, action) {
  return {
    resourceName: after?.name || before?.name || 'Untitled resource',
    action,
    changes: safeAuditChanges(before || {}, after || {}, AUDIT_FIELDS),
  }
}

export function subscribeToEventResources(eventId, onResources, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    resourcesCollection(eventId),
    (snapshot) => {
      const rows = snapshot.docs.map((resourceDocument) => normalizeEventResource({
        ...resourceDocument.data(),
        resourceId: resourceDocument.data().resourceId || resourceDocument.id,
      }))
      rows.sort((left, right) => String(left.category).localeCompare(String(right.category)) || String(left.name).localeCompare(String(right.name)))
      onResources(rows)
    },
    onError,
  )
}

export async function createEventResource(event, values, user) {
  const firestore = requireDatabase()
  const ref = doc(resourcesCollection(event.eventId))
  const payload = stripUndefined({
    ...normalizeEventResource({ ...values, resourceId: ref.id, createdBy: performedBy(user) }, event),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'resource.create',
    targetType: 'resource',
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

export async function updateEventResource(event, existingResource, values, user, action = 'resource.update') {
  const firestore = requireDatabase()
  const existing = normalizeEventResource(existingResource, event)
  const payload = stripUndefined({
    ...normalizeEventResource({ ...existing, ...values }, event, existing),
    createdAt: existingResource.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action,
    targetType: 'resource',
    targetId: existing.resourceId,
    performedBy: user,
    details: auditDetails(existing, { ...existing, ...payload }, action.replace('resource.', '')),
  })
  const batch = writeBatch(firestore)
  batch.update(resourceRef(event.eventId, existing.resourceId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function updateEventResourceStatus(event, resource, status, user) {
  await updateEventResource(event, resource, { status }, user, 'resource.status')
}

export async function deleteEventResource(event, resource, user) {
  const firestore = requireDatabase()
  const existing = normalizeEventResource(resource, event)
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'resource.delete',
    targetType: 'resource',
    targetId: existing.resourceId,
    performedBy: user,
    details: auditDetails(existing, null, 'deleted'),
  })
  const batch = writeBatch(firestore)
  batch.delete(resourceRef(event.eventId, existing.resourceId))
  batch.set(audit.ref, audit.data)
  await batch.commit()
}
