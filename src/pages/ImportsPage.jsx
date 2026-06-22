import { useState, useEffect } from 'react'
import { UploadCloud, ArrowLeft, FileSpreadsheet, Info } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { Link } from 'react-router-dom'
import { parseCSV, buildInitialFieldMap, mapRows, processAndValidate, commitImport } from '../services/importService'
import { subscribeToRegistrations } from '../services/registrationService'
import { FieldMappingForm } from '../components/imports/FieldMappingForm'
import { ImportPreviewTable } from '../components/imports/ImportPreviewTable'
import { ImportSummary } from '../components/imports/ImportSummary'
import { EmptyState } from '../components/ui/EmptyState'
import { IMPORT_SOURCES, getImportSource } from '../utils/importSources'
import { readXlsxWorkbook } from '../utils/xlsxImport'

export function ImportsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState('google-forms-csv')
  const [inputType, setInputType] = useState('upload')
  const [csvText, setCsvText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [workbookSheets, setWorkbookSheets] = useState([])
  const [selectedSheetId, setSelectedSheetId] = useState('')
  const [parsingFile, setParsingFile] = useState(false)

  const [parsedData, setParsedData] = useState({ headers: [], rows: [] })
  const [fieldMap, setFieldMap] = useState({})
  const [processedRows, setProcessedRows] = useState([])
  const [existingRegistrations, setExistingRegistrations] = useState([])

  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState(null)
  const selectedSource = getImportSource(sourceType)

  useEffect(() => {
    if (!activeEvent?.eventId) return
    const unsubscribe = subscribeToRegistrations(
      activeEvent.eventId,
      (data) => setExistingRegistrations(data),
      (err) => {
        if (import.meta.env.DEV) console.error(err)
      },
    )
    return () => unsubscribe()
  }, [activeEvent?.eventId])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const source = getImportSource(sourceType)
    setInputType(source.mode === 'paste' ? 'paste' : 'upload')
    resetImportState()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [sourceType])

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        title="No selected event"
        description="Select an event before importing registrations."
        action={(
          <Link to="/events" className="rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white">
            Choose an event
          </Link>
        )}
      />
    )
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setImportResult(null)
    setUploadedFileName(file.name)

    if (selectedSource.mode === 'xlsx') {
      setParsingFile(true)
      try {
        const sheets = await readXlsxWorkbook(file)
        const usableSheets = sheets.filter((sheet) => sheet.headers.length > 0 && sheet.rows.length > 0)
        setWorkbookSheets(usableSheets)
        if (usableSheets.length === 0) {
          setError('The workbook does not contain a sheet with headers and data rows.')
          return
        }
        if (usableSheets.length === 1) {
          setSelectedSheetId(usableSheets[0].id)
          loadParsedData(usableSheets[0].headers, usableSheets[0].rows)
        } else {
          setSelectedSheetId(usableSheets[0].id)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error(err)
        setError('The XLSX workbook could not be read. Check that it is a valid .xlsx file.')
      } finally {
        setParsingFile(false)
        e.target.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvText(event.target.result)
      parseAndMoveToMap(event.target.result)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function parseAndMoveToMap(text) {
    const { headers, rows } = parseCSV(text)
    if (headers.length === 0 || rows.length === 0) {
      setError('The CSV appears to be empty or invalid.')
      return
    }
    loadParsedData(headers, rows)
  }

  function loadParsedData(headers, rows) {
    setParsedData({ headers, rows })
    setError('')
    setFieldMap(buildInitialFieldMap(headers))
    setStep(2)
  }

  function handleSheetSelection(sheetId) {
    setSelectedSheetId(sheetId)
    const sheet = workbookSheets.find((candidate) => candidate.id === sheetId)
    if (sheet) loadParsedData(sheet.headers, sheet.rows)
  }

  async function handleProceedToPreview() {
    const mapped = mapRows(parsedData.rows, parsedData.headers, fieldMap)
    const processed = await processAndValidate(mapped, activeEvent.eventId, existingRegistrations)
    setProcessedRows(processed)
    setStep(3)
  }

  async function handleImport(validRows) {
    setImporting(true)
    setError('')
    try {
      await commitImport(validRows, activeEvent.eventId, user)
      setImportResult({
        importedCount: validRows.length,
        blockedCount: processedRows.length - validRows.length,
      })
      setStep(4)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setError('Failed to import. Check your connection and permissions.')
    } finally {
      setImporting(false)
    }
  }

  function resetImportState() {
    setStep(1)
    setCsvText('')
    setUploadedFileName('')
    setWorkbookSheets([])
    setSelectedSheetId('')
    setParsingFile(false)
    setParsedData({ headers: [], rows: [] })
    setFieldMap({})
    setProcessedRows([])
    setImportResult(null)
    setError('')
  }

  function reset() {
    resetImportState()
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/registrations" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#8C7567] hover:text-[#2B1723]">
          <ArrowLeft className="size-4" /> Back to Registrations
        </Link>
        <h2 className="font-serif text-3xl text-[#2B1723]">Import Center</h2>
        <p className="mt-2 text-sm text-[#816D62]">
          For event: <strong>{activeEvent.eventName}</strong>. CSV, pasted table rows, and Excel/XLSX workbooks all use preview before saving.
        </p>
      </header>

      {error && (
        <div className="rounded-xl bg-[#FFF1F1] p-4 text-sm text-[#A32626]">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
            <h3 className="font-serif text-xl text-[#2B1723]">Choose source</h3>
            <p className="mt-2 text-sm text-[#816D62]">Pick the closest source so the mapping step starts with the right expectations.</p>
            <div className="mt-5 grid gap-3">
              {IMPORT_SOURCES.map((source) => (
                <button
                  key={source.value}
                  type="button"
                  onClick={() => setSourceType(source.value)}
                  className={`rounded-xl border p-4 text-left transition ${sourceType === source.value ? 'border-[#B76E79] bg-[#FFF8F2]' : 'border-[#F2E8E1] bg-white hover:bg-[#FBF8F5]'}`}
                >
                  <span className="flex items-start gap-3">
                    <FileSpreadsheet className={`mt-0.5 size-5 shrink-0 ${sourceType === source.value ? 'text-[#B76E79]' : 'text-[#C4B4AA]'}`} />
                    <span>
                      <span className="block text-sm font-bold text-[#2B1723]">{source.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#816D62]">{source.helperText}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-10">
            <div className="border-b border-[#F2E8E1] pb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">{selectedSource.label}</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Load registration rows</h3>
              <p className="mt-2 text-sm leading-6 text-[#816D62]">{selectedSource.helperText}</p>
            </div>

            {selectedSource.mode === 'xlsx' ? (
              <div className="mt-8 space-y-5">
                <div className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#B76E79]">
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={parsingFile}
                  />
                  <UploadCloud className="size-10 text-[#C4B4AA]" />
                  <p className="mt-4 text-sm font-bold text-[#5D4A52]">
                    {parsingFile ? 'Reading workbook…' : 'Click or drag to upload XLSX'}
                  </p>
                  <p className="mt-1 text-center text-xs leading-5 text-[#8C7567]">
                    Formulas are not executed. Use saved/displayed values only, then preview before import.
                  </p>
                  {uploadedFileName && <p className="mt-2 text-[11px] font-bold text-[#B76E79]">{uploadedFileName}</p>}
                </div>

                {workbookSheets.length > 1 && (
                  <div className="rounded-2xl border border-[#EEDFD6] bg-[#FFFDFB] p-4">
                    <label htmlFor="xlsx-sheet" className="event-label">Choose worksheet</label>
                    <select
                      id="xlsx-sheet"
                      value={selectedSheetId}
                      onChange={(event) => handleSheetSelection(event.target.value)}
                      className="event-input"
                    >
                      {workbookSheets.map((sheet) => (
                        <option key={sheet.id} value={sheet.id}>
                          {sheet.name} ({sheet.rows.length} rows)
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs leading-5 text-[#816D62]">
                      Selecting a sheet starts the same map, preview, and confirm flow used by CSV imports.
                    </p>
                  </div>
                )}

                <div className="rounded-2xl border border-[#F2D6A3] bg-[#FFF7E8] p-5 text-sm leading-6 text-[#7A5818]">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-bold">XLSX import is enabled with preview-first safety.</p>
                      <p className="mt-1">
                        No Firestore write happens until you confirm valid rows on the preview screen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : inputType === 'upload' ? (
              <div className="relative mt-8 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#B76E79]">
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <UploadCloud className="size-10 text-[#C4B4AA]" />
                <p className="mt-4 text-sm font-bold text-[#5D4A52]">Click or drag to upload CSV</p>
                <p className="mt-1 text-xs text-[#8C7567]">Must include headers</p>
              </div>
            ) : (
              <div className="mt-8 flex flex-col">
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={'Name, Email, Phone\nJohn Doe, john@example.com, 555-0100'}
                  className="w-full rounded-xl border border-[#E5D7CF] p-4 font-mono text-sm focus:border-[#B76E79] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => parseAndMoveToMap(csvText)}
                  disabled={!csvText.trim()}
                  className="mt-4 self-end rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B] disabled:opacity-50"
                >
                  Parse rows
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <FieldMappingForm
          headers={parsedData.headers}
          fieldMap={fieldMap}
          onMapChange={setFieldMap}
          onCancel={reset}
          onProceed={handleProceedToPreview}
        />
      )}

      {step === 3 && (
        <ImportPreviewTable
          processedRows={processedRows}
          onCancel={reset}
          onImport={handleImport}
          importing={importing}
        />
      )}

      {step === 4 && (
        <ImportSummary result={importResult} onReset={reset} />
      )}
    </div>
  )
}
