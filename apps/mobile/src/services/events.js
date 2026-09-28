import { Timestamp, collection, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '@react-native-firebase/firestore'

import { firestore } from '@/lib/firebase'

function normalizeEvent(document) {
  const data = document.data()
  return { ...data, eventId: data.eventId || document.id }
}

export function subscribeToManagedEvents(onEvents, onError) {
  const eventsQuery = query(collection(firestore, 'events'), orderBy('eventDate', 'asc'), limit(200))
  return onSnapshot(eventsQuery, (snapshot) => onEvents(snapshot.docs.map(normalizeEvent)), onError)
}

export async function createManagedEvent(values) {
  const payload = buildEventPayload(values)
  const reference = doc(collection(firestore, 'events'))
  await setDoc(reference, {
    ...payload,
    eventId: reference.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return reference.id
}

export async function updateManagedEvent(eventId, values) {
  if (!eventId) throw new Error('Event is required.')
  await updateDoc(doc(firestore, 'events', eventId), { ...buildEventPayload(values), updatedAt: serverTimestamp() })
}

export async function loadReadableEvents() {
  const snapshot = await getDocs(query(collection(firestore, 'events'), orderBy('eventDate', 'asc'), limit(200)))
  return snapshot.docs.map(normalizeEvent)
}

function buildEventPayload(values) {
  const eventName = String(values.eventName || '').trim()
  const eventDate = String(values.eventDate || '').trim()
  if (!eventName) throw new Error('Enter an event name.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) throw new Error('Use a date in YYYY-MM-DD format.')
  return {
    eventName,
    eventDate: Timestamp.fromDate(new Date(`${eventDate}T12:00:00`)),
    location: String(values.location || '').trim(),
    venueName: String(values.venueName || '').trim(),
    eventType: String(values.eventType || 'event').trim(),
    status: String(values.status || 'planning').trim(),
    eventStartTime: String(values.eventStartTime || '').trim(),
    eventEndTime: String(values.eventEndTime || '').trim(),
    eventDescription: String(values.eventDescription || '').trim(),
    notes: String(values.notes || '').trim(),
  }
}
