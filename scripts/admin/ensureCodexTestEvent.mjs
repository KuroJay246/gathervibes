/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const projectId = 'gathervibeshub';
const eventName = 'CODEX_TEST Live Verification Event';
const fixtureNotes = 'Permanent QA fixture. Do not use for real guests. Do not delete unless the organizer explicitly approves.';
const qaPattern = /CODEX_TEST|CODEX DAILY|CODEX_DAILY|smoke|test|verification|QA/i;

function summarizeEvent(doc) {
  const data = doc.data();
  return {
    docId: doc.id,
    eventId: data.eventId ?? null,
    eventName: data.eventName ?? null,
    name: data.name ?? null,
    title: data.title ?? null,
    status: data.status ?? null,
    eventType: data.eventType ?? null,
    notes: data.notes ?? null,
  };
}

function eventLooksLikeQaFixture(event) {
  return qaPattern.test(JSON.stringify(event));
}

async function countCollection(db, collectionName) {
  const countSnapshot = await db.collection(collectionName).count().get();
  return countSnapshot.data().count;
}

async function main() {
  const app = initializeApp({
    credential: applicationDefault(),
    projectId,
  });

  if (app.options.projectId !== projectId) {
    console.error(`Error: Project ID mismatch. Expected ${projectId}, got ${app.options.projectId}`);
    process.exit(1);
  }

  console.log(`Using Firebase project: ${projectId}`);
  console.log(`Ensuring fixture: ${eventName}`);

  const db = getFirestore(app);
  const eventsRef = db.collection('events');
  const auditLogsRef = db.collection('auditLogs');
  const eventsBefore = await countCollection(db, 'events');
  const auditLogsBefore = await countCollection(db, 'auditLogs');
  const eventsSnapshot = await eventsRef.get();
  const events = eventsSnapshot.docs.map(summarizeEvent);
  const codexMatches = events.filter((event) => /CODEX_TEST/i.test(JSON.stringify(event)));
  const qaMatches = events.filter(eventLooksLikeQaFixture);
  const cpbBefore = events.find((event) => event.eventName === 'CPB') ?? null;

  console.log('Before summary:');
  console.log(JSON.stringify({
    eventsBefore,
    auditLogsBefore,
    existingEvents: events.map(({ docId, eventId, eventName, status, eventType }) => ({
      docId,
      eventId,
      eventName,
      status,
      eventType,
    })),
    codexMatches: codexMatches.length,
    qaFixtureMatches: qaMatches.length,
  }, null, 2));

  if (codexMatches.length > 1) {
    console.error('Error: More than one CODEX_TEST-looking event already exists. Refusing to write.');
    process.exit(1);
  }

  if (codexMatches.length === 1) {
    console.log(`CODEX_TEST fixture already exists: ${codexMatches[0].docId}. No write needed.`);
    console.log(JSON.stringify({
      created: false,
      eventId: codexMatches[0].docId,
      eventsBefore,
      eventsAfter: eventsBefore,
      auditLogsBefore,
      auditLogsAfter: auditLogsBefore,
      cpbUnchanged: true,
    }, null, 2));
    return;
  }

  if (qaMatches.length > 0) {
    console.error('Error: Found a QA-looking event that is not CODEX_TEST. Refusing to guess or create a duplicate fixture.');
    console.error(JSON.stringify({ qaMatches }, null, 2));
    process.exit(1);
  }

  const eventRef = eventsRef.doc();
  const auditRef = auditLogsRef.doc();
  const now = Timestamp.now();
  const eventDate = Timestamp.fromDate(new Date('2027-01-15T12:00:00-04:00'));
  const eventData = {
    eventId: eventRef.id,
    eventName,
    eventDate,
    location: 'QA / Smoke Test',
    eventType: 'other',
    status: 'upcoming',
    capacity: 10,
    ticketPrice: 0,
    priceTiers: [
      {
        name: 'Complimentary',
        price: 0,
        status: 'active',
      },
    ],
    notes: fixtureNotes,
    createdAt: now,
    updatedAt: now,
  };
  const auditData = {
    logId: auditRef.id,
    eventId: eventRef.id,
    action: 'event.create',
    targetType: 'event',
    targetId: eventRef.id,
    performedBy: 'codex-admin-script',
    timestamp: FieldValue.serverTimestamp(),
    details: { eventName },
  };

  console.log('Creating exactly one CODEX_TEST fixture event and one event.create audit log.');
  const batch = db.batch();
  batch.set(eventRef, eventData);
  batch.set(auditRef, auditData);
  await batch.commit();

  const eventsAfter = await countCollection(db, 'events');
  const auditLogsAfter = await countCollection(db, 'auditLogs');
  const verifyEvent = await eventRef.get();
  const afterEventsSnapshot = await eventsRef.get();
  const afterEvents = afterEventsSnapshot.docs.map(summarizeEvent);
  const afterCodexMatches = afterEvents.filter((event) => /CODEX_TEST/i.test(JSON.stringify(event)));
  const cpbAfter = afterEvents.find((event) => event.eventName === 'CPB') ?? null;

  console.log('After summary:');
  console.log(JSON.stringify({
    created: true,
    eventId: eventRef.id,
    auditLogId: auditRef.id,
    auditLogCreated: auditLogsAfter === auditLogsBefore + 1,
    eventsBefore,
    eventsAfter,
    auditLogsBefore,
    auditLogsAfter,
    codexTestMatchesAfter: afterCodexMatches.length,
    cpbUnchanged: JSON.stringify(cpbBefore) === JSON.stringify(cpbAfter),
    verifiedEventExists: verifyEvent.exists,
  }, null, 2));
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
