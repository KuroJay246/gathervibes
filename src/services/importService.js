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
  buildInitialFieldMap,
  mapRows,
  normalizeAttendeeNames,
  validateRow,
  findDuplicate,
  processAndValidate,
} from '../utils/importUtils.js'

function importNotes(row = {}) {
  return [
    row.notes || '',
    row.preferredSchool ? `Preferred school: ${row.preferredSchool}` : '',
    row.originalPaymentStatus && row.originalPaymentStatus !== row.paymentStatus
      ? `Original payment status: ${row.originalPaymentStatus}`
      : '',
  ].filter(Boolean).join('\n')
}

export async function commitImport(validRows, eventId, user) {
  if (!db) throw new Error('Firebase is not configured')

  // Each imported registration also writes an audit log whose rule verifies
  // the paired registration create. Keep chunks below Firestore's batch rules
  // document-access ceiling.
  const chunkSize = 5
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
        buyerName: row.buyerName || null,
        attendeeNames: Array.isArray(row.attendeeNames) ? row.attendeeNames : [],
        groupName: row.groupName,
        personsAttending: row.personsAttending,
        paymentStatus: row.paymentStatus,
        paymentReference: row.paymentReference,
        ticketStatus: row.ticketCode ? 'assigned' : 'no-ticket-assigned',
        ticketCode: row.ticketCode || null,
        ticketAssignedAt: null,
        ticketAssignedBy: null,
        notes: importNotes(row),
        checkedIn: false,
        checkInTime: null,
        checkedInBy: null,
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
