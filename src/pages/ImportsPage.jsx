import { useState, useEffect } from 'react'
import { UploadCloud, ArrowLeft, FileSpreadsheet, Info } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { Link } from 'react-router-dom'
import { parseCSV, mapRows, processAndValidate, commitImport } from '../services/importService'
import { subscribeToRegistrations } from '../services/registrationService'
import { FieldMappingForm } from '../components/imports/FieldMappingForm'
import { ImportPreviewTable } from '../components/imports/ImportPreviewTable'
import { ImportSummary } from '../components/imports/ImportSummary'
import { EmptyState } from '../components/ui/EmptyState'
import { IMPORT_SOURCES, getImportSource } from '../utils/importSources'

export function ImportsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState('google-forms-csv')
  const [inputType, setInputType] = useState('upload')
  const [csvText, setCsvText] = useState('')

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

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setCsvText(event.target.result)
      parseAndMoveToMap(event.target.result)
    }
    reader.readAsText(file)
  }

  function parseAndMoveToMap(text) {
    const { headers, rows } = parseCSV(text)
    if (headers.length === 0 || rows.length === 0) {
      setError('The CSV appears to be empty or invalid.')
      return
    }
    setParsedData({ headers, rows })
    setError('')

    const initialMap = {}
    headers.forEach((h, i) => {
      const lower = h.toLowerCase()
      if (lower.includes('name') && !lower.includes('group')) initialMap.fullName = i
      else if (lower.includes('email')) initialMap.email = i
      else if (lower.includes('phone')) initialMap.phone = i
      else if (lower.includes('group')) initialMap.groupName = i
      else if (lower.includes('person') || lower.includes('ticket')) initialMap.personsAttending = i
      else if (lower.includes('reference') || lower.includes('receipt') || lower.includes('transaction')) initialMap.paymentReference = i
      else if (lower.includes('pay')) initialMap.paymentStatus = i
      else if (lower.includes('timestamp') || lower.includes('submitted')) initialMap.timestamp = i
      else if (lower.includes('note') || lower.includes('comment')) initialMap.notes = i
    })
    setFieldMap(initialMap)
    setStep(2)
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
          For event: <strong>{activeEvent.eventName}</strong>. Google Sheets OAuth remains deferred; export CSV from Google Forms or Sheets first.
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
                      {source.mode === 'deferred' && (
                        <span className="mt-2 inline-flex rounded-full bg-[#FFF4DF] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#986F26]">
                          Coming next
                        </span>
                      )}
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

            {selectedSource.mode === 'deferred' ? (
              <div className="mt-8 rounded-2xl border border-[#F2D6A3] bg-[#FFF7E8] p-5 text-sm leading-6 text-[#7A5818]">
                <div className="flex gap-3">
                  <Info className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-bold">XLSX upload is deferred in this pass.</p>
                    <p className="mt-1">
                      Export the workbook sheet as CSV and choose Google Sheets CSV or Custom for now. Direct XLSX parsing will need a maintained parser dependency, sheet selection, and dedicated tests before it is enabled.
                    </p>
                  </div>
                </div>
              </div>
            ) : inputType === 'upload' ? (
              <div className="relative mt-8 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#B76E79]">
                <input
                  type="file"
                  accept=".csv,.txt"
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
                  Parse CSV
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
