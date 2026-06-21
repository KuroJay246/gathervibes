import { useState, useEffect } from 'react'
import { UploadCloud, ArrowLeft } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { Link } from 'react-router-dom'
import { parseCSV, mapRows, processAndValidate, commitImport } from '../services/importService'
import { subscribeToRegistrations } from '../services/registrationService'
import { FieldMappingForm } from '../components/imports/FieldMappingForm'
import { ImportPreviewTable } from '../components/imports/ImportPreviewTable'
import { ImportSummary } from '../components/imports/ImportSummary'
import { EmptyState } from '../components/ui/EmptyState'

export function ImportsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [step, setStep] = useState(1)
  const [inputType, setInputType] = useState('upload')
  const [csvText, setCsvText] = useState('')

  const [parsedData, setParsedData] = useState({ headers: [], rows: [] })
  const [fieldMap, setFieldMap] = useState({})
  const [processedRows, setProcessedRows] = useState([])
  const [existingRegistrations, setExistingRegistrations] = useState([])

  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState(null)

  useEffect(() => {
    if (!activeEvent?.eventId) return
    const unsubscribe = subscribeToRegistrations(
      activeEvent.eventId,
      (data) => setExistingRegistrations(data),
      (err) => console.error(err),
    )
    return () => unsubscribe()
  }, [activeEvent?.eventId])

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        title="No active event selected"
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
      else if (lower.includes('pay')) initialMap.paymentStatus = i
      else if (lower.includes('timestamp') || lower.includes('submitted')) initialMap.timestamp = i
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
      console.error(err)
      setError('Failed to import. Check your connection and permissions.')
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setStep(1)
    setCsvText('')
    setParsedData({ headers: [], rows: [] })
    setFieldMap({})
    setProcessedRows([])
    setImportResult(null)
    setError('')
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/registrations" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#8C7567] hover:text-[#2B1723]">
          <ArrowLeft className="size-4" /> Back to Registrations
        </Link>
        <h2 className="font-serif text-3xl text-[#2B1723]">Import Registrations</h2>
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
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-10">
          <div className="flex justify-center gap-4 border-b border-[#F2E8E1] pb-6">
            <button
              type="button"
              onClick={() => setInputType('upload')}
              className={`rounded-full px-6 py-2 text-sm font-bold transition ${inputType === 'upload' ? 'bg-[#2B1723] text-white' : 'text-[#8C766A] hover:bg-[#F2E8E1]'}`}
            >
              Upload File
            </button>
            <button
              type="button"
              onClick={() => setInputType('paste')}
              className={`rounded-full px-6 py-2 text-sm font-bold transition ${inputType === 'paste' ? 'bg-[#2B1723] text-white' : 'text-[#8C766A] hover:bg-[#F2E8E1]'}`}
            >
              Paste Text
            </button>
          </div>

          <div className="mt-8">
            {inputType === 'upload' ? (
              <div className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#B76E79]">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <UploadCloud className="size-10 text-[#C4B4AA]" />
                <p className="mt-4 text-sm font-bold text-[#5D4A52]">Click or drag to upload CSV</p>
                <p className="mt-1 text-xs text-[#8C7567]">Must include headers</p>
              </div>
            ) : (
              <div className="flex flex-col">
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
