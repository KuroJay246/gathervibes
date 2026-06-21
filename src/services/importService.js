import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite } from './auditService.js'

export {
  parseCSV,
  normalizePaymentStatus,
  normalizeEmail,
  normalizePhone,
  timestampMillis,
  generateStableId,
  mapRows,
  validateRow,
  findDuplicate,
  processAndValidate,
} from '../utils/importUtils.js'

export async function commitImport(validRows, eventId, user) {
  if (!db) throw new Error('Firebase is not configured')

  const chunkSize = 249
  for (let i = 0; i < validRows.length; i += chunkSize) {
    const chunk = validRows.slice(i, i + chunkSize)
    const batch = writeBatch(db)

    for (const { row } of chunk) {
      const regRef = doc(db, 'registrations', row.registrationId)

      batch.set(regRef, {
        registrationId: row.registrationId,
        eventId,
        fullName: row.fullName?.trim() || '',
        email: row.email,
        phone: row.phone,
        groupName: row.groupName,
        personsAttending: row.personsAttending,
        paymentStatus: row.paymentStatus,
        paymentReference: row.paymentReference,
        ticketStatus: row.ticketStatus,
        notes: row.notes || '',
        checkedIn: false,
        checkInTime: null,
        source: row.source,
        sourceRowId: row.sourceRowId,
        timestamp: row.timestamp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      const audit = createAuditLogWrite({
        eventId,
        action: 'registration.import',
        targetType: 'registration',
        targetId: regRef.id,
        performedBy: user,
        details: { fullName: row.fullName, sourceRowId: row.sourceRowId },
      })

      batch.set(audit.ref, audit.data)
    }

    await batch.commit()
  }
}
