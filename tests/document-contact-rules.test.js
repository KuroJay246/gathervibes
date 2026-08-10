/* global process */
import { before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'

const EVENT_ID = 'document-contact-event'
const ADMIN_UID = 'document-contact-admin'
const ADMIN_EMAIL = 'document-contact-admin@example.com'
const VIEWER_UID = 'document-contact-viewer'
const VIEWER_EMAIL = 'document-contact-viewer@example.com'
const SCANNER_UID = 'document-contact-scanner'
const SCANNER_EMAIL = 'document-contact-scanner@example.com'
const PROTECTED_OWNER_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
const PROTECTED_OWNER_EMAIL = 'jaylanspencer99@gmail.com'
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST
let emulatorAvailable = false

async function isFirestoreEmulatorAvailable() {
  if (!emulatorHost) return false
  const [host, port] = emulatorHost.split(':')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 750)
  try {
    const response = await fetch(`http://${host}:${port}`, { signal: controller.signal })
    return response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

before(async () => {
  emulatorAvailable = await isFirestoreEmulatorAvailable()
})

function rulesTest(name, fn) {
  test(name, async (t) => {
    if (!emulatorAvailable) {
      t.skip('Firestore emulator is not running')
      return
    }
    await fn()
  })
}

async function createTestEnv() {
  return initializeTestEnvironment({
    projectId: 'gathervibeshub-document-contact-test',
    firestore: {
      host: emulatorHost?.split(':')[0] || '127.0.0.1',
      port: Number(emulatorHost?.split(':')[1] || 8080),
      rules: await readFile('firestore.rules', 'utf8'),
    },
  })
}

function validEvent() {
  return {
    eventId: EVENT_ID,
    eventName: 'Document Contact Event',
    eventDate: serverTimestamp(),
    location: 'Bridgetown',
    venueName: '',
    eventType: 'food-event',
    status: 'planning',
    eventStartTime: '',
    eventEndTime: '',
    eventDescription: '',
    capacity: 50,
    ticketPrice: 100,
    registrationRequired: true,
    ticketTypeCount: 1,
    complimentaryAllowed: false,
    doorPaymentAllowed: true,
    registrationOpenDate: null,
    registrationCloseDate: null,
    eventCapabilities: { publicRegistration: true, ticketing: true, checkIn: true },
    financialPlan: {},
    operationsPlan: {},
    readinessChecklist: {},
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function validDocument(overrides = {}) {
  return {
    documentId: 'doc-ref-1',
    eventId: EVENT_ID,
    eventName: 'Document Contact Event',
    title: 'Venue Agreement',
    category: 'Agreement / Contract',
    description: '',
    status: 'Requested',
    required: true,
    url: 'https://example.com/venue-agreement',
    documentType: 'External Link',
    provider: '',
    storageLocation: '',
    linkedContactId: '',
    linkedOrganizationId: '',
    linkedTaskId: '',
    linkedOperationId: '',
    linkedCommitmentId: '',
    dueDate: '2026-08-15',
    expiryDate: '',
    versionLabel: '',
    notes: '',
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

function validContact(overrides = {}) {
  return {
    contactId: 'contact-1',
    displayName: 'Venue Manager',
    firstName: 'Venue',
    lastName: 'Manager',
    organizationId: '',
    roleTitle: 'Manager',
    category: 'Venue',
    email: 'venue@example.com',
    phone: '+1 246 555 0101',
    phoneNormalized: '12465550101',
    preferredContactMethod: 'Email',
    location: 'Barbados',
    website: '',
    socialLink: '',
    status: 'Active',
    notes: '',
    searchText: 'venue manager venue example com',
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

function validOrganization(overrides = {}) {
  return {
    organizationId: 'organization-1',
    name: 'Venue Co',
    category: 'Venue',
    primaryContactId: 'contact-1',
    email: 'hello@example.com',
    phone: '',
    phoneNormalized: '',
    website: 'https://example.com',
    socialLink: '',
    location: 'Barbados',
    status: 'Active',
    notes: '',
    searchText: 'venue co venue',
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

function validEventContactLink(overrides = {}) {
  return {
    linkId: 'link-1',
    eventId: EVENT_ID,
    eventName: 'Document Contact Event',
    contactId: 'contact-1',
    organizationId: 'organization-1',
    relationshipType: 'Venue contact',
    roleForEvent: 'Venue manager',
    primaryForEvent: true,
    notes: '',
    status: 'Active',
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
    updatedAt: serverTimestamp(),
    updatedBy: ADMIN_EMAIL,
    ...overrides,
  }
}

async function seedBaseData(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (env) => {
    const db = env.firestore()
    await setDoc(doc(db, 'settings', 'accessControl'), { approvedEmails: [ADMIN_EMAIL] })
    await setDoc(doc(db, 'events', EVENT_ID), validEvent())
    await setDoc(doc(db, 'staffProfiles', VIEWER_UID), {
      uid: VIEWER_UID,
      email: VIEWER_EMAIL,
      displayName: 'Viewer',
      status: 'active',
      defaultRole: 'viewer',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'events', EVENT_ID, 'staffAssignments', VIEWER_UID), {
      uid: VIEWER_UID,
      email: VIEWER_EMAIL,
      eventId: EVENT_ID,
      role: 'viewer',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'staffProfiles', SCANNER_UID), {
      uid: SCANNER_UID,
      email: SCANNER_EMAIL,
      displayName: 'Scanner',
      status: 'active',
      defaultRole: 'scanner',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
    await setDoc(doc(db, 'events', EVENT_ID, 'staffAssignments', SCANNER_UID), {
      uid: SCANNER_UID,
      email: SCANNER_EMAIL,
      eventId: EVENT_ID,
      role: 'scanner',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: ADMIN_EMAIL,
      updatedBy: ADMIN_EMAIL,
    })
  })
}

rulesTest('[document-contact-rules] admin can create a document reference with append-only audit', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, 'events', EVENT_ID, 'documents', 'doc-ref-1'), validDocument())
    batch.set(doc(db, 'auditLogs', 'document-audit-1'), {
      logId: 'document-audit-1',
      eventId: EVENT_ID,
      action: 'document.create',
      targetType: 'document',
      targetId: 'doc-ref-1',
      performedBy: ADMIN_EMAIL,
      timestamp: serverTimestamp(),
      details: { title: 'Venue Agreement' },
    })
    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] document URL and scanner access are constrained', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const adminDb = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const scannerDb = testEnv.authenticatedContext(SCANNER_UID, { email: SCANNER_EMAIL }).firestore()
    await assertFails(setDoc(doc(adminDb, 'events', EVENT_ID, 'documents', 'doc-ref-1'), validDocument({ url: 'ftp://example.com/file' })))
    await assertFails(getDocs(collection(scannerDb, 'events', EVENT_ID, 'documents')))
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] admin can create contact directory records and event links with audits', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext(ADMIN_UID, { email: ADMIN_EMAIL }).firestore()
    const contactBatch = writeBatch(db)
    contactBatch.set(doc(db, 'contacts', 'contact-1'), validContact())
    contactBatch.set(doc(db, 'auditLogs', 'contact-audit-1'), {
      logId: 'contact-audit-1',
      eventId: 'global',
      action: 'contact.create',
      targetType: 'contact',
      targetId: 'contact-1',
      performedBy: ADMIN_EMAIL,
      timestamp: serverTimestamp(),
      details: { displayName: 'Venue Manager' },
    })
    await assertSucceeds(contactBatch.commit())

    const organizationBatch = writeBatch(db)
    organizationBatch.set(doc(db, 'organizations', 'organization-1'), validOrganization())
    organizationBatch.set(doc(db, 'auditLogs', 'organization-audit-1'), {
      logId: 'organization-audit-1',
      eventId: 'global',
      action: 'organization.create',
      targetType: 'organization',
      targetId: 'organization-1',
      performedBy: ADMIN_EMAIL,
      timestamp: serverTimestamp(),
      details: { name: 'Venue Co' },
    })
    await assertSucceeds(organizationBatch.commit())

    const linkBatch = writeBatch(db)
    linkBatch.set(doc(db, 'events', EVENT_ID, 'contactLinks', 'link-1'), validEventContactLink())
    linkBatch.set(doc(db, 'auditLogs', 'link-audit-1'), {
      logId: 'link-audit-1',
      eventId: EVENT_ID,
      action: 'contact-link.create',
      targetType: 'contactLink',
      targetId: 'link-1',
      performedBy: ADMIN_EMAIL,
      timestamp: serverTimestamp(),
      details: { relationshipType: 'Venue contact' },
    })
    await assertSucceeds(linkBatch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] viewer can read event links but not global contacts', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    await testEnv.withSecurityRulesDisabled(async (env) => {
      const db = env.firestore()
      await setDoc(doc(db, 'contacts', 'contact-1'), validContact())
      await setDoc(doc(db, 'events', EVENT_ID, 'contactLinks', 'link-1'), validEventContactLink())
    })
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID, { email: VIEWER_EMAIL }).firestore()
    await assertFails(getDocs(collection(viewerDb, 'contacts')))
    await assertSucceeds(getDocs(collection(viewerDb, 'events', EVENT_ID, 'contactLinks')))
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] protected owner can read and normalize-update legacy contacts and organizations without approvedEmails membership', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const createdAt = Timestamp.fromDate(new Date('2026-08-01T12:00:00.000Z'))
    await testEnv.withSecurityRulesDisabled(async (env) => {
      const db = env.firestore()
      await setDoc(doc(db, 'contacts', 'legacy-contact'), {
        ...validContact({ contactId: 'legacy-contact', category: 'event', status: 'active', createdAt, updatedAt: createdAt }),
      })
      await setDoc(doc(db, 'organizations', 'legacy-organization'), {
        ...validOrganization({ organizationId: 'legacy-organization', category: 'supplier', status: 'active', createdAt, updatedAt: createdAt }),
      })
    })
    const db = testEnv.authenticatedContext(PROTECTED_OWNER_UID, { email: PROTECTED_OWNER_EMAIL }).firestore()
    await assertSucceeds(getDocs(collection(db, 'contacts')))
    await assertSucceeds(getDocs(collection(db, 'organizations')))

    const batch = writeBatch(db)
    batch.update(doc(db, 'contacts', 'legacy-contact'), {
      category: 'Other',
      status: 'Active',
      phoneNormalized: '',
      searchText: 'legacy contact',
      updatedAt: serverTimestamp(),
      updatedBy: PROTECTED_OWNER_EMAIL,
    })
    batch.set(doc(db, 'auditLogs', 'legacy-contact-audit'), {
      logId: 'legacy-contact-audit',
      eventId: 'global',
      action: 'contact.update',
      targetType: 'contact',
      targetId: 'legacy-contact',
      performedBy: PROTECTED_OWNER_EMAIL,
      timestamp: serverTimestamp(),
      details: { contactName: 'Venue Manager' },
    })
    batch.update(doc(db, 'organizations', 'legacy-organization'), {
      category: 'Supplier',
      status: 'Active',
      phoneNormalized: '',
      searchText: 'legacy organization',
      updatedAt: serverTimestamp(),
      updatedBy: PROTECTED_OWNER_EMAIL,
    })
    batch.set(doc(db, 'auditLogs', 'legacy-organization-audit'), {
      logId: 'legacy-organization-audit',
      eventId: 'global',
      action: 'organization.update',
      targetType: 'organization',
      targetId: 'legacy-organization',
      performedBy: PROTECTED_OWNER_EMAIL,
      timestamp: serverTimestamp(),
      details: { organizationName: 'Venue Co' },
    })
    await assertSucceeds(batch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] protected owner can create and unlink event contact relationships with append-only audit', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    await testEnv.withSecurityRulesDisabled(async (env) => {
      const db = env.firestore()
      await setDoc(doc(db, 'contacts', 'contact-1'), validContact())
      await setDoc(doc(db, 'organizations', 'organization-1'), validOrganization())
    })
    const db = testEnv.authenticatedContext(PROTECTED_OWNER_UID, { email: PROTECTED_OWNER_EMAIL }).firestore()
    const createBatch = writeBatch(db)
    createBatch.set(doc(db, 'events', EVENT_ID, 'contactLinks', 'owner-link-1'), validEventContactLink({ linkId: 'owner-link-1', createdBy: PROTECTED_OWNER_EMAIL, updatedBy: PROTECTED_OWNER_EMAIL }))
    createBatch.set(doc(db, 'auditLogs', 'owner-link-create-audit'), {
      logId: 'owner-link-create-audit',
      eventId: EVENT_ID,
      action: 'contact-link.create',
      targetType: 'contactLink',
      targetId: 'owner-link-1',
      performedBy: PROTECTED_OWNER_EMAIL,
      timestamp: serverTimestamp(),
      details: { relationshipType: 'Venue contact' },
    })
    await assertSucceeds(createBatch.commit())

    const deleteBatch = writeBatch(db)
    deleteBatch.delete(doc(db, 'events', EVENT_ID, 'contactLinks', 'owner-link-1'))
    deleteBatch.set(doc(db, 'auditLogs', 'owner-link-delete-audit'), {
      logId: 'owner-link-delete-audit',
      eventId: EVENT_ID,
      action: 'contact-link.delete',
      targetType: 'contactLink',
      targetId: 'owner-link-1',
      performedBy: PROTECTED_OWNER_EMAIL,
      timestamp: serverTimestamp(),
      details: { relationshipType: 'Venue contact' },
    })
    await assertSucceeds(deleteBatch.commit())
  } finally {
    await testEnv.cleanup()
  }
})

rulesTest('[document-contact-rules] unauthorized users cannot write contacts, organizations, or event relationships', async () => {
  const testEnv = await createTestEnv()
  try {
    await seedBaseData(testEnv)
    const db = testEnv.authenticatedContext('stranger', { email: 'stranger@example.com' }).firestore()
    await assertFails(setDoc(doc(db, 'contacts', 'bad-contact'), validContact({ contactId: 'bad-contact' })))
    await assertFails(setDoc(doc(db, 'organizations', 'bad-organization'), validOrganization({ organizationId: 'bad-organization' })))
    await assertFails(setDoc(doc(db, 'events', EVENT_ID, 'contactLinks', 'bad-link'), validEventContactLink({ linkId: 'bad-link' })))
  } finally {
    await testEnv.cleanup()
  }
})
