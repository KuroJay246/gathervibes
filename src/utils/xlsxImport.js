import readExcelFile from 'read-excel-file/browser'
import { rowsToParsedTable } from './importUtils.js'

async function workbookInputToArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input
  if (input?.arrayBuffer) return input.arrayBuffer()
  throw new Error('Unsupported XLSX input. Upload a saved .xlsx workbook.')
}

export async function readXlsxWorkbook(file) {
  const workbookBuffer = await workbookInputToArrayBuffer(file)
  const sheets = await readExcelFile(workbookBuffer)

  return sheets.map(({ sheet: sheetName, data }, index) => {
    const sheetRows = Array.isArray(data) ? data.map((row) => (
      Array.isArray(row) ? row.map((cell) => cell ?? '') : []
    )) : []
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
