/* global process, console */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import {
  CODEX_DEMO_EVENT_ID,
  CODEX_DEMO_EVENT_NAME,
  CODEX_DEMO_NOTES,
  RETIRED_CODEX_TEST_EVENT_ID,
  RETIRED_CODEX_TEST_EVENT_NAME,
} from '../../src/utils/demoEvent.js';

const projectId = 'gathervibeshub';
const retiredEventId = RETIRED_CODEX_TEST_EVENT_ID;
const retiredEventName = RETIRED_CODEX_TEST_EVENT_NAME;
const cpbEventId = 'zhaPxi31cpqLAW0cuS20';
const demoEventId = CODEX_DEMO_EVENT_ID;
const demoEventName = CODEX_DEMO_EVENT_NAME;
const performedBy = 'codex-demo-maintenance-script';
const evidenceDir = 'C:\\Users\\Jaylan\\Desktop\\GSV_CODEX_DEMO_MIGRATION';

const eventScopedRootCollections = ['registrations', 'operationsLedger'];
const eventSubcollections = ['contactLinks', 'documents', 'resources', 'runOfShow', 'tasks', 'staffAssignments'];

function nowTimestamp() {
  return Timestamp.now();
}

function serverNow() {
  return FieldValue.serverTimestamp();
}

function ensureSafeDeleteSet(records) {
  const unsafe = records.filter((record) => record.eventId === cpbEventId || record.path.includes(cpbEventId));
  if (unsafe.length > 0) throw new Error(`Refusing to touch CPB records: ${unsafe.map((record) => record.path).join(', ')}`);
}

function auditData({ eventId, action, targetType, targetId, details }) {
  return {
    logId: undefined,
    eventId,
    action,
    targetType,
    targetId,
    performedBy,
    timestamp: serverNow(),
    details,
  };
}

async function collectRootEventRecords(db, eventId) {
  const records = [];
  for (const collectionName of eventScopedRootCollections) {
    const snapshot = await db.collection(collectionName).where('eventId', '==', eventId).get();
    snapshot.docs.forEach((doc) => records.push({
      path: `${collectionName}/${doc.id}`,
      eventId,
      ref: doc.ref,
      data: doc.data(),
    }));
  }
  return records;
}

async function collectSubcollectionRecords(db, eventId) {
  const records = [];
  for (const collectionName of eventSubcollections) {
    const snapshot = await db.collection('events').doc(eventId).collection(collectionName).get();
    snapshot.docs.forEach((doc) => records.push({
      path: `events/${eventId}/${collectionName}/${doc.id}`,
      eventId,
      ref: doc.ref,
      data: doc.data(),
    }));
  }
  return records;
}

async function writeBeforeSnapshot({ oldEvent, rootRecords, subRecords, existingDemo }) {
  await mkdir(evidenceDir, { recursive: true });
  const snapshot = {
    createdAt: new Date().toISOString(),
    projectId,
    retiredEventId,
    retiredEventName,
    demoEventId,
    demoEventName,
    oldEventExists: oldEvent.exists,
    oldEvent: oldEvent.exists ? oldEvent.data() : null,
    oldRootRecordCount: rootRecords.length,
    oldSubcollectionRecordCount: subRecords.length,
    oldRecordPaths: [...rootRecords, ...subRecords].map((record) => record.path),
    existingDemoExists: existingDemo.exists,
    cpbEventId,
    cpbTouched: false,
  };
  const path = join(evidenceDir, `before-${Date.now()}.json`);
  await writeFile(path, JSON.stringify(snapshot, null, 2));
  return path;
}

function demoEventPayload() {
  const createdAt = nowTimestamp();
  return {
    eventId: demoEventId,
    eventName: demoEventName,
    eventDate: Timestamp.fromDate(new Date('2026-11-14T12:00:00-04:00')),
    location: 'EXAMPLE - Harbor Training Hall, Bridgetown',
    venueName: 'EXAMPLE - Harbor Training Hall',
    eventType: 'cultural-experience',
    status: 'registration-open',
    eventStartTime: '15:00',
    eventEndTime: '20:00',
    eventDescription: 'EXAMPLE - Synthetic full-system walkthrough event for organizer training, QA, imports, tickets, check-in, operations, run of show, resources, and reports.',
    capacity: 50,
    ticketPrice: 75,
    registrationRequired: true,
    ticketTypeCount: 3,
    complimentaryAllowed: true,
    doorPaymentAllowed: true,
    registrationOpenDate: Timestamp.fromDate(new Date('2026-08-15T12:00:00-04:00')),
    registrationCloseDate: Timestamp.fromDate(new Date('2026-11-10T12:00:00-04:00')),
    financialPlan: {
      projectedRegistrationIncome: 1500,
      venueBudget: 600,
      supplierBudget: 450,
      entertainmentBudget: 300,
      marketingBudget: 125,
      staffingBudget: 250,
      contingencyBudget: 150,
      otherBudget: 75,
    },
    operationsPlan: {
      venueAccessTime: '11:00',
      emergencyContact: 'EXAMPLE - Leah Demo, 246-555-0100',
      suppliersNote: 'EXAMPLE - Confirm final supply drop by 10:30.',
      bakerVendorNote: 'EXAMPLE - Vendor tables are staged by zone.',
      sponsorNote: 'EXAMPLE - Sponsor signage reviewed before doors open.',
      staffNote: 'EXAMPLE - Two check-in helpers and one floor lead.',
      equipmentNote: 'EXAMPLE - Scanner device, backup laptop, extension cords.',
      licencesNote: 'EXAMPLE - Venue licence reference recorded in Documents.',
      insuranceNote: 'EXAMPLE - Insurance certificate reference recorded in Documents.',
      setupTime: '11:30',
      timeline: [
        { timelineId: 'demo_timeline_setup', time: '11:30', label: 'EXAMPLE - Setup starts' },
        { timelineId: 'demo_timeline_doors', time: '15:00', label: 'EXAMPLE - Guest arrival begins' },
      ],
    },
    readinessChecklist: {
      venueConfirmed: true,
      venueAccessConfirmed: true,
      paymentMethodsConfigured: true,
      suppliersConfirmed: true,
      staffAssigned: true,
      eventDayTimelineReady: true,
      ticketProcessReady: true,
      checkInProcessReady: true,
      communicationsPrepared: true,
      licencesReviewed: true,
      insuranceReviewed: true,
    },
    eventCapabilities: {
      publicRegistration: true,
      ticketing: true,
      checkIn: true,
      seating: false,
      suppliers: true,
      vendors: true,
      sponsors: true,
      bakers: false,
      tastingZones: false,
      allergens: true,
      schoolsYouth: false,
      speakers: true,
      sessions: true,
      certificates: false,
      bridalParty: false,
      accommodation: false,
      transport: true,
    },
    priceTiers: [
      { name: 'General Demo Ticket', price: 75, status: 'active' },
      { name: 'VIP Demo Ticket', price: 120, status: 'active' },
      { name: 'Complimentary Demo Ticket', price: 0, status: 'active' },
    ],
    isTestEvent: true,
    eventClassification: 'test',
    notes: CODEX_DEMO_NOTES,
    createdAt,
    updatedAt: createdAt,
  };
}

function demoRegistrations() {
  const createdAt = nowTimestamp();
  return [
    ['codex_demo_reg_001', 'EXAMPLE - Maya Training', 2, 'paid', 75, 150, 150, 0, 'CIBC 1stPay', 'DEMO-PAID-001', 'D-001', true],
    ['codex_demo_reg_002', 'EXAMPLE - Theo Pending', 1, 'pending', 75, 75, 0, 75, 'unknown', 'DEMO-PENDING-002', null, false],
    ['codex_demo_reg_003', 'EXAMPLE - Nia Door', 3, 'door', 75, 225, 0, 225, 'Door Payment', 'DEMO-DOOR-003', 'D-003', false],
    ['codex_demo_reg_004', 'EXAMPLE - Omar Complimentary', 1, 'complimentary', 0, 0, 0, 0, 'Complimentary', 'DEMO-COMP-004', 'D-004', true],
    ['codex_demo_reg_005', 'EXAMPLE - Priya Review', 2, 'paid', 75, 150, 100, 50, 'Bank Transfer', 'DEMO-REVIEW-005', null, false],
    ['codex_demo_reg_006', 'EXAMPLE - Ellis VIP', 1, 'paid', 120, 120, 120, 0, 'Credit Card', 'DEMO-VIP-006', 'VIP-006', false],
  ].map(([registrationId, fullName, personsAttending, paymentStatus, ticketPrice, amountDue, amountPaid, balanceDue, paymentMethod, paymentReference, ticketCode, checkedIn], index) => ({
    registrationId,
    eventId: demoEventId,
    fullName,
    buyerName: fullName,
    attendeeNames: [fullName],
    email: `example.demo${index + 1}@example.invalid`,
    phone: `246-555-01${String(index + 1).padStart(2, '0')}`,
    groupName: index < 3 ? 'EXAMPLE - Demo Group A' : 'EXAMPLE - Demo Group B',
    personsAttending,
    paymentStatus,
    priceTier: ticketPrice === 120 ? 'VIP Demo Ticket' : ticketPrice === 0 ? 'Complimentary Demo Ticket' : 'General Demo Ticket',
    ticketPrice,
    amountDue,
    amountPaid,
    balanceDue,
    paymentMethod,
    paymentReference,
    notes: 'EXAMPLE - Synthetic training registration.',
    ticketStatus: ticketCode ? 'ticket-assigned' : 'no-ticket-assigned',
    ticketCode,
    ticketAssignedAt: ticketCode ? createdAt : null,
    ticketAssignedBy: ticketCode ? performedBy : null,
    checkedIn,
    checkInTime: checkedIn ? createdAt : null,
    checkedInBy: checkedIn ? performedBy : null,
    attendanceRecordType: 'none',
    attendanceConfirmedAt: null,
    attendanceConfirmedBy: null,
    attendanceEvidenceNote: '',
    source: 'codex-demo-maintenance',
    sourceRowId: null,
    timestamp: null,
    createdAt,
    updatedAt: createdAt,
  }));
}

function demoOperations() {
  const createdAt = nowTimestamp();
  return [
    ['codex_demo_ops_001', 'income', 'Sponsor', 'EXAMPLE - Gold sponsor pledge', 500, 'Bank Transfer', 'received', 'EXAMPLE - Harbor Sponsors'],
    ['codex_demo_ops_002', 'expense', 'Venue', 'EXAMPLE - Venue deposit', 300, 'Card', 'paid', 'EXAMPLE - Harbor Training Hall'],
    ['codex_demo_ops_003', 'expense', 'Supplier', 'EXAMPLE - Linen balance', 180, 'unknown', 'pending', 'EXAMPLE - Bay Linen Co.'],
    ['codex_demo_ops_004', 'reimbursement', 'Staffing', 'EXAMPLE - Runner transport', 40, 'Cash', 'pending', 'EXAMPLE - Leah Demo'],
    ['codex_demo_ops_005', 'adjustment', 'Budget', 'EXAMPLE - Demo contingency adjustment', 25, 'unknown', 'expected', 'EXAMPLE - Organizer'],
  ].map(([ledgerEntryId, entryType, category, label, amount, paymentMethod, status, paidByOrPaidTo]) => ({
    ledgerEntryId,
    eventId: demoEventId,
    entryType,
    category,
    label,
    amount,
    paymentMethod,
    paymentReference: `${ledgerEntryId.toUpperCase()}-REF`,
    paidByOrPaidTo,
    linkedContactId: entryType === 'reimbursement' ? 'codex_demo_contact_leah' : null,
    linkedOrganizationId: category === 'Venue' ? 'codex_demo_org_venue' : category === 'Supplier' ? 'codex_demo_org_linen' : null,
    linkedDocumentId: category === 'Venue' ? 'codex_demo_doc_venue' : null,
    date: '2026-10-01',
    status,
    adjustmentDirection: entryType === 'adjustment' ? 'increase' : null,
    notes: 'EXAMPLE - Synthetic Operations Ledger record.',
    createdBy: performedBy,
    createdAt,
    updatedAt: createdAt,
  }));
}

function demoContacts() {
  const createdAt = nowTimestamp();
  return [
    ['codex_demo_contact_leah', 'EXAMPLE - Leah Demo', 'Leah', 'Demo', 'codex_demo_org_planning', 'Event Lead'],
    ['codex_demo_contact_sam', 'EXAMPLE - Sam Supplier', 'Sam', 'Supplier', 'codex_demo_org_linen', 'Supplier Contact'],
    ['codex_demo_contact_rio', 'EXAMPLE - Rio Venue', 'Rio', 'Venue', 'codex_demo_org_venue', 'Venue Manager'],
  ].map(([contactId, displayName, firstName, lastName, organizationId, roleTitle], index) => ({
    contactId,
    displayName,
    firstName,
    lastName,
    organizationId,
    roleTitle,
    category: 'event',
    email: `example.contact${index + 1}@example.invalid`,
    phone: `246-555-02${index + 1}`,
    preferredContactMethod: 'email',
    location: 'EXAMPLE - Bridgetown',
    website: '',
    socialLink: '',
    status: 'active',
    notes: 'EXAMPLE - Synthetic reusable contact for demo relationships.',
    createdBy: performedBy,
    createdAt,
    updatedAt: createdAt,
    updatedBy: performedBy,
  }));
}

function demoOrganizations() {
  const createdAt = nowTimestamp();
  return [
    ['codex_demo_org_planning', 'EXAMPLE - Demo Planning Team', 'staff-helper', 'codex_demo_contact_leah'],
    ['codex_demo_org_linen', 'EXAMPLE - Bay Linen Co.', 'supplier', 'codex_demo_contact_sam'],
    ['codex_demo_org_venue', 'EXAMPLE - Harbor Training Hall', 'venue', 'codex_demo_contact_rio'],
  ].map(([organizationId, name, category, primaryContactId], index) => ({
    organizationId,
    name,
    category,
    primaryContactId,
    email: `example.org${index + 1}@example.invalid`,
    phone: `246-555-03${index + 1}`,
    website: 'https://example.invalid',
    socialLink: '',
    location: 'EXAMPLE - Bridgetown',
    status: 'active',
    notes: 'EXAMPLE - Synthetic organization for demo relationships.',
    createdBy: performedBy,
    createdAt,
    updatedAt: createdAt,
    updatedBy: performedBy,
  }));
}

function demoSubcollectionRecords() {
  const createdAt = nowTimestamp();
  return {
    contactLinks: [
      ['codex_demo_link_lead', 'codex_demo_contact_leah', 'codex_demo_org_planning', 'planner', 'Event lead', 'confirmed'],
      ['codex_demo_link_supplier', 'codex_demo_contact_sam', 'codex_demo_org_linen', 'supplier', 'Linen supplier', 'confirmed'],
      ['codex_demo_link_venue', 'codex_demo_contact_rio', 'codex_demo_org_venue', 'venue', 'Venue contact', 'confirmed'],
    ].map(([linkId, contactId, organizationId, relationshipType, roleForEvent, status]) => ({
      linkId,
      eventId: demoEventId,
      eventName: demoEventName,
      contactId,
      organizationId,
      relationshipType,
      roleForEvent,
      status,
      primaryForEvent: relationshipType === 'planner',
      notes: 'EXAMPLE - Synthetic event relationship.',
      createdBy: performedBy,
      createdAt,
      updatedAt: createdAt,
      updatedBy: performedBy,
    })),
    tasks: [
      ['codex_demo_task_venue', 'EXAMPLE - Confirm venue access packet', 'Venue', 'High', 'In Progress', 'codex_demo_contact_rio'],
      ['codex_demo_task_tickets', 'EXAMPLE - Review ticket assignments', 'Registration', 'Medium', 'Not Started', 'codex_demo_contact_leah'],
      ['codex_demo_task_resources', 'EXAMPLE - Pack scanner kit', 'Event Day', 'High', 'Waiting on Someone', 'codex_demo_contact_sam'],
    ].map(([taskId, title, category, priority, status, responsibleUserId]) => ({
      taskId,
      eventId: demoEventId,
      eventName: demoEventName,
      isTestEvent: true,
      title,
      notes: 'EXAMPLE - Synthetic task for relationship selector training.',
      category,
      dueDate: '2026-11-01',
      followUpDate: '2026-10-25',
      priority,
      status,
      responsibleType: 'contact',
      responsibleUserId,
      responsibleLabel: responsibleUserId,
      waitingOn: status === 'Waiting on Someone' ? 'EXAMPLE - supplier confirmation' : '',
      blockerReason: '',
      createdAt,
      createdBy: performedBy,
      updatedAt: createdAt,
      updatedBy: performedBy,
      completedAt: null,
      cancelledAt: null,
    })),
    documents: [
      ['codex_demo_doc_venue', 'EXAMPLE - Venue access agreement', 'Venue', 'active', 'codex_demo_contact_rio', 'codex_demo_org_venue', 'codex_demo_task_venue'],
      ['codex_demo_doc_run', 'EXAMPLE - Run sheet packet', 'Event Day', 'draft', 'codex_demo_contact_leah', 'codex_demo_org_planning', 'codex_demo_task_resources'],
      ['codex_demo_doc_supplier', 'EXAMPLE - Linen order confirmation', 'Supplier', 'active', 'codex_demo_contact_sam', 'codex_demo_org_linen', 'codex_demo_task_resources'],
    ].map(([documentId, title, category, status, linkedContactId, linkedOrganizationId, linkedTaskId]) => ({
      documentId,
      eventId: demoEventId,
      eventName: demoEventName,
      title,
      category,
      description: 'EXAMPLE - Synthetic document reference. No real file is stored.',
      status,
      required: true,
      url: 'https://example.invalid/demo-document',
      documentType: 'link',
      provider: 'example',
      storageLocation: 'external-reference-only',
      linkedContactId,
      linkedOrganizationId,
      linkedTaskId,
      linkedOperationId: category === 'Venue' ? 'codex_demo_ops_002' : '',
      linkedCommitmentId: category === 'Supplier' ? 'codex_demo_commit_linen' : '',
      dueDate: '2026-10-20',
      expiryDate: '2026-12-31',
      versionLabel: 'demo-v1',
      notes: 'EXAMPLE - Synthetic document reference.',
      createdBy: performedBy,
      createdAt,
      updatedAt: createdAt,
      updatedBy: performedBy,
    })),
    runOfShow: [
      ['codex_demo_ros_setup', 1, 'EXAMPLE - Vendor setup opens', '11:30', '12:30', 'Setup', 'codex_demo_task_venue', ['codex_demo_doc_venue'], ['codex_demo_resource_scanner']],
      ['codex_demo_ros_briefing', 2, 'EXAMPLE - Team briefing', '14:00', '14:20', 'Staff', 'codex_demo_task_resources', ['codex_demo_doc_run'], ['codex_demo_resource_radios']],
      ['codex_demo_ros_doors', 3, 'EXAMPLE - Doors open and check-in starts', '15:00', '15:45', 'Guest Flow', 'codex_demo_task_tickets', ['codex_demo_doc_run'], ['codex_demo_resource_scanner', 'codex_demo_resource_signage']],
    ].map(([itemId, sequence, title, startTime, endTime, category, linkedTaskId, linkedDocumentIds, linkedResourceIds]) => ({
      itemId,
      eventId: demoEventId,
      eventName: demoEventName,
      title,
      category,
      date: '2026-11-14',
      startTime,
      endTime,
      sequence,
      location: 'EXAMPLE - Main Hall',
      status: 'Ready',
      description: 'EXAMPLE - Synthetic run-of-show item.',
      notes: 'EXAMPLE - Relationship selector training item.',
      responsibleStaffUid: '',
      responsibleContactId: 'codex_demo_contact_leah',
      responsibleOrganizationId: 'codex_demo_org_planning',
      responsibleLabel: 'EXAMPLE - Leah Demo',
      expectedArrivalTime: startTime,
      actualArrivalTime: '',
      arrivalStatus: 'Expected',
      arrivalNote: '',
      linkedTaskId,
      linkedDocumentIds,
      linkedResourceIds,
      dependencyItemIds: [],
      delayReason: '',
      criticalForEvent: sequence <= 3,
      createdBy: performedBy,
      createdAt,
      updatedAt: createdAt,
      updatedBy: performedBy,
    })),
    resources: [
      ['codex_demo_resource_scanner', 'EXAMPLE - Scanner kit', 'Technology', 'Confirmed', 2, 2, 'kits', 'codex_demo_task_resources', ['codex_demo_doc_run'], 'codex_demo_ops_005', 'codex_demo_commit_scanner', ['codex_demo_ros_setup', 'codex_demo_ros_doors']],
      ['codex_demo_resource_radios', 'EXAMPLE - Team radios', 'Technology', 'Partial', 4, 3, 'radios', 'codex_demo_task_resources', ['codex_demo_doc_run'], '', 'codex_demo_commit_radios', ['codex_demo_ros_briefing']],
      ['codex_demo_resource_signage', 'EXAMPLE - Wayfinding signs', 'Guest Flow', 'Confirmed', 8, 8, 'signs', 'codex_demo_task_venue', ['codex_demo_doc_venue'], 'codex_demo_ops_002', '', ['codex_demo_ros_doors']],
    ].map(([resourceId, name, category, status, quantityNeeded, quantityConfirmed, unit, linkedTaskId, linkedDocumentIds, linkedOperationId, linkedCommitmentId, linkedRunOfShowItemIds]) => ({
      resourceId,
      eventId: demoEventId,
      eventName: demoEventName,
      name,
      category,
      sourceType: 'owned',
      status,
      quantityNeeded,
      quantityConfirmed,
      unit,
      shortage: Math.max(0, quantityNeeded - quantityConfirmed),
      location: 'EXAMPLE - Storage table',
      supplierContactId: 'codex_demo_contact_sam',
      supplierOrganizationId: 'codex_demo_org_linen',
      supplierLabel: 'EXAMPLE - Bay Linen Co.',
      packingRequired: true,
      pickupRequired: false,
      returnRequired: true,
      pickupDueDate: '2026-11-14',
      returnDueDate: '2026-11-15',
      notes: 'EXAMPLE - Synthetic resource for relationship selector training.',
      linkedTaskId,
      linkedDocumentIds,
      linkedOperationId,
      linkedCommitmentId,
      linkedRunOfShowItemIds,
      criticalForEvent: true,
      createdBy: performedBy,
      createdAt,
      updatedAt: createdAt,
      updatedBy: performedBy,
    })),
  };
}

async function createDemoDataset(db, batch) {
  batch.set(db.collection('events').doc(demoEventId), demoEventPayload());

  demoContacts().forEach((contact) => batch.set(db.collection('contacts').doc(contact.contactId), contact));
  demoOrganizations().forEach((organization) => batch.set(db.collection('organizations').doc(organization.organizationId), organization));
  demoRegistrations().forEach((registration) => batch.set(db.collection('registrations').doc(registration.registrationId), registration));
  demoOperations().forEach((entry) => batch.set(db.collection('operationsLedger').doc(entry.ledgerEntryId), entry));

  const subcollections = demoSubcollectionRecords();
  Object.entries(subcollections).forEach(([collectionName, records]) => {
    records.forEach((record) => {
      const id = record.linkId || record.taskId || record.documentId || record.itemId || record.resourceId;
      batch.set(db.collection('events').doc(demoEventId).collection(collectionName).doc(id), record);
    });
  });

  const auditRef = db.collection('auditLogs').doc();
  batch.set(auditRef, {
    ...auditData({
      eventId: demoEventId,
      action: 'demo-fixture.create',
      targetType: 'event',
      targetId: demoEventId,
      details: {
        eventName: demoEventName,
        registrationCount: demoRegistrations().length,
        operationCount: demoOperations().length,
        relationshipCollections: Object.fromEntries(Object.entries(subcollections).map(([key, records]) => [key, records.length])),
      },
    }),
    logId: auditRef.id,
  });
  return auditRef.id;
}

async function main() {
  const app = initializeApp({ credential: applicationDefault(), projectId });
  if (app.options.projectId !== projectId) throw new Error(`Project mismatch. Expected ${projectId}, got ${app.options.projectId}`);

  const db = getFirestore(app);
  const oldEventRef = db.collection('events').doc(retiredEventId);
  const demoEventRef = db.collection('events').doc(demoEventId);
  const cpbEventRef = db.collection('events').doc(cpbEventId);
  const [oldEvent, existingDemo, cpbEvent] = await Promise.all([oldEventRef.get(), demoEventRef.get(), cpbEventRef.get()]);

  if (!oldEvent.exists) throw new Error(`Retired CODEX_TEST event ${retiredEventId} was not found. Stop rather than guessing.`);
  if (oldEvent.id !== retiredEventId || oldEvent.data().eventId !== retiredEventId || oldEvent.data().eventName !== retiredEventName) {
    throw new Error('Retired fixture identity drifted. Refusing deletion.');
  }
  if (existingDemo.exists) throw new Error(`Demo event ${demoEventId} already exists. Refusing to overwrite permanent demo data.`);
  if (!cpbEvent.exists) throw new Error('CPB event was not readable. Refusing to proceed because CPB protection could not be verified.');

  const rootRecords = await collectRootEventRecords(db, retiredEventId);
  const subRecords = await collectSubcollectionRecords(db, retiredEventId);
  const deleteRecords = [{ path: `events/${retiredEventId}`, eventId: retiredEventId, ref: oldEventRef, data: oldEvent.data() }, ...rootRecords, ...subRecords];
  ensureSafeDeleteSet(deleteRecords);

  const beforeSnapshotPath = await writeBeforeSnapshot({ oldEvent, rootRecords, subRecords, existingDemo });

  const batch = db.batch();
  deleteRecords.forEach((record) => batch.delete(record.ref));
  const retirementAuditRef = db.collection('auditLogs').doc();
  batch.set(retirementAuditRef, {
    ...auditData({
      eventId: retiredEventId,
      action: 'demo-fixture.retire-old-codex-test',
      targetType: 'event',
      targetId: retiredEventId,
      details: {
        retiredEventName,
        deletedRecordCount: deleteRecords.length,
        deletedRootRecords: rootRecords.length,
        deletedSubcollectionRecords: subRecords.length,
        beforeSnapshotPath,
        cpbTouched: false,
      },
    }),
    logId: retirementAuditRef.id,
  });
  const creationAuditId = await createDemoDataset(db, batch);
  await batch.commit();

  const [oldAfter, demoAfter] = await Promise.all([oldEventRef.get(), demoEventRef.get()]);
  const oldRootAfter = await collectRootEventRecords(db, retiredEventId);
  const oldSubAfter = await collectSubcollectionRecords(db, retiredEventId);
  const demoRegistrationsSnapshot = await db.collection('registrations').where('eventId', '==', demoEventId).get();
  const demoOperationsSnapshot = await db.collection('operationsLedger').where('eventId', '==', demoEventId).get();

  const result = {
    projectId,
    retiredEventDeleted: !oldAfter.exists,
    retiredRootRecordsRemaining: oldRootAfter.length,
    retiredSubcollectionRecordsRemaining: oldSubAfter.length,
    demoEventCreated: demoAfter.exists,
    demoEventId,
    demoEventName: demoAfter.data()?.eventName || null,
    demoIsTestEvent: demoAfter.data()?.isTestEvent === true && demoAfter.data()?.eventClassification === 'test',
    demoRegistrationCount: demoRegistrationsSnapshot.size,
    demoOperationsCount: demoOperationsSnapshot.size,
    retirementAuditId: retirementAuditRef.id,
    creationAuditId,
    beforeSnapshotPath,
    cpbTouched: false,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.retiredEventDeleted || result.retiredRootRecordsRemaining !== 0 || result.retiredSubcollectionRecordsRemaining !== 0 || !result.demoEventCreated || !result.demoIsTestEvent) {
    throw new Error('Post-write verification failed.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
