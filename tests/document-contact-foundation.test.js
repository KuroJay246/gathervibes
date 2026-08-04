import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { PROTECTED_OWNER_EMAIL, PROTECTED_OWNER_UID } from '../src/config/protectedOwner.js'
import { canViewRoute, getUserAccessLevel } from '../src/utils/accessRoles.js'
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  buildDocumentSummary,
  documentTaskPrefill,
  effectiveDocumentStatus,
  externalHostname,
  filterDocuments,
  normalizeDocumentRecord,
  normalizeExternalUrl,
} from '../src/utils/documentRegistry.js'
import {
  CONTACT_CATEGORIES,
  createEmptyRelationshipDraft,
  filterContacts,
  findContactDuplicateCandidates,
  normalizePhone,
} from '../src/utils/contactDirectory.js'
import { qrPayloadForTicketCode } from '../src/utils/qrTicketUtils.js'

test('Document Register route and copy preserve no-file-upload boundary', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const page = await readFile('src/pages/DocumentsPage.jsx', 'utf8')

  assert.match(app, /path="\/documents"/)
  assert.match(shell, /to: '\/documents', label: 'Documents'/)
  assert.match(page, /No file is uploaded/)
  assert.match(page, /metadata and links only/)
  assert.doesNotMatch(page, /Firebase Storage|uploadBytes|getStorage|storageBucket|input type="file"/i)
})

test('document helpers validate URL, categories, statuses, required state, expiry, and task prefill', () => {
  const event = { eventId: 'event-1', eventName: 'Event One' }
  const record = normalizeDocumentRecord({
    title: 'Venue Agreement',
    category: 'Agreement / Contract',
    status: 'Requested',
    required: true,
    url: 'https://drive.google.com/file/d/abc',
    documentType: 'Google Drive',
    expiryDate: '2026-08-20',
  }, event)
  const documents = [
    record,
    { ...record, documentId: 'receipt', title: 'Receipt', required: false, status: 'Received', expiryDate: '' },
    { ...record, documentId: 'old', title: 'Old permit', status: 'Current', expiryDate: '2026-01-01' },
  ]

  assert.ok(DOCUMENT_CATEGORIES.includes('Permit / Licence'))
  assert.ok(DOCUMENT_STATUSES.includes('Not Required'))
  assert.equal(normalizeExternalUrl('ftp://example.test/file'), '')
  assert.equal(externalHostname(record.url), 'drive.google.com')
  assert.equal(effectiveDocumentStatus(record, new Date('2026-08-02T12:00:00Z')), 'Expiring Soon')
  assert.equal(filterDocuments(documents, 'Missing / Needed').length, 1)
  assert.equal(filterDocuments(documents, 'Expired').length, 1)
  assert.deepEqual(buildDocumentSummary(documents), { total: 3, required: 2, missingRequired: 1, expiringSoon: 1, expired: 1 })
  assert.match(documentTaskPrefill(record).title, /Follow up on Venue Agreement/)
})

test('Contacts route supports reusable contacts, organizations, event relationships, and duplicate suggestions without auto-merge', async () => {
  const app = await readFile('src/App.jsx', 'utf8')
  const shell = await readFile('src/layout/AppShell.jsx', 'utf8')
  const page = await readFile('src/pages/ContactsPage.jsx', 'utf8')

  const contacts = [{ contactId: 'c1', displayName: 'Sky Manager', email: 'sky@example.com', phoneNormalized: '12465550101', category: 'Venue', organizationId: 'o1', status: 'Active', searchText: 'sky manager sky example com venue' }]
  const organizations = [{ organizationId: 'o1', name: 'Sky Mall', category: 'Venue', searchText: 'sky mall venue' }]
  const duplicates = findContactDuplicateCandidates({ email: 'sky@example.com', phone: '(246) 555-0101', name: 'Sky Mall' }, contacts, organizations)

  assert.match(app, /path="\/contacts"/)
  assert.match(shell, /to: '\/contacts', label: 'Contacts & Organizations'/)
  assert.match(page, /These records do not grant app access/)
  assert.match(page, /does not give app access and does not change Tasks, Documents, Run of Show, or money records/)
  assert.match(page, /Possible Existing Contact/)
  assert.match(page, /does not auto-merge/)
  assert.ok(CONTACT_CATEGORIES.includes('Government / Institution'))
  assert.equal(normalizePhone('(246) 555-0101'), '2465550101')
  assert.equal(duplicates.contacts.length, 1)
  assert.equal(duplicates.organizations.length, 1)
  assert.equal(filterContacts(contacts, organizations, { search: 'Sky Mall', category: 'All', status: 'All' }).length, 1)
  assert.equal(createEmptyRelationshipDraft().relationshipType, 'Other')
})

test('route access keeps scanner isolated while allowing document event-scope roles', () => {
  const admin = { level: 'admin', role: 'admin' }
  const scanner = { level: 'staff', role: 'scanner', assignmentsByEvent: { event: { eventId: 'event', role: 'scanner' } } }
  const eventManager = { level: 'staff', role: 'event-manager', assignmentsByEvent: { event: { eventId: 'event', role: 'event-manager' } } }
  const viewer = { level: 'staff', role: 'viewer', assignmentsByEvent: { event: { eventId: 'event', role: 'viewer' } } }
  const operationsHelper = { level: 'staff', role: 'operations-helper', assignmentsByEvent: { event: { eventId: 'event', role: 'operations-helper' } } }

  assert.equal(canViewRoute(admin, '/contacts'), true)
  assert.equal(canViewRoute(admin, '/documents'), true)
  assert.equal(canViewRoute(eventManager, '/documents'), true)
  assert.equal(canViewRoute(viewer, '/documents'), true)
  assert.equal(canViewRoute(scanner, '/documents'), false)
  assert.equal(canViewRoute(scanner, '/contacts'), false)
  assert.equal(canViewRoute(operationsHelper, '/contacts'), false)
})

test('protected owner keeps admin approval across new document and contact routes', () => {
  const owner = getUserAccessLevel(
    { uid: PROTECTED_OWNER_UID, email: PROTECTED_OWNER_EMAIL },
    { approvedEmails: [] },
  )

  assert.equal(owner.level, 'admin')
  assert.equal(owner.role, 'owner-admin')
  assert.equal(owner.protectedOwner, true)
  assert.equal(canViewRoute(owner, '/documents'), true)
  assert.equal(canViewRoute(owner, '/contacts'), true)
})

test('Document and contact services use batched audit logs and keep storage, messaging, and QR guardrails', async () => {
  const documentService = await readFile('src/services/documentService.js', 'utf8')
  const contactService = await readFile('src/services/contactService.js', 'utf8')
  const operationsService = await readFile('src/services/operationsLedgerService.js', 'utf8')
  const communications = await readFile('src/pages/CommunicationsPage.jsx', 'utf8')
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'))

  assert.match(documentService, /writeBatch/)
  assert.match(documentService, /document\.create/)
  assert.match(documentService, /document\.status/)
  assert.match(documentService, /document\.delete/)
  assert.match(contactService, /contact\.create/)
  assert.match(contactService, /organization\.create/)
  assert.match(contactService, /contact-link\.create/)
  assert.match(operationsService, /linkedContactId/)
  assert.match(operationsService, /linkedOrganizationId/)
  assert.match(operationsService, /linkedDocumentId/)
  assert.match(communications, /No message is sent automatically/)
  assert.doesNotMatch(`${documentService}\n${contactService}\n${communications}`, /sendEmail|sendWhatsapp|sendSms|uploadBytes|getStorage/i)
  assert.equal(qrPayloadForTicketCode('DOC-001'), 'GSV:TICKET:DOC-001')
  assert.equal(packageJson.dependencies.xlsx, undefined)
  assert.equal(packageJson.dependencies['read-excel-file'], '^9.2.0')
})

test('Firestore rules cover new document/contact paths with validators and scanner denial by omission', async () => {
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(rules, /match \/events\/\{eventId\}\/documents\/\{documentId\}/)
  assert.match(rules, /function validDocumentRecord/)
  assert.match(rules, /validDocumentRecord\(request\.resource\.data, eventId, documentId\)/)
  assert.match(rules, /match \/contacts\/\{contactId\}/)
  assert.match(rules, /function validContactRecord/)
  assert.match(rules, /match \/organizations\/\{organizationId\}/)
  assert.match(rules, /function validOrganizationRecord/)
  assert.match(rules, /match \/events\/\{eventId\}\/contactLinks\/\{linkId\}/)
  assert.match(rules, /function validEventContactLink/)
  assert.match(rules, /document\.create/)
  assert.match(rules, /contact-link\.update/)
  assert.doesNotMatch(rules.slice(rules.indexOf('match /events/{eventId}/documents/{documentId}'), rules.indexOf('match /contacts/{contactId}')), /isAssignedScanner/)
  assert.doesNotMatch(rules.slice(rules.indexOf('match /contacts/{contactId}'), rules.indexOf('match /organizations/{organizationId}')), /isSignedIn\(\)/)
})
