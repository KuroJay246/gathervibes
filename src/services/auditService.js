import { collection, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'

export function createAuditLogWrite({ eventId, action, targetId, performedBy, details }) {
  if (!db) throw new Error('Firebase is not configured')

  const auditRef = doc(collection(db, 'auditLogs'))

  return {
    ref: auditRef,
    data: {
      logId: auditRef.id,
      eventId,
      action,
      targetType: 'event',
      targetId,
      performedBy: performedBy?.email || performedBy?.uid || 'unknown-admin',
      timestamp: serverTimestamp(),
      details,
    },
  }
}
