import * as XLSX from 'xlsx'
import { rowsToParsedTable } from './importUtils.js'

async function workbookInputToArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input
  if (input?.arrayBuffer) return input.arrayBuffer()
  throw new Error('Unsupported XLSX input. Upload a saved .xlsx workbook.')
}

export async function readXlsxWorkbook(file) {
  const workbookBuffer = await workbookInputToArrayBuffer(file)
  const workbook = XLSX.read(workbookBuffer, { type: 'array', cellDates: true })

  return workbook.SheetNames.map((sheetName, index) => {
    const worksheet = workbook.Sheets[sheetName]
    const sheetRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false,
      defval: '',
      raw: false,
    })
    const parsed = rowsToParsedTable(sheetRows, { sourceKey: `sheet-${index + 1}` })

    return {
      id: `${index}`,
      name: sheetName || `Sheet ${index + 1}`,
      headers: parsed.headers,
      rows: parsed.rows,
      rawRowCount: Array.isArray(sheetRows) ? sheetRows.length : 0,
      columnCount: parsed.headers.length,
      sampleRows: Array.isArray(sheetRows) ? sheetRows.slice(0, 6) : [],
      importable: parsed.headers.length > 0 && parsed.rows.length > 0,
    }
  })
}
