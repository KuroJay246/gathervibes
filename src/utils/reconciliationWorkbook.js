import readExcelFile from 'read-excel-file/browser'
import { unzip } from 'fflate'

function normalizeRows(rows = []) {
  const [headers = [], ...dataRows] = rows
  return {
    headers: headers.map((header) => String(header ?? '').trim()),
    rows: dataRows.map((row, index) => ({
      data: Array.isArray(row) ? row.map((cell) => cell ?? '') : [],
      sourceRowNumber: index + 2,
    })),
    rawRowCount: rows.length,
  }
}

export async function readReconciliationWorkbook(file) {
  let readExcelError = null
  try {
    const workbook = await readExcelFile(file)
    const sheets = Array.isArray(workbook) && workbook[0]?.data
      ? workbook.map((sheet, index) => ({
          id: `sheet-${index + 1}`,
          name: sheet.sheet || `Sheet ${index + 1}`,
          parser: 'read-excel-file',
          ...normalizeRows(sheet.data || []),
        }))
      : [{
          id: 'sheet-1',
          name: 'Workbook sheet',
          parser: 'read-excel-file',
          ...normalizeRows(workbook),
        }]
    if (sheets.some((sheet) => sheet.headers.length > 0 && sheet.rows.length > 0)) {
      const fallbackSheets = await readWorkbookWithXmlFallback(file)
      if (fallbackSheets.some((sheet) => sheet.headers.length > 0 && sheet.rows.length > 0)) {
        return fallbackSheets.map((sheet) => ({
          ...sheet,
          parser: 'xml-fallback',
          parserWarning: 'The reconciliation preview used cached worksheet XML values for deterministic local CPB review.',
        }))
      }
      return sheets
    }
    readExcelError = new Error('read-excel-file returned no usable worksheet rows.')
  } catch (err) {
    readExcelError = err
  }

  const sheets = await readWorkbookWithXmlFallback(file)
  return sheets.map((sheet) => ({
    ...sheet,
    parser: 'xml-fallback',
    parserWarning: `read-excel-file could not parse this workbook, so the preview used cached worksheet XML values only. ${readExcelError?.message || ''}`.trim(),
  }))
}

async function readWorkbookWithXmlFallback(file) {
  const entries = await unpackXlsxFile(file)
  const parser = new DOMParser()
  const workbook = parser.parseFromString(entries['xl/workbook.xml'], 'application/xml')
  const rels = parser.parseFromString(entries['xl/_rels/workbook.xml.rels'], 'application/xml')
  const sharedStrings = parseSharedStrings(entries['xl/sharedStrings.xml'], parser)
  const relTargets = new Map(elementsByLocalName(rels, 'Relationship').map((rel) => {
    const target = rel.getAttribute('Target') || ''
    return [rel.getAttribute('Id'), target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^xl\//, '')}`]
  }))

  return elementsByLocalName(workbook, 'sheet').map((sheet, index) => {
    const rid = sheet.getAttribute('r:id') || sheet.getAttribute('id')
    const path = relTargets.get(rid) || `xl/worksheets/sheet${index + 1}.xml`
    const rows = parseWorksheet(entries[path], parser, sharedStrings)
    return {
      id: `sheet-${index + 1}`,
      name: sheet.getAttribute('name') || `Sheet ${index + 1}`,
      ...normalizeRows(rows),
      formulasDetected: countTags(entries[path], '<f'),
      mergedCellsDetected: countTags(entries[path], '<mergeCell'),
    }
  })
}

async function unpackXlsxFile(file) {
  const input = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const archive = await new Promise((resolve, reject) => {
    unzip(new Uint8Array(input), (error, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })
  const decoder = new TextDecoder('utf-8')
  return Object.fromEntries(Object.entries(archive)
    .filter(([path]) => path.endsWith('.xml') || path.endsWith('.rels'))
    .map(([path, value]) => [path, decoder.decode(value)]))
}

function parseSharedStrings(xmlText, parser) {
  if (!xmlText) return []
  const doc = parser.parseFromString(xmlText, 'application/xml')
  return elementsByLocalName(doc, 'si').map((node) => elementsByLocalName(node, 't').map((textNode) => textNode.textContent || '').join(''))
}

function parseWorksheet(xmlText, parser, sharedStrings) {
  if (!xmlText) return []
  const doc = parser.parseFromString(xmlText, 'application/xml')
  return elementsByLocalName(doc, 'row').map((row) => {
    const values = []
    elementsByLocalName(row, 'c').forEach((cell) => {
      const ref = cell.getAttribute('r') || ''
      const column = columnIndex(ref.replace(/\d+/g, ''))
      values[column] = cellValue(cell, sharedStrings)
    })
    return values.map((value) => value ?? '')
  })
}

function cellValue(cell, sharedStrings) {
  const type = cell.getAttribute('t')
  const v = elementsByLocalName(cell, 'v')[0]?.textContent
  if (type === 's') return sharedStrings[Number(v)] || ''
  if (type === 'inlineStr') return elementsByLocalName(cell, 't').map((node) => node.textContent || '').join('')
  if (v === undefined || v === null) return ''
  const numeric = Number(v)
  return Number.isFinite(numeric) && String(v).trim() !== '' ? numeric : v
}

function elementsByLocalName(root, localName) {
  return [...(root?.getElementsByTagName?.('*') || [])].filter((node) => node.localName === localName || node.nodeName === localName)
}

function columnIndex(column = '') {
  return column.toUpperCase().split('').reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0) - 1
}

function countTags(xmlText = '', tagStart = '') {
  if (!xmlText || !tagStart) return 0
  return (xmlText.match(new RegExp(tagStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
}
