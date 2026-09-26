import { collection, limit, onSnapshot, query } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'

export function subscribeToContacts(onContacts, onError) {
  return onSnapshot(
    query(collection(firestore, 'contacts'), limit(200)),
    (snapshot) => {
      const rows = snapshot.docs.map((contactDocument) => ({
        ...contactDocument.data(),
        contactId: contactDocument.data().contactId || contactDocument.id,
      }))
      rows.sort((left, right) => String(left.displayName || '').localeCompare(String(right.displayName || '')))
      onContacts(rows)
    },
    onError,
  )
}

export function subscribeToOrganizations(onOrganizations, onError) {
  return onSnapshot(
    query(collection(firestore, 'organizations'), limit(200)),
    (snapshot) => {
      const rows = snapshot.docs.map((organizationDocument) => ({
        ...organizationDocument.data(),
        organizationId: organizationDocument.data().organizationId || organizationDocument.id,
      }))
      rows.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')))
      onOrganizations(rows)
    },
    onError,
  )
}

export function subscribeToEventContactLinks(eventId, onLinks, onError) {
  if (!eventId) return () => {}

  return onSnapshot(
    query(collection(firestore, 'events', eventId, 'contactLinks'), limit(200)),
    (snapshot) => onLinks(snapshot.docs.map((linkDocument) => ({
      ...linkDocument.data(),
      linkId: linkDocument.data().linkId || linkDocument.id,
    }))),
    onError,
  )
}
