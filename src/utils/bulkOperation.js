import { calculateRegistrationFinance } from './financeUtils.js'
import { normalizePaymentStatus } from './paymentStatus.js'

export function stableOperationKey(parts = []) {
  const input = parts.map((part) => String(part ?? '')).join('|')
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0).toString(36)
}

export function buildOperationManifest({ operationType, eventId, user, recordIds = [], chunkSize = 50, operationId, createdAt }) {
  const safeRecordIds = [...new Set(recordIds.filter(Boolean))]
  const resolvedOperationId = operationId || `${operationType}-${stableOperationKey([operationType, eventId, user?.uid || user?.email || 'unknown', safeRecordIds.join(',')])}`
  return {
    operationId: resolvedOperationId.slice(0, 96),
    operationType,
    eventId,
    initiatedBy: user?.uid || user?.email || 'unknown-admin',
    recordIds: safeRecordIds,
    totalRecordCount: safeRecordIds.length,
    chunkSize,
    chunkCount: Math.ceil(safeRecordIds.length / chunkSize),
    createdAt: createdAt || new Date().toISOString(),
    validationResult: 'validated',
    status: 'ready',
  }
}

export function operationAuditLogId(operationId, chunkIndex, targetId) {
  const hash = stableOperationKey([operationId, chunkIndex, targetId])
  return `${operationId}-${chunkIndex}-${hash}`.slice(0, 128)
}

export function summarizeBulkOperation(manifest, completedChunks = [], failedChunk = null) {
  const completedRecordIds = completedChunks.flatMap((chunk) => chunk.recordIds)
  const failedRecordIds = failedChunk?.recordIds || []
  const attempted = new Set([...completedRecordIds, ...failedRecordIds])
  const unattemptedRecordIds = manifest.recordIds.filter((id) => !attempted.has(id))
  const completedCount = completedRecordIds.length
  const failedCount = failedRecordIds.length
  const unattemptedCount = unattemptedRecordIds.length

  return {
    ...manifest,
    status: failedChunk ? 'partial-failure' : 'completed',
    completedChunks,
    failedChunks: failedChunk ? [failedChunk] : [],
    completedRecordIds,
    failedRecordIds,
    unattemptedRecordIds,
    completedCount,
    failedCount,
    unattemptedCount,
    message: failedChunk
      ? `${completedCount} of ${manifest.totalRecordCount} records were updated. ${failedCount + unattemptedCount} remain unchanged.`
      : `${completedCount} of ${manifest.totalRecordCount} records were updated.`,
  }
}

export function assertEventScopedRecords(records = [], eventId) {
  if (!eventId) throw new Error('Select a Working Event before starting this operation.')
  const mismatched = records.filter((record) => record.eventId !== eventId)
  if (mismatched.length) throw new Error('This operation contains records from another event and was blocked before writing.')
}

export function validateBulkPaymentStatus(registration, nextStatus, event = {}) {
  const normalizedStatus = normalizePaymentStatus(nextStatus)
  const finance = calculateRegistrationFinance(registration, event)
  const amountDue = finance.amountDue ?? 0
  const amountPaid = finance.amountPaid ?? 0
  const balanceDue = finance.balanceDue ?? Math.max(0, amountDue - amountPaid)

  if (normalizedStatus === 'paid' && (balanceDue > 0 || amountPaid < amountDue)) {
    return 'Paid status requires amount paid to cover amount due with no outstanding balance.'
  }
  if (normalizedStatus === 'complimentary' && (amountDue > 0 || amountPaid > 0 || balanceDue > 0)) {
    return 'Complimentary status requires no amount due, no amount paid, and no balance.'
  }
  if (normalizedStatus === 'door' && amountPaid <= 0) {
    return 'Door Paid status requires a confirmed amount paid.'
  }
  if (normalizedStatus === 'door-list' && balanceDue <= 0) {
    return 'To Pay at Door status requires an outstanding balance.'
  }
  if (normalizedStatus === 'pending' && amountPaid >= amountDue && amountDue > 0 && balanceDue <= 0) {
    return 'Pending status conflicts with a fully paid registration.'
  }
  return ''
}

export function assertBulkPaymentStatusAllowed(registrations = [], nextStatus, event = {}) {
  const normalizedStatus = normalizePaymentStatus(nextStatus)
  const invalid = registrations
    .map((registration) => ({
      registration,
      reason: validateBulkPaymentStatus(registration, normalizedStatus, event),
    }))
    .filter((item) => item.reason)

  if (invalid.length) {
    const first = invalid[0]
    throw new Error(`Bulk payment status blocked for ${first.registration.fullName || first.registration.registrationId}: ${first.reason}`)
  }
  return normalizedStatus
}
