import { collection, doc, getCountFromServer, getDoc, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from '@react-native-firebase/firestore'
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

const PAYMENT_STATUS_ALIASES = {
  paid: ['paid', 'Paid', 'paid confirmed', 'Paid Confirmed', 'payment confirmed', 'Payment Confirmed'],
  pending: ['pending', 'Pending', 'unpaid', 'Unpaid', 'partial', 'Partial', 'partial payment', 'Partial Payment', 'part paid', 'Part Paid', 'partially paid', 'Partially Paid'],
  complimentary: ['complimentary', 'Complimentary', 'comp', 'Comp'],
  door: ['door', 'Door', 'door payment', 'Door Payment', 'door paid', 'Door Paid', 'door sale', 'Door Sale', 'walk in', 'Walk In', 'walk-in', 'Walk-In'],
  'door-list': ['pay at door', 'Pay at Door', 'to pay at door', 'To Pay at Door', 'door list', 'Door List'],
}

async function countRegistrations(eventId, ...constraints) {
  const snapshot = await getCountFromServer(query(
    collection(firestore, 'registrations'),
    where('eventId', '==', eventId),
    ...constraints,
  ))
  return Number(snapshot.data()?.count || 0)
}

export async function loadRegistrationSummary(eventId) {
  if (!eventId) {
    return { totalRegistrations: 0, checkedIn: 0, notCheckedIn: 0, attendancePercentage: 0, paid: 0, pending: 0, door: 0, complete: true }
  }

  const [totalRegistrations, checkedIn, paid, pending, complimentary, door, doorList] = await Promise.all([
    countRegistrations(eventId),
    countRegistrations(eventId, where('checkedIn', '==', true)),
    countRegistrations(eventId, where('paymentStatus', 'in', PAYMENT_STATUS_ALIASES.paid)),
    countRegistrations(eventId, where('paymentStatus', 'in', PAYMENT_STATUS_ALIASES.pending)),
    countRegistrations(eventId, where('paymentStatus', 'in', PAYMENT_STATUS_ALIASES.complimentary)),
    countRegistrations(eventId, where('paymentStatus', 'in', PAYMENT_STATUS_ALIASES.door)),
    countRegistrations(eventId, where('paymentStatus', 'in', PAYMENT_STATUS_ALIASES['door-list'])),
  ])

  return {
    totalRegistrations,
    checkedIn,
    notCheckedIn: Math.max(totalRegistrations - checkedIn, 0),
    attendancePercentage: totalRegistrations ? Math.round((checkedIn / totalRegistrations) * 100) : 0,
    paid,
    pending,
    door: door + doorList,
    complimentary,
    complete: true,
  }
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
