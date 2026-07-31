import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite } from './auditService.js'
import { buildOperationManifest, operationAuditLogId, summarizeBulkOperation } from '../utils/bulkOperation.js'

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

export async function commitImport(validRows, eventId, user, onProgress, options = {}) {
  if (!db) throw new Error('Firebase is not configured')
  if (!eventId) throw new Error('Select a Working Event before importing registrations.')

  const completedRecordIds = new Set(options.completedRecordIds || [])
  const rowsToImport = validRows.filter(({ row }) => !completedRecordIds.has(row.registrationId))
  const allRecordIds = validRows.flatMap(({ row }) => (row.registrationId ? [row.registrationId] : []))

  // Each imported registration also writes an audit log whose rule verifies
  // the paired registration create. Keep chunks below Firestore's batch rules
  // document-access ceiling. 50 registrations = 100 writes per chunk.
  const chunkSize = 50
  const manifest = buildOperationManifest({
    operationType: 'registration.import',
    eventId,
    user,
    recordIds: allRecordIds,
    chunkSize,
    operationId: options.operationId,
  })
  const completedChunks = completedRecordIds.size > 0
    ? [{ chunkIndex: 'previous', recordIds: [...completedRecordIds] }]
    : []

  for (let i = 0; i < rowsToImport.length; i += chunkSize) {
    if (onProgress) onProgress(completedRecordIds.size + i, validRows.length)
    const chunk = rowsToImport.slice(i, i + chunkSize)
    const chunkIndex = Math.floor((completedRecordIds.size + i) / chunkSize)
    const batch = writeBatch(db)

    for (const { row } of chunk) {
      if (row.eventId && row.eventId !== eventId) throw new Error('Import row event scope changed before commit.')
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
        priceTier: row.priceTier || null,
        ticketPrice: row.ticketPrice ?? null,
        amountDue: row.amountDue ?? null,
        amountPaid: row.amountPaid ?? 0,
        balanceDue: row.balanceDue ?? null,
        paymentMethod: row.paymentMethod || 'unknown',
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
        logId: operationAuditLogId(manifest.operationId, chunkIndex, regRef.id),
        details: {
          fullName: row.fullName,
          sourceRowId: row.sourceRowId,
          financeFieldsImported: true,
          operationId: manifest.operationId,
          chunkIndex,
        },
      })

      batch.set(audit.ref, audit.data)
    }

    try {
      if (options.failChunkIndex === chunkIndex) throw new Error('Injected import chunk failure.')
      await batch.commit()
      completedChunks.push({
        chunkIndex,
        recordIds: chunk.map(({ row }) => row.registrationId),
      })
    } catch (err) {
      if (import.meta.env.DEV) console.error('Chunk commit failed:', err)
      const result = summarizeBulkOperation(manifest, completedChunks, {
        chunkIndex,
        recordIds: chunk.map(({ row }) => row.registrationId),
        error: err?.message || String(err),
      })
      const error = new Error(`Failed to import batch starting at row ${completedRecordIds.size + i + 1}. ${result.message} Error: ${err.message}`)
      error.operationResult = result
      const resultCompletedIds = new Set(result.completedRecordIds)
      error.retryRows = validRows.filter(({ row }) => !resultCompletedIds.has(row.registrationId))
      throw error
    }
  }
  
  if (onProgress) onProgress(validRows.length, validRows.length)
  return summarizeBulkOperation(manifest, completedChunks)
}
