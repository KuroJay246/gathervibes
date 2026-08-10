import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite, safeAuditChanges } from './auditService.js'
import { contactPayload, organizationPayload, relationshipPayload } from '../utils/contactDirectory.js'

const CONTACT_AUDIT_FIELDS = ['displayName', 'firstName', 'lastName', 'organizationId', 'roleTitle', 'category', 'email', 'phone', 'preferredContactMethod', 'location', 'website', 'socialLink', 'status', 'notes']
const ORGANIZATION_AUDIT_FIELDS = ['name', 'category', 'primaryContactId', 'email', 'phone', 'website', 'socialLink', 'location', 'status', 'notes']
const RELATIONSHIP_AUDIT_FIELDS = ['contactId', 'organizationId', 'relationshipType', 'roleForEvent', 'status', 'primaryForEvent', 'notes']

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

function contactsCollection() {
  return collection(requireDatabase(), 'contacts')
}

function organizationsCollection() {
  return collection(requireDatabase(), 'organizations')
}

function contactLinksCollection(eventId) {
  return collection(requireDatabase(), 'events', eventId, 'contactLinks')
}

export function subscribeToContacts(onContacts, onError) {
  return onSnapshot(
    contactsCollection(),
    (snapshot) => {
      const rows = snapshot.docs.map((contactDocument) => ({ ...contactDocument.data(), contactId: contactDocument.data().contactId || contactDocument.id }))
      rows.sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')))
      onContacts(rows)
    },
    onError,
  )
}

export function subscribeToOrganizations(onOrganizations, onError) {
  return onSnapshot(
    organizationsCollection(),
    (snapshot) => {
      const rows = snapshot.docs.map((organizationDocument) => ({ ...organizationDocument.data(), organizationId: organizationDocument.data().organizationId || organizationDocument.id }))
      rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      onOrganizations(rows)
    },
    onError,
  )
}

export function subscribeToEventContactLinks(eventId, onLinks, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    contactLinksCollection(eventId),
    (snapshot) => onLinks(snapshot.docs.map((linkDocument) => ({ ...linkDocument.data(), linkId: linkDocument.data().linkId || linkDocument.id }))),
    onError,
  )
}

export async function createContact(values, user) {
  const firestore = requireDatabase()
  const ref = doc(contactsCollection())
  const payload = stripUndefined({
    ...contactPayload({ ...values, contactId: ref.id, createdBy: performedBy(user) }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: 'global',
    action: 'contact.create',
    targetType: 'contact',
    targetId: ref.id,
    performedBy: user,
    details: { contactName: payload.displayName, changes: safeAuditChanges({}, payload, CONTACT_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.set(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return ref.id
}

export async function updateContact(existing, values, user, action = 'contact.update') {
  const firestore = requireDatabase()
  const payload = stripUndefined({
    ...contactPayload({ ...existing, ...values }, existing),
    createdAt: existing.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: 'global',
    action,
    targetType: 'contact',
    targetId: existing.contactId,
    performedBy: user,
    details: { contactName: payload.displayName, changes: safeAuditChanges(existing, { ...existing, ...payload }, CONTACT_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.update(doc(requireDatabase(), 'contacts', existing.contactId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function createOrganization(values, user) {
  const firestore = requireDatabase()
  const ref = doc(organizationsCollection())
  const payload = stripUndefined({
    ...organizationPayload({ ...values, organizationId: ref.id, createdBy: performedBy(user) }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: 'global',
    action: 'organization.create',
    targetType: 'organization',
    targetId: ref.id,
    performedBy: user,
    details: { organizationName: payload.name, changes: safeAuditChanges({}, payload, ORGANIZATION_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.set(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return ref.id
}

export async function updateOrganization(existing, values, user, action = 'organization.update') {
  const firestore = requireDatabase()
  const payload = stripUndefined({
    ...organizationPayload({ ...existing, ...values }, existing),
    createdAt: existing.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: 'global',
    action,
    targetType: 'organization',
    targetId: existing.organizationId,
    performedBy: user,
    details: { organizationName: payload.name, changes: safeAuditChanges(existing, { ...existing, ...payload }, ORGANIZATION_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.update(doc(requireDatabase(), 'organizations', existing.organizationId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function createEventContactLink(event, values, user) {
  const firestore = requireDatabase()
  const ref = doc(contactLinksCollection(event.eventId))
  const payload = stripUndefined({
    ...relationshipPayload({ ...values, linkId: ref.id, createdBy: performedBy(user) }, event),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'contact-link.create',
    targetType: 'contactLink',
    targetId: ref.id,
    performedBy: user,
    details: { relationshipType: payload.relationshipType, changes: safeAuditChanges({}, payload, RELATIONSHIP_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.set(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return ref.id
}

export async function updateEventContactLink(event, existing, values, user) {
  const firestore = requireDatabase()
  const payload = stripUndefined({
    ...relationshipPayload({ ...existing, ...values }, event, existing),
    createdAt: existing.createdAt,
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
  })
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'contact-link.update',
    targetType: 'contactLink',
    targetId: existing.linkId,
    performedBy: user,
    details: { relationshipType: payload.relationshipType, changes: safeAuditChanges(existing, { ...existing, ...payload }, RELATIONSHIP_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.update(doc(requireDatabase(), 'events', event.eventId, 'contactLinks', existing.linkId), payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function deleteEventContactLink(event, link, user) {
  const firestore = requireDatabase()
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'contact-link.delete',
    targetType: 'contactLink',
    targetId: link.linkId,
    performedBy: user,
    details: { relationshipType: link.relationshipType, changes: safeAuditChanges(link, {}, RELATIONSHIP_AUDIT_FIELDS) },
  })
  const batch = writeBatch(firestore)
  batch.delete(doc(requireDatabase(), 'events', event.eventId, 'contactLinks', link.linkId))
  batch.set(audit.ref, audit.data)
  await batch.commit()
}
