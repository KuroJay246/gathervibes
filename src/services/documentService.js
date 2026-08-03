import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite, safeAuditChanges } from './auditService.js'
import { normalizeDocumentRecord } from '../utils/documentRegistry.js'

const AUDIT_FIELDS = [
  'title',
  'category',
  'description',
  'status',
  'required',
  'url',
  'documentType',
  'provider',
  'storageLocation',
  'linkedContactId',
  'linkedOrganizationId',
  'linkedTaskId',
  'linkedOperationId',
  'linkedCommitmentId',
  'dueDate',
  'expiryDate',
  'versionLabel',
  'notes',
]

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

function removeUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function documentCollection(eventId) {
  return collection(requireDatabase(), 'events', eventId, 'documents')
}

function documentRef(eventId, documentId) {
  return doc(requireDatabase(), 'events', eventId, 'documents', documentId)
}

function auditDetails(before, after, action) {
  return {
    documentTitle: after?.title || before?.title || 'Untitled document',
    action,
    changes: safeAuditChanges(before || {}, after || {}, AUDIT_FIELDS),
  }
}

export function subscribeToDocuments(eventId, onDocuments, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    documentCollection(eventId),
    (snapshot) => {
      const rows = snapshot.docs.map((documentSnapshot) => ({
        ...documentSnapshot.data(),
        documentId: documentSnapshot.data().documentId || documentSnapshot.id,
      }))
      rows.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
      onDocuments(rows)
    },
    onError,
  )
}

export async function createDocumentReference(event, values, user) {
  const firestore = requireDatabase()
  const ref = doc(documentCollection(event.eventId))
  const payload = removeUndefined({
    ...normalizeDocumentRecord({ ...values, documentId: ref.id, createdBy: performedBy(user) }, event),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'document.create',
    targetType: 'document',
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

export async function updateDocumentReference(event, existingDocument, values, user, action = 'document.update') {
  const firestore = requireDatabase()
  const payload = removeUndefined({
    ...normalizeDocumentRecord({ ...existingDocument, ...values }, event, existingDocument),
    createdAt: existingDocument.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action,
    targetType: 'document',
    targetId: existingDocument.documentId,
    performedBy: user,
    details: auditDetails(existingDocument, { ...existingDocument, ...payload }, action.replace('document.', '')),
  })
  const batch = writeBatch(firestore)
  batch.update(documentRef(event.eventId, existingDocument.documentId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function updateDocumentStatus(event, documentRecord, status, user) {
  await updateDocumentReference(event, documentRecord, { status }, user, 'document.status')
}

export async function deleteDocumentReference(event, documentRecord, user) {
  const firestore = requireDatabase()
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'document.delete',
    targetType: 'document',
    targetId: documentRecord.documentId,
    performedBy: user,
    details: auditDetails(documentRecord, null, 'deleted'),
  })
  const batch = writeBatch(firestore)
  batch.delete(documentRef(event.eventId, documentRecord.documentId))
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

