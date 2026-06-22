export const IMPORT_SOURCES = [
  {
    value: 'google-forms-csv',
    label: 'Google Forms CSV',
    helperText: 'Export responses from Google Forms/Sheets as CSV, then upload here.',
    mode: 'csv',
  },
  {
    value: 'google-sheets-csv',
    label: 'Google Sheets CSV',
    helperText: 'Download your sheet as CSV, then upload here.',
    mode: 'csv',
  },
  {
    value: 'xlsx',
    label: 'Excel/XLSX',
    helperText: 'Upload an Excel workbook. Choose the sheet and map columns before saving.',
    mode: 'deferred',
  },
  {
    value: 'pasted-table',
    label: 'Pasted table',
    helperText: 'Paste rows copied from a spreadsheet or CSV file.',
    mode: 'paste',
  },
  {
    value: 'bank-payment-csv',
    label: 'Bank/payment CSV',
    helperText: 'Import payment/reference lists and map names, emails, references, and payment status.',
    mode: 'csv',
  },
  {
    value: 'custom',
    label: 'Custom',
    helperText: 'Use this for files with unusual headers. The system will help detect headers and fields.',
    mode: 'csv',
  },
]

export function getImportSource(value) {
  return IMPORT_SOURCES.find((source) => source.value === value) || IMPORT_SOURCES[0]
}
