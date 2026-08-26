import { collection, onSnapshot, orderBy, query, where } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'
import { normalizeTicketCode, searchableRegistrationText } from '@gsv/contracts/ticketUtils'

export function subscribeToRegistrations(eventId, onRegistrations, onError) {
  if (!eventId) return () => {}

  const registrationsQuery = query(
    collection(firestore, 'registrations'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
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
