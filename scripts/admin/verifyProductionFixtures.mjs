/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'gathervibeshub';
const codexTestEventId = 'xPfa0b3KZyLSDnAD2uGI';
const codexTestEventName = 'CODEX_TEST Live Verification Event';
const cpbEventId = 'zhaPxi31cpqLAW0cuS20';

function eventSummary(doc) {
  const data = doc.data();
  return {
    docId: doc.id,
    eventId: data.eventId ?? null,
    eventName: data.eventName ?? null,
    status: data.status ?? null,
    eventType: data.eventType ?? null,
    notes: data.notes ?? null,
  };
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
  console.log('Running read-only production fixture verification. No writes or deletes are performed.');

  const db = getFirestore(app);
  const eventsSnapshot = await db.collection('events').get();
  const events = eventsSnapshot.docs.map(eventSummary);
  const codexMatches = events.filter((event) => (
    event.docId === codexTestEventId
    || event.eventId === codexTestEventId
    || event.eventName === codexTestEventName
  ));
  const cpb = events.find((event) => event.docId === cpbEventId || event.eventId === cpbEventId);
  const auditSample = await db.collection('auditLogs').limit(1).get();

  const result = {
    eventCount: events.length,
    codexTestMatches: codexMatches.map(({ docId, eventId, eventName, status, eventType }) => ({
      docId,
      eventId,
      eventName,
      status,
      eventType,
    })),
    cpb: cpb ? {
      docId: cpb.docId,
      eventId: cpb.eventId,
      eventName: cpb.eventName,
      status: cpb.status,
      eventType: cpb.eventType,
    } : null,
    auditLogsExist: !auditSample.empty,
  };

  console.log(JSON.stringify(result, null, 2));

  if (codexMatches.length !== 1) {
    console.error(`Error: Expected exactly one CODEX_TEST fixture, found ${codexMatches.length}.`);
    process.exit(1);
  }

  const codex = codexMatches[0];
  if (codex.docId !== codexTestEventId || codex.eventId !== codexTestEventId || codex.eventName !== codexTestEventName) {
    console.error('Error: CODEX_TEST fixture ID or name does not match the approved production fixture.');
    process.exit(1);
  }

  if (!cpb || cpb.docId !== cpbEventId || cpb.eventName !== 'CPB' || cpb.status !== 'completed' || cpb.eventType !== 'cake-picnic') {
    console.error('Error: CPB fixture check failed. CPB may be missing or changed.');
    process.exit(1);
  }

  if (auditSample.empty) {
    console.error('Error: auditLogs collection has no readable documents.');
    process.exit(1);
  }

  console.log('Verified production fixtures: CODEX_TEST exists exactly once, CPB is unchanged, and auditLogs exist.');
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
