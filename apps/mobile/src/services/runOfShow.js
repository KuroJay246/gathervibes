import { collection, limit, onSnapshot, query } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'

export function subscribeToRunOfShow(eventId, onItems, onError) {
  if (!eventId) return () => {}

  return onSnapshot(
    query(collection(firestore, 'events', eventId, 'runOfShow'), limit(100)),
    (snapshot) => {
      const rows = snapshot.docs.map((itemDocument) => ({
        ...itemDocument.data(),
        itemId: itemDocument.data().itemId || itemDocument.id,
      }))
      rows.sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')) || String(left.startTime || '').localeCompare(String(right.startTime || '')) || Number(left.sequence || 0) - Number(right.sequence || 0) || String(left.title || '').localeCompare(String(right.title || '')))
      onItems(rows)
    },
    onError,
  )
}
