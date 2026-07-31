import { collection, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
export { safeAuditChanges } from '../utils/auditUtils.js'

export function createAuditLogWrite({ eventId, action, targetType = 'event', targetId, performedBy, details, logId }) {
  if (!db) throw new Error('Firebase is not configured')

  const auditRef = logId ? doc(db, 'auditLogs', logId) : doc(collection(db, 'auditLogs'))

  return {
    ref: auditRef,
    data: {
      logId: auditRef.id,
      eventId,
      action,
      targetType,
      targetId,
      performedBy: performedBy?.email || performedBy?.uid || 'unknown-admin',
      timestamp: serverTimestamp(),
      details,
    },
  }
}
