import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'

export function subscribeToOperationsLedger(eventId, onRows, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    query(collection(firestore, 'operationsLedger'), where('eventId', '==', eventId)),
    (snapshot) => {
      const rows = snapshot.docs.map((entryDocument) => ({ ...entryDocument.data(), ledgerEntryId: entryDocument.data().ledgerEntryId || entryDocument.id }))
      rows.sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
      onRows(rows)
    },
    onError,
  )
}
