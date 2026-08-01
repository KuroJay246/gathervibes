export const IMPORT_RECORD_TYPES = [
  {
    value: 'guest-registration',
    label: 'Guest Registration',
    writeSupport: 'supported',
    helperText: 'Create reviewed guest registration rows for the selected Working Event.',
  },
  {
    value: 'payment-update',
    label: 'Payment Update',
    writeSupport: 'review-only',
    helperText: 'Review payment columns and references before a supported payment-update workflow is approved.',
  },
  {
    value: 'attendee-list',
    label: 'Attendee List',
    writeSupport: 'review-only',
    helperText: 'Review attendee-only rows without creating or changing registrations from this screen.',
  },
  {
    value: 'ticket-assignment',
    label: 'Ticket Assignment',
    writeSupport: 'review-only',
    helperText: 'Review ticket codes and assignment columns without changing tickets from this screen.',
  },
  {
    value: 'operations-entry',
    label: 'Operations Entry',
    writeSupport: 'review-only',
    helperText: 'Review sponsor, expense, refund, or adjustment rows without writing Operations entries.',
  },
  {
    value: 'staff-list',
    label: 'Volunteer',
    writeSupport: 'review-only',
    helperText: 'Review team rows only. Staff assignment editing is not activated by Import Center.',
  },
  {
    value: 'baker-application',
    label: 'Baker Application',
    writeSupport: 'review-only',
    helperText: 'Review baker application responses without creating a baker-management module.',
  },
  {
    value: 'vendor-application',
    label: 'Vendor Application',
    writeSupport: 'review-only',
    helperText: 'Review vendor application responses without creating vendor records.',
  },
  {
    value: 'sponsor-inquiry',
    label: 'Sponsor Inquiry',
    writeSupport: 'review-only',
    helperText: 'Review sponsor interest rows without adding sponsor-management features.',
  },
  {
    value: 'school-participation',
    label: 'School Participation',
    writeSupport: 'review-only',
    helperText: 'Review school participation rows without creating school-management records.',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    writeSupport: 'review-only',
    helperText: 'Review feedback responses without changing event records.',
  },
  {
    value: 'custom-review-record',
    label: 'Custom Review Record',
    writeSupport: 'review-only',
    helperText: 'Inspect unusual rows, map headers, and decide what needs a separate workflow.',
  },
]

export const IMPORT_SOURCES = [
  {
    value: 'google-forms-csv',
    label: 'Google Forms CSV',
    group: 'Forms and spreadsheet files',
    helperText: 'Download responses from Google Forms or its linked response Sheet, then upload the CSV.',
    mode: 'csv',
    fileTypes: '.csv',
    connectionStatus: 'Manual upload',
  },
  {
    value: 'google-sheets-export',
    legacyValues: ['google-sheets-csv'],
    label: 'Google Sheets Export',
    group: 'Forms and spreadsheet files',
    helperText: 'Download your Google Sheet as CSV or Excel, then upload the downloaded file.',
    mode: 'csv',
    fileTypes: '.csv',
    connectionStatus: 'Manual upload - not a live Google Sheets connection.',
  },
  {
    value: 'xlsx',
    label: 'Excel Workbook',
    group: 'Forms and spreadsheet files',
    helperText: 'Upload a saved Excel workbook, choose the worksheet, and preview before saving.',
    mode: 'xlsx',
    fileTypes: '.xlsx',
    connectionStatus: 'Local workbook parsing',
  },
  {
    value: 'custom-csv',
    legacyValues: ['custom', 'bank-payment-csv'],
    label: 'Custom CSV',
    group: 'Forms and spreadsheet files',
    helperText: 'Use this for unusual headers, payment lists, references, or exports from other systems.',
    mode: 'csv',
    fileTypes: '.csv or .txt',
    connectionStatus: 'Manual file import',
  },
  {
    value: 'pasted-table',
    label: 'Paste Table',
    group: 'Manual entry',
    helperText: 'Paste copied rows from a spreadsheet, CSV file, or tab-separated table.',
    mode: 'paste',
    fileTypes: 'Copied rows',
    connectionStatus: 'Manual paste',
  },
  {
    value: 'copy-rows-from-spreadsheet',
    label: 'Copy Rows From Spreadsheet',
    group: 'Manual entry',
    helperText: 'Copy visible spreadsheet rows, paste them here, then review detected headers.',
    mode: 'paste',
    fileTypes: 'Copied rows',
    connectionStatus: 'Manual paste',
  },
  {
    value: 'pdf-table',
    label: 'PDF Table',
    group: 'Document',
    helperText: 'Use a readable text-based PDF where supported. Scanned PDFs are not automatically read.',
    mode: 'pdf-fallback',
    fileTypes: '.pdf',
    connectionStatus: 'Fallback guidance only',
  },
  {
    value: 'google-forms-response-inbox',
    label: 'Google Forms Response Inbox',
    group: 'Review queue',
    helperText: 'Paste a Forms response export into a review queue. Nothing becomes a registration automatically.',
    mode: 'response-inbox',
    fileTypes: 'CSV response export',
    connectionStatus: 'Manual Response Review',
  },
]

export const IMPORT_WORKFLOW_STEPS = [
  'Source',
  'Record Type',
  'Upload/Paste',
  'Template',
  'Headers',
  'Mapping',
  'Validation',
  'Review',
  'Confirm',
  'Result',
]

export function getImportSource(value) {
  return IMPORT_SOURCES.find((source) => source.value === value || source.legacyValues?.includes(value)) || IMPORT_SOURCES[0]
}

export function getImportRecordType(value) {
  return IMPORT_RECORD_TYPES.find((recordType) => recordType.value === value) || IMPORT_RECORD_TYPES[0]
}

export function groupedImportSources() {
  return IMPORT_SOURCES.reduce((groups, source) => {
    const current = groups.get(source.group) || []
    current.push(source)
    groups.set(source.group, current)
    return groups
  }, new Map())
}
