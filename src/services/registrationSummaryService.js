import { collection, getCountFromServer, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase.js'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

async function countRegistrations(eventId, ...constraints) {
  const snapshot = await getCountFromServer(query(
    collection(requireDatabase(), 'registrations'),
    where('eventId', '==', eventId),
    ...constraints,
  ))
  return Number(snapshot.data()?.count || 0)
}

/**
 * Authoritative event-scoped counts for summary surfaces.
 * Row-level finance, readiness, and diagnostic views must remain separate.
 */
export async function loadRegistrationSummary(eventId) {
  if (!eventId) {
    return {
      totalRegistrations: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      attendancePercentage: 0,
    }
  }

  const [totalRegistrations, checkedIn] = await Promise.all([
    countRegistrations(eventId),
    countRegistrations(eventId, where('checkedIn', '==', true)),
  ])

  return {
    totalRegistrations,
    checkedIn,
    notCheckedIn: Math.max(totalRegistrations - checkedIn, 0),
    attendancePercentage: totalRegistrations
      ? Math.round((checkedIn / totalRegistrations) * 100)
      : 0,
  }
}

export function subscribeToRecentRegistrationRows(eventId, onRows, onError, rowLimit = 6) {
  if (!eventId) return () => {}
  const registrationsQuery = query(
    collection(requireDatabase(), 'registrations'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
    limit(rowLimit),
  )

  return onSnapshot(
    registrationsQuery,
    (snapshot) => onRows(snapshot.docs.map((registrationDocument) => ({
      ...registrationDocument.data(),
      registrationId: registrationDocument.data().registrationId || registrationDocument.id,
    }))),
    onError,
  )
}
