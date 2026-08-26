import { collection, onSnapshot } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'

export function subscribeToTasks(eventId, onTasks, onError) {
  if (!eventId) return () => {}

  return onSnapshot(
    collection(firestore, 'events', eventId, 'tasks'),
    (snapshot) => {
      const rows = snapshot.docs.map((taskDocument) => ({
        ...taskDocument.data(),
        taskId: taskDocument.data().taskId || taskDocument.id,
      }))
      rows.sort((left, right) => String(left.dueDate || '').localeCompare(String(right.dueDate || '')) || String(left.title || '').localeCompare(String(right.title || '')))
      onTasks(rows)
    },
    onError,
  )
}
