export const IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRowsPerBatch: 500,
  maxRowsPerPreview: 1000,
  maxRetryRows: 100,
}

export const IMPORT_RISK_ACTIONS = [
  'confirmed-import-batch',
  'bulk-registration-create',
  'bulk-registration-update',
  'bulk-registration-delete',
]
