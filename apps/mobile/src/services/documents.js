import { collection, limit, onSnapshot, query } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'

export function subscribeToDocuments(eventId, onDocuments, onError) {
  if (!eventId) return () => {}

  return onSnapshot(
    query(collection(firestore, 'events', eventId, 'documents'), limit(100)),
    (snapshot) => {
      const rows = snapshot.docs.map((documentSnapshot) => ({
        ...documentSnapshot.data(),
        documentId: documentSnapshot.data().documentId || documentSnapshot.id,
      }))
      rows.sort((left, right) => String(left.title || '').localeCompare(String(right.title || '')))
      onDocuments(rows)
    },
    onError,
  )
}
