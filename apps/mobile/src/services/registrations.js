import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'
import { normalizeTicketCode, searchableRegistrationText } from '@gsv/contracts/ticketUtils'

export function subscribeToRegistrations(eventId, onRegistrations, onError) {
  if (!eventId) return () => {}

  const registrationsQuery = query(
    collection(firestore, 'registrations'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
    limit(500),
  )

  return onSnapshot(
    registrationsQuery,
    (snapshot) => onRegistrations(snapshot.docs.map((registrationDocument) => ({
      ...registrationDocument.data(),
      registrationId: registrationDocument.data().registrationId || registrationDocument.id,
    }))),
    onError,
  )
}

export async function loadRegistrationPage(eventId, { cursor = null, pageSize = 50 } = {}) {
  if (!eventId) return { registrations: [], cursor: null, hasMore: false }
  const constraints = [where('eventId', '==', eventId), orderBy('createdAt', 'desc'), limit(pageSize)]
  if (cursor) constraints.push(startAfter(cursor))
  const snapshot = await getDocs(query(collection(firestore, 'registrations'), ...constraints))
  const registrations = snapshot.docs.map((registrationDocument) => ({
    ...registrationDocument.data(),
    registrationId: registrationDocument.data().registrationId || registrationDocument.id,
  }))
  return {
    registrations,
    cursor: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.docs.length === pageSize,
  }
}

export async function loadRegistrationDetail(eventId, registrationId) {
  if (!eventId || !registrationId) return null
  const snapshot = await getDoc(doc(firestore, 'registrations', registrationId))
  if (!snapshot.exists) return null
  const registration = { ...snapshot.data(), registrationId: snapshot.data().registrationId || snapshot.id }
  return registration.eventId === eventId ? registration : null
}

export function searchRegistrations(registrations = [], value = '', limit = 20) {
  const queryText = String(value || '').trim().toLowerCase()
  if (!queryText) return []
  return registrations.filter((registration) => searchableRegistrationText(registration).includes(queryText)).slice(0, limit)
}

export function findRegistrationByTicketCode(registrations = [], value = '') {
  const normalized = normalizeTicketCode(value)
  if (!normalized) return null
  return registrations.find((registration) => normalizeTicketCode(registration.ticketCode) === normalized) || null
}
