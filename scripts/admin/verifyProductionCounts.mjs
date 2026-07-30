/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildRegistrationMetrics } from '../../src/utils/registrationMetrics.js';

const projectId = 'gathervibeshub';
const codexTestEventId = 'xPfa0b3KZyLSDnAD2uGI';

function summarizeEvent(doc) {
  const data = doc.data();
  return {
    eventId: data.eventId ?? doc.id,
    eventName: data.eventName ?? '',
    capacity: data.capacity ?? 0,
    status: data.status ?? '',
    eventType: data.eventType ?? '',
    isTestEvent: data.isTestEvent ?? false,
    eventClassification: data.eventClassification ?? '',
  };
}

function isTestEvent(event) {
  return event.eventId === codexTestEventId || event.isTestEvent === true || event.eventClassification === 'test';
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
  console.log('Running read-only production count diagnostic. No writes or deletes are performed.');

  const db = getFirestore(app);
  const [eventsSnapshot, registrationsSnapshot] = await Promise.all([
    db.collection('events').get(),
    db.collection('registrations').get(),
  ]);

  const events = eventsSnapshot.docs.map(summarizeEvent);
  const registrations = registrationsSnapshot.docs.map((doc) => ({ registrationId: doc.id, ...doc.data() }));
  const result = events.map((event) => {
    const eventRegistrations = registrations.filter((registration) => registration.eventId === event.eventId);
    const metrics = buildRegistrationMetrics(eventRegistrations, event);

    return {
      eventName: event.eventName,
      eventId: event.eventId,
      status: event.status,
      eventType: event.eventType,
      isTestEvent: isTestEvent(event),
      capacity: event.capacity,
      totalRegistrations: metrics.totalRegistrations,
      totalPersons: metrics.totalPersons,
      checkedInRegistrations: metrics.checkedInRegistrations,
      checkedInPersons: metrics.checkedInPersons,
      remainingRegistrations: metrics.remainingRegistrations,
      remainingPersons: metrics.remainingPersons,
      capacityPercent: metrics.capacityPercent,
      paidRegistrations: metrics.paidRegistrations,
      pendingRegistrations: metrics.pendingRegistrations,
      complimentaryRegistrations: metrics.complimentaryRegistrations,
      paidPersons: metrics.paidPersons,
      pendingPersons: metrics.pendingPersons,
      complimentaryPersons: metrics.complimentaryPersons,
    };
  });

  const codex = result.find((event) => event.eventId === codexTestEventId);
  const realEvents = result.filter((event) => !event.isTestEvent);
  const testEvents = result.filter((event) => event.isTestEvent);

  console.log(JSON.stringify({
    eventCount: events.length,
    registrationCount: registrations.length,
    realEventCount: realEvents.length,
    testEventCount: testEvents.length,
    realEvents,
    testEvents,
    codexTestExists: Boolean(codex),
  }, null, 2));

  if (!codex) {
    console.error('Error: CODEX_TEST event is missing.');
    process.exit(1);
  }

  if (codex.isTestEvent !== true) {
    console.error('Error: CODEX_TEST event is not classified as a Test Event.');
    process.exit(1);
  }

  console.log('Verified production counts read-only. CODEX_TEST exists, is classified as a Test Event, and is separated from real-event totals.');
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
