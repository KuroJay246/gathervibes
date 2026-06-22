import readExcelFile from 'read-excel-file/browser'
import { rowsToParsedTable } from './importUtils.js'

export async function readXlsxWorkbook(file) {
  const sheets = await readExcelFile(file)

  return sheets.map((sheet, index) => {
    const parsed = rowsToParsedTable(sheet.data)
    return {
      id: `${index}`,
      name: sheet.sheet || `Sheet ${index + 1}`,
      headers: parsed.headers,
      rows: parsed.rows,
      rawRowCount: Array.isArray(sheet.data) ? sheet.data.length : 0,
    }
  })
}

