import readExcelFile from 'read-excel-file/browser'
import { rowsToParsedTable } from './importUtils.js'

export async function readXlsxWorkbook(file) {
  const sheets = await readExcelFile(file)

  return sheets.map((sheet, index) => {
    const sheetName = sheet.sheet || `Sheet ${index + 1}`
    const parsed = rowsToParsedTable(sheet.data, { sourceKey: `sheet-${index + 1}` })
    return {
      id: `${index}`,
      name: sheetName,
      headers: parsed.headers,
      rows: parsed.rows,
      rawRowCount: Array.isArray(sheet.data) ? sheet.data.length : 0,
      columnCount: parsed.headers.length,
      sampleRows: Array.isArray(sheet.data) ? sheet.data.slice(0, 6) : [],
      importable: parsed.headers.length > 0 && parsed.rows.length > 0,
    }
  })
}

