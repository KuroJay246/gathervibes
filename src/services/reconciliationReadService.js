import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

export async function loadReconciliationRegistrations(eventId) {
  if (!eventId) return []
  const snapshot = await getDocs(query(collection(requireDatabase(), 'registrations'), where('eventId', '==', eventId)))
  return snapshot.docs.map((registrationDocument) => ({
    ...registrationDocument.data(),
    registrationId: registrationDocument.data().registrationId || registrationDocument.id,
  }))
}

export async function loadReconciliationOperations(eventId) {
  if (!eventId) return []
  const snapshot = await getDocs(query(collection(requireDatabase(), 'operationsLedger'), where('eventId', '==', eventId)))
  return snapshot.docs.map((entryDocument) => ({
    ...entryDocument.data(),
    ledgerEntryId: entryDocument.data().ledgerEntryId || entryDocument.id,
  }))
}

