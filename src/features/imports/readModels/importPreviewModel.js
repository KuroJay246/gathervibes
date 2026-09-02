import { IMPORT_LIMITS } from '../contracts/importLimits.js'

export function buildImportPreviewModel({
  parsedData = { headers: [], rows: [] },
  processedRows = [],
  finalRows = [],
  reviewActions = {},
  existingRegistrationsLoaded = false,
  importResult = null,
} = {}) {
  const headers = Array.isArray(parsedData.headers) ? parsedData.headers : []
  const rows = Array.isArray(parsedData.rows) ? parsedData.rows : []
  const blockedRows = processedRows.filter((row) => row.status === 'blocked')
  const needsReviewRows = processedRows.filter((row, index) => (
    row.status === 'needs-review'
    && (reviewActions[index] || row.defaultAction) === 'needs-review'
  ))

  return {
    headerCount: headers.length,
    parsedRowCount: rows.length,
    processedRowCount: processedRows.length,
    finalRowCount: finalRows.length,
    blockedRowCount: blockedRows.length,
    needsReviewRowCount: needsReviewRows.length,
    existingRegistrationsLoaded,
    canProceedToValidation: headers.length > 0 && rows.length > 0 && existingRegistrationsLoaded,
    canCommit: finalRows.length > 0 && needsReviewRows.length === 0,
    rowLimitExceeded: rows.length > IMPORT_LIMITS.maxRowsPerPreview,
    batchLimitExceeded: finalRows.length > IMPORT_LIMITS.maxRowsPerBatch,
    importedCount: importResult?.importedCount ?? 0,
    blockedCount: importResult?.blockedCount ?? blockedRows.length,
  }
}
