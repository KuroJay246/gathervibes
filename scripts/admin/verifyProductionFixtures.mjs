/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'gathervibeshub';
const retiredCodexTestEventId = 'xPfa0b3KZyLSDnAD2uGI';
const retiredCodexTestEventName = 'CODEX_TEST Live Verification Event';
const codexDemoEventId = 'codex_demo_full_system_walkthrough';
const codexDemoEventName = 'CODEX_DEMO - Full System Walkthrough';

function eventSummary(doc) {
  const data = doc.data();
  return {
    docId: doc.id,
    eventId: data.eventId ?? null,
    eventName: data.eventName ?? null,
    status: data.status ?? null,
    eventType: data.eventType ?? null,
    isTestEvent: data.isTestEvent ?? false,
    eventClassification: data.eventClassification ?? null,
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
  const demoMatches = events.filter((event) => (
    event.docId === codexDemoEventId
    || event.eventId === codexDemoEventId
    || event.eventName === codexDemoEventName
  ));
  const retiredMatches = events.filter((event) => (
    event.docId === retiredCodexTestEventId
    || event.eventId === retiredCodexTestEventId
    || event.eventName === retiredCodexTestEventName
  ));
  const auditSample = await db.collection('auditLogs').limit(1).get();

  const result = {
    eventCount: events.length,
    codexDemoMatches: demoMatches.map(({ docId, eventId, eventName, status, eventType, isTestEvent, eventClassification }) => ({
      docId,
      eventId,
      eventName,
      status,
      eventType,
      isTestEvent,
      eventClassification,
    })),
    retiredCodexTestMatches: retiredMatches.length,
    auditLogsExist: !auditSample.empty,
  };

  console.log(JSON.stringify(result, null, 2));

  if (demoMatches.length !== 1) {
    console.error(`Error: Expected exactly one CODEX_DEMO fixture, found ${demoMatches.length}.`);
    process.exit(1);
  }

  if (retiredMatches.length !== 0) {
    console.error(`Error: Retired CODEX_TEST fixture is still present (${retiredMatches.length}).`);
    process.exit(1);
  }

  const codex = demoMatches[0];
  if (codex.docId !== codexDemoEventId || codex.eventId !== codexDemoEventId || codex.eventName !== codexDemoEventName) {
    console.error('Error: CODEX_DEMO fixture ID or name does not match the approved production fixture.');
    process.exit(1);
  }

  if (codex.isTestEvent !== true || codex.eventClassification !== 'test') {
    console.error('Error: CODEX_DEMO fixture is not marked as a Test Event.');
    process.exit(1);
  }

  if (auditSample.empty) {
    console.error('Error: auditLogs collection has no readable documents.');
    process.exit(1);
  }

  console.log('Verified production fixtures: CODEX_DEMO exists exactly once, retired CODEX_TEST is absent, the demo is marked as a Test Event, and auditLogs exist.');
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
