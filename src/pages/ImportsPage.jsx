import { useState, useEffect } from 'react'
import { UploadCloud, ArrowLeft, FileSpreadsheet, Info } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { Link } from 'react-router'
import { parseCSV, buildInitialFieldMap, mapRows, processAndValidate, commitImport } from '../services/importService'
import { mergeRowsIntoGroupRegistration } from '../utils/importUtils'
import { subscribeToRegistrations } from '../services/registrationService'
import { FieldMappingForm } from '../components/imports/FieldMappingForm'
import { ImportPreviewTable } from '../components/imports/ImportPreviewTable'
import { ImportSummary } from '../components/imports/ImportSummary'
import { ImportTemplatesPanel } from '../components/imports/ImportTemplatesPanel'
import { EmptyState } from '../components/ui/EmptyState'
import { InfoHint } from '../components/ui/InfoHint'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageTabs } from '../components/ui/PageTabs'
import {
  IMPORT_WORKFLOW_STEPS,
  getImportRecordType,
  getImportSource,
  groupedImportSources,
  IMPORT_RECORD_TYPES,
} from '../utils/importSources'
import { readXlsxWorkbook } from '../utils/xlsxImport'
import { calculateRegistrationFinance } from '../utils/financeUtils'
import {
  FORM_INBOX_COLUMNS,
  FORM_REVIEW_ACTIONS,
  FORM_TARGET_TYPES,
  applyFormInboxAction,
  buildFormInboxSummary,
  buildFormResponsesFromParsedRows,
  buildManualFormConnection,
  findFormResponseDuplicateCandidates,
  formConnectionStatusLabel,
  formResponseStatusLabel,
} from '../utils/formResponseInbox'

function isPermissionDeniedImportError(err) {
  const text = `${err?.code || ''} ${err?.message || ''}`.toLowerCase()
  return text.includes('permission-denied') || text.includes('permission denied') || text.includes('insufficient permissions')
}

function buildSafeImportErrorDetails(err, rowCount) {
  const operationResult = err?.operationResult || null
  return {
    step: 'confirmed-import-batch',
    attemptedRows: rowCount,
    writes: 'registration create plus audit log create',
    code: err?.code || err?.name || 'unknown',
    message: String(err?.message || err || 'Unknown import failure').replace(/\s+/g, ' ').slice(0, 500),
    operationId: operationResult?.operationId || null,
    completedRows: operationResult?.completedCount ?? 0,
    failedRows: operationResult?.failedCount ?? 0,
    unattemptedRows: operationResult?.unattemptedCount ?? 0,
    retryableRows: (operationResult?.failedCount ?? 0) + (operationResult?.unattemptedCount ?? 0),
    privacy: 'Guest row values are not included in this diagnostic.',
  }
}

export function ImportsPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [step, setStep] = useState(1)
  const [sourceType, setSourceType] = useState('google-forms-csv')
  const [recordType, setRecordType] = useState('guest-registration')
  const [inputType, setInputType] = useState('upload')
  const [csvText, setCsvText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [workbookSheets, setWorkbookSheets] = useState([])
  const [selectedSheetId, setSelectedSheetId] = useState('')
  const [confirmedSheetId, setConfirmedSheetId] = useState('')
  const [parsingFile, setParsingFile] = useState(false)

  const [parsedData, setParsedData] = useState({ headers: [], rows: [] })
  const [importContext, setImportContext] = useState({})
  const [fieldMap, setFieldMap] = useState({})
  const [processedRows, setProcessedRows] = useState([])
  const [reviewActions, setReviewActions] = useState({})
  const [finalRows, setFinalRows] = useState([])
  const [existingRegistrations, setExistingRegistrations] = useState([])
  const [existingRegistrationsLoaded, setExistingRegistrationsLoaded] = useState(false)
  const [ticketMode, setTicketMode] = useState('use-imported')
  const [formsInboxText, setFormsInboxText] = useState('')
  const [formsInboxTargetType, setFormsInboxTargetType] = useState('guest-registration')
  const [formsInboxResponses, setFormsInboxResponses] = useState([])
  const [activeImportTab, setActiveImportTab] = useState('import')

  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [error, setError] = useState('')
  const [importErrorDetails, setImportErrorDetails] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [changeSheetConfirmationOpen, setChangeSheetConfirmationOpen] = useState(false)
  const selectedSource = getImportSource(sourceType)
  const selectedRecordType = getImportRecordType(recordType)
  const sourceGroups = groupedImportSources()
  const selectedSheet = workbookSheets.find((sheet) => sheet.id === selectedSheetId)
  const canConfirmSheet = Boolean(selectedSheet?.importable)
  const formsInboxSummary = buildFormInboxSummary(formsInboxResponses)
  const manualFormsConnection = buildManualFormConnection(activeEvent, {
    targetType: formsInboxTargetType,
    status: 'draft',
    connectionName: `${activeEvent?.eventName || 'Selected event'} manual form response review`,
  })
  const formsInboxConnectionLabel = formConnectionStatusLabel(manualFormsConnection)
  const workflowStepIndex = step === 1
    ? 2
    : step === 2
      ? 3
      : step === 3
        ? 5
        : step === 4
          ? 7
          : step === 5
            ? 8
            : 9

  useEffect(() => {
    resetImportState()
  }, [activeEvent?.eventId])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setExistingRegistrations([])
    setExistingRegistrationsLoaded(false)
    if (!activeEvent?.eventId) return
    const unsubscribe = subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setExistingRegistrations(data)
        setExistingRegistrationsLoaded(true)
      },
      (err) => {
        if (import.meta.env.DEV) console.error(err)
        setExistingRegistrationsLoaded(true)
      },
    )
    return () => unsubscribe()
    /* eslint-enable react-hooks/set-state-in-effect */
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
          <Link to="/events" className="rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white">
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
    setImportErrorDetails(null)
    setImportResult(null)
    setUploadedFileName(file.name)

    if (selectedSource.mode === 'xlsx') {
      setParsingFile(true)
      try {
        const sheets = await readXlsxWorkbook(file)
        setWorkbookSheets(sheets)
        setSelectedSheetId(sheets[0]?.id || '')
        setConfirmedSheetId('')
        setParsedData({ headers: [], rows: [] })
        setFieldMap({})
        setProcessedRows([])
        setFinalRows([])
        setReviewActions({})
        if (sheets.length === 0) {
          setError('The workbook does not contain any sheets.')
          return
        }
        setStep(2)
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
      parseAndMoveToMap(event.target.result, { sourceFileName: file.name, importBatchId: file.name })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function parseAndMoveToMap(text, context = {}) {
    const { headers, rows } = parseCSV(text)
    if (headers.length === 0 || rows.length === 0) {
      setError('The CSV appears to be empty or invalid.')
      return
    }
    loadParsedData(headers, rows, context)
  }

  function loadParsedData(headers, rows, context = {}) {
    setParsedData({ headers, rows })
    setError('')
    setImportErrorDetails(null)
    setImportContext(context)
    setFieldMap(buildInitialFieldMap(headers))
    setProcessedRows([])
    setFinalRows([])
    setReviewActions({})
    setStep(3)
  }

  function handleSheetSelection(sheetId) {
    setSelectedSheetId(sheetId)
  }

  function confirmSheetSelection() {
    const sheet = workbookSheets.find((candidate) => candidate.id === selectedSheetId)
    if (!sheet?.importable) {
      setError('This sheet does not appear to contain importable rows.')
      return
    }
    setConfirmedSheetId(sheet.id)
    
    loadParsedData(sheet.headers, sheet.rows, {
      sourceFileName: uploadedFileName,
      sourceSheetName: sheet.name,
      importBatchId: `${uploadedFileName}:${sheet.name}`,
    })
  }

  function handleChangeSheet() {
    setChangeSheetConfirmationOpen(true)
  }

  function confirmChangeSheet() {
    setChangeSheetConfirmationOpen(false)
    setConfirmedSheetId('')
    setParsedData({ headers: [], rows: [] })
    setFieldMap({})
    setProcessedRows([])
    setFinalRows([])
    setReviewActions({})
    setTicketMode('use-imported')
    setStep(2)
  }

  function handleBackToHeaderMapping() {
    setProcessedRows([])
    setReviewActions({})
    setFinalRows([])
    setError('')
    setImportErrorDetails(null)
    setStep(3)
  }

  function handleBackToDuplicateReview() {
    setFinalRows([])
    setError('')
    setImportErrorDetails(null)
    setStep(4)
  }

  async function handleProceedToPreview() {
    if (selectedRecordType.writeSupport !== 'supported') {
      setError(`${selectedRecordType.label} is review-only in this prototype. Automatic writes are not enabled for this record type.`)
      return
    }
    if (!existingRegistrationsLoaded) {
      setError('Still loading the current Working Event registrations. Wait a moment so duplicate checks use the latest event data.')
      return
    }
    setImportErrorDetails(null)
    const mapped = mapRows(parsedData.rows, parsedData.headers, fieldMap, { ...importContext, event: activeEvent })
    const processed = await processAndValidate(mapped, activeEvent.eventId, existingRegistrations)
    setProcessedRows(processed)
    setReviewActions(Object.fromEntries(processed.map((row, index) => [index, row.defaultAction])))
    setFinalRows([])
    setStep(4)
  }

  function handleReviewAction(index, action) {
    setReviewActions((prev) => ({ ...prev, [index]: action }))
  }

  async function reprocessRows(rows, editedIndex = null) {
    const processed = await processAndValidate(rows, activeEvent.eventId, existingRegistrations)
    if (editedIndex !== null && processed[editedIndex]?.row) {
      processed[editedIndex].row.edited = true
    }
    setProcessedRows(processed)
    setReviewActions((prev) => Object.fromEntries(processed.map((row, index) => [
      index,
      prev[index] && prev[index] !== 'blocked' ? prev[index] : row.defaultAction,
    ])))
    setFinalRows([])
    return processed
  }

  async function handleRowEdit(index, updates) {
    const nextRows = processedRows.map((processed, rowIndex) => {
      if (rowIndex !== index) return processed.row
      return {
        ...processed.row,
        ...updates,
        ...calculateRegistrationFinance({ ...processed.row, ...updates }, activeEvent),
        originalPaymentStatus: updates.paymentStatus ? null : updates.originalPaymentStatus || processed.row.originalPaymentStatus,
        edited: true,
      }
    })
    await reprocessRows(nextRows, index)
  }

  async function handleRevalidateAll() {
    await reprocessRows(processedRows.map((processed) => processed.row))
  }

  function rowsWithTicketMode(rows, mode = ticketMode) {
    if (mode !== 'generate-missing') return rows
    const existingCodes = new Set([
      ...existingRegistrations.map((registration) => registration.ticketCode).filter(Boolean),
      ...rows.map((processed) => processed.row.ticketCode).filter(Boolean),
    ])
    return rows.map((processed, index) => {
      if (processed.row.ticketCode) return processed
      let candidate = `IMP-${String(index + 1).padStart(3, '0')}`
      let attempt = index + 1
      while (existingCodes.has(candidate)) {
        attempt += 1
        candidate = `IMP-${String(attempt).padStart(3, '0')}`
      }
      existingCodes.add(candidate)
      return {
        ...processed,
        row: {
          ...processed.row,
          ticketCode: candidate,
          ticketStatus: 'assigned',
          edited: true,
        },
      }
    })
  }

  function buildFinalRowsFromReview() {
    const final = []
    const mergedGroups = new Set()
    const mergeKeyForRow = (processed, index) => {
      const group = processed.row.groupName?.trim().toLowerCase()
      if (group) return `group:${group}`
      return processed.duplicateGroupKey || `row-${index}`
    }

    processedRows.forEach((processed, index) => {
      const action = reviewActions[index] || processed.defaultAction
      if (processed.status === 'blocked' || action === 'blocked' || action === 'skip' || action === 'needs-review') return

      if (action === 'merge') {
        const key = mergeKeyForRow(processed, index)
        if (mergedGroups.has(key)) return
        mergedGroups.add(key)
        const groupRows = processedRows.filter((candidate, candidateIndex) => (
          mergeKeyForRow(candidate, candidateIndex) === key
          && (reviewActions[candidateIndex] || candidate.defaultAction) === 'merge'
        ))
        const merged = mergeRowsIntoGroupRegistration(groupRows)
        final.push({
          ...merged,
          row: merged.row || processed.row,
          status: merged.status,
          issues: merged.issues,
        })
        return
      }

      final.push({ ...processed, status: processed.status === 'needs-review' ? 'valid' : processed.status })
    })

    return final
  }

  function handleContinueToFinalPreview() {
    const unresolved = processedRows.some((processed, index) => (
      processed.status === 'needs-review' && (reviewActions[index] || processed.defaultAction) === 'needs-review'
    ))
    if (unresolved) {
      setError('Choose Keep Separate, Merge Into One Group Registration, or Skip Row for every Needs Review row.')
      return
    }

    const nextFinalRows = rowsWithTicketMode(buildFinalRowsFromReview())
    setFinalRows(nextFinalRows)
    setError('')
    setImportErrorDetails(null)
    setStep(5)
  }

  async function handleImport(validRows) {
    if (validRows.length === 0) {
      setImportResult({ importedCount: 0, blockedCount: processedRows.length })
      setImportErrorDetails(null)
      setError('No rows were imported because every row is blocked or skipped. Go back to Duplicate Review or start over with a corrected file.')
      return
    }

    setImporting(true)
    setImportProgress(0)
    setError('')
    setImportErrorDetails(null)
    try {
      const result = await commitImport(validRows, activeEvent.eventId, user, (current) => setImportProgress(current))
      setImportResult({
        importedCount: result.completedCount,
        blockedCount: processedRows.length - validRows.length,
        operationId: result.operationId,
        message: result.message,
      })
      setStep(6)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setImportErrorDetails(buildSafeImportErrorDetails(err, validRows.length))
      setError(
        isPermissionDeniedImportError(err)
          ? 'Import failed because your account could not save the confirmed rows. No rows were imported. This usually means the confirmed import payload no longer matches the current workspace rules or required fields.'
          : err.operationResult?.message || 'Import failed before any rows were imported. Check the diagnostic details below and try again.',
      )
    } finally {
      setImporting(false)
    }
  }

  async function copyImportErrorDetails() {
    if (!importErrorDetails) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(importErrorDetails, null, 2))
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
    }
  }

  function resetImportState() {
    setStep(1)
    setImporting(false)
    setCsvText('')
    setUploadedFileName('')
    setWorkbookSheets([])
    setSelectedSheetId('')
    setConfirmedSheetId('')
    setParsingFile(false)
    setParsedData({ headers: [], rows: [] })
    setImportContext({})
    setFieldMap({})
    setProcessedRows([])
    setReviewActions({})
    setFinalRows([])
    setTicketMode('use-imported')
    setImportResult(null)
    setError('')
    setImportErrorDetails(null)
    setActiveImportTab('import')
    setFormsInboxText('')
    setFormsInboxResponses([])
  }

  function previewFormsInbox() {
    const parsed = parseCSV(formsInboxText)
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError('The Google Forms response export appears to be empty or invalid.')
      return
    }
    const connection = buildManualFormConnection(activeEvent, {
      targetType: formsInboxTargetType,
      status: 'draft',
      connectionName: `${activeEvent.eventName} manual form response review`,
    })
    const responses = buildFormResponsesFromParsedRows(parsed.headers, parsed.rows, { connection })
      .map((response) => ({
        ...response,
        duplicateCandidates: findFormResponseDuplicateCandidates(response, formsInboxResponses, existingRegistrations),
      }))
      .map((response) => response.duplicateCandidates.length > 0
        ? { ...response, status: 'needs-review', warnings: [...response.warnings, 'Possible duplicate found.'] }
        : response)
    setParsedData(parsed)
    setImportContext({
      sourceFileName: 'google-forms-response-inbox',
      importBatchId: `forms-inbox-${Date.now()}`,
      formTargetType: formsInboxTargetType,
    })
    setFormsInboxResponses(responses)
    setActiveImportTab('response-inbox')
    setError('')
  }

  function handleFormsInboxAction(responseId, action) {
    setFormsInboxResponses((prev) => prev.map((response) => (
      response.responseId === responseId ? applyFormInboxAction(response, action) : response
    )))
  }

  function continueApprovedFormsToMapping() {
    const approvedIds = new Set(formsInboxResponses.filter((response) => response.status === 'approved').map((response) => response.responseId))
    if (approvedIds.size === 0) {
      setError('Approve at least one response before continuing to mapping. Nothing is imported automatically.')
      return
    }
    const filteredRows = parsedData.rows.filter((row, index) => {
      const response = formsInboxResponses[index]
      return response && approvedIds.has(response.responseId)
    })
    loadParsedData(parsedData.headers, filteredRows, {
      ...importContext,
      approvedResponseCount: approvedIds.size,
      sourceFileName: 'google-forms-response-inbox',
    })
    setActiveImportTab('import')
  }

  function reset() {
    resetImportState()
  }

  return (
    <div data-tour-id="imports-workspace" className="space-y-6">
      <header>
        <Link to="/registrations" className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#6B564C] hover:text-[#2B1723]">
          <ArrowLeft className="size-4" /> Back to Registrations
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl text-[#2B1723]">Import Center</h2>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-[#816D62]">
                For event: <strong>{activeEvent.eventName}</strong>. Sources are event-scoped, preview before saving is required, and no registration is saved before final confirmation.
              </p>
              <InfoHint label="Import Flow">
                Flow: Source &rarr; Record Type &rarr; Upload/Paste &rarr; Template &rarr; Headers &rarr; Mapping &rarr; Validation &rarr; Review &rarr; Confirm &rarr; Result.
              </InfoHint>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_24px_rgba(43,23,35,0.04)]">
        <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Selected import context</p>
            <p className="mt-1 text-sm font-bold text-[#2B1723]">{selectedSource.label} &rarr; {selectedRecordType.label}</p>
            <p className="mt-1 text-xs leading-5 text-[#80685B]">
              {selectedSource.connectionStatus}. {selectedRecordType.helperText}
            </p>
          </div>
          <ol className="grid grid-cols-2 gap-2 text-[10px] font-bold uppercase tracking-wider text-[#80685B] sm:grid-cols-5">
            {IMPORT_WORKFLOW_STEPS.map((label, index) => {
              const stageStatus = index < workflowStepIndex ? 'Completed' : index === workflowStepIndex ? 'Current step' : 'Upcoming'
              return (
              <li key={label} className={`rounded-full px-3 py-2 text-center ${index < workflowStepIndex ? 'bg-[#2B1723] text-white' : index === workflowStepIndex ? 'bg-[#FFF8EA] text-[#7A5818]' : 'bg-[#F7F1ED]'}`}>
                <span className="sr-only">{stageStatus}: </span>
                {label}
              </li>
              )
            })}
          </ol>
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-[#FFF1F1] p-4 text-sm text-[#A32626]">
          <p className="mb-1 font-bold">{importErrorDetails ? 'Import failed' : 'Action needed'}</p>
          <p>{error}</p>
          {importErrorDetails && (
            <div className="mt-3 rounded-lg border border-[#F3C2C2] bg-white/70 p-3 text-xs leading-5 text-[#7E1E1E]">
              <p className="font-bold">Safe diagnostic details</p>
              <p>No guest row values are shown here. The import batch is atomic, so a denied write means no rows were imported.</p>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <div><dt className="font-bold">Step</dt><dd>{importErrorDetails.step}</dd></div>
                <div><dt className="font-bold">Rows attempted</dt><dd>{importErrorDetails.attemptedRows}</dd></div>
                <div><dt className="font-bold">Write type</dt><dd>{importErrorDetails.writes}</dd></div>
                <div><dt className="font-bold">Code</dt><dd>{importErrorDetails.code}</dd></div>
              </dl>
              <button
                type="button"
                onClick={copyImportErrorDetails}
                className="mt-3 rounded-lg border border-[#F3C2C2] px-3 py-1.5 text-xs font-bold text-[#A32626] hover:bg-[#FFF1F1]"
              >
                Copy Error Details
              </button>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <PageTabs
          label="Import Center views"
          active={activeImportTab}
          onChange={setActiveImportTab}
          tabs={[
            { id: 'import', label: 'Import Data' },
            { id: 'response-inbox', label: 'Response Inbox', count: formsInboxResponses.length },
            { id: 'templates', label: 'Templates / Help' },
          ]}
        />
      )}

      {step === 1 && (
        <div id="import-panel" role="tabpanel" hidden={activeImportTab !== 'import'} className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
            <h3 className="font-serif text-xl text-[#2B1723]">Choose source</h3>
            <p className="mt-2 text-sm text-[#816D62]">Pick the closest source so the mapping step starts with the right expectations.</p>
            <div className="mt-5 space-y-5">
              {[...sourceGroups.entries()].map(([group, sources]) => (
                <div key={group}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">{group}</p>
                  <div className="grid gap-3">
                    {sources.map((source) => (
                      <button
                        key={source.value}
                        type="button"
                        onClick={() => setSourceType(source.value)}
                        className={`rounded-xl border p-4 text-left transition ${
                          selectedSource.value === source.value
                            ? 'border-[#9A5260] bg-[#FFF8F2]'
                            : 'border-[#F2E8E1] bg-white hover:bg-[#FBF8F5]'
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <FileSpreadsheet className={`mt-0.5 size-5 shrink-0 ${selectedSource.value === source.value ? 'text-[#9A5260]' : 'text-[#C4B4AA]'}`} />
                          <span>
                            <span className="block text-sm font-bold text-[#2B1723]">{source.label}</span>
                            <span className="mt-1 block text-xs leading-5 text-[#816D62]">{source.helperText}</span>
                            <span className="mt-2 inline-flex rounded-full bg-[#F7F1ED] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{source.connectionStatus}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-[#F2E8E1] pt-5">
              <h3 className="font-serif text-xl text-[#2B1723]">Choose record type</h3>
              <p className="mt-2 text-sm text-[#816D62]">Only Guest Registration writes are enabled here. Other record types are review-only until their real workflows exist.</p>
              <div className="mt-4 grid gap-2">
                {IMPORT_RECORD_TYPES.map((candidate) => (
                  <button
                    key={candidate.value}
                    type="button"
                    onClick={() => setRecordType(candidate.value)}
                    className={`rounded-xl border px-4 py-3 text-left ${recordType === candidate.value ? 'border-[#9A5260] bg-[#FFF8F2]' : 'border-[#F2E8E1] bg-white hover:bg-[#FBF8F5]'}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold text-[#2B1723]">{candidate.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#816D62]">{candidate.helperText}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-[#F7F1ED] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">
                        {candidate.writeSupport === 'supported' ? 'Writes supported' : 'Review only'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-10">
            <div className="border-b border-[#F2E8E1] pb-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">{selectedSource.label}</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Load registration rows</h3>
              <p className="mt-2 text-sm leading-6 text-[#816D62]">{selectedSource.helperText}</p>
            </div>

            {selectedSource.mode === 'pdf-fallback' ? (
              <div className="mt-8 rounded-2xl border border-[#F2D6A3] bg-[#FFF7E8] p-5 text-sm leading-6 text-[#7A5818]">
                <div className="flex gap-3">
                  <Info className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="font-bold">PDF table import needs a safer source format.</p>
                    <p className="mt-1">This app does not extract table data directly from PDF files. Export the original spreadsheet to CSV/XLSX, or copy the visible table rows and use Paste Table.</p>
                    <button type="button" onClick={() => setSourceType('pasted-table')} className="mt-4 rounded-xl bg-[#2B1723] px-5 py-2.5 text-sm font-bold text-white">Use Paste Table Instead</button>
                  </div>
                </div>
              </div>
            ) : selectedSource.mode === 'response-inbox' ? (
              <div className="mt-8 rounded-2xl border border-[#EEDFD6] bg-[#FFFDFC] p-5">
                <p className="text-sm font-bold text-[#2B1723]">Use the Google Forms Response Inbox below.</p>
                <p className="mt-2 text-sm leading-6 text-[#816D62]">Paste exported response rows, review them, approve safe guest-registration responses, then continue approved rows to mapping. No automatic receiver is deployed from this screen.</p>
              </div>
            ) : selectedSource.mode === 'xlsx' ? (
              <div className="mt-8 space-y-5">
                <div className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#9A5260]">
                  <input
                    aria-label="Upload XLSX workbook"
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
                  <p className="mt-1 text-center text-xs leading-5 text-[#6B564C]">
                    Formulas are not executed. Use saved/displayed values only, then preview before import.
                  </p>
                  {uploadedFileName && <p className="mt-2 text-[11px] font-bold text-[#9A5260]">{uploadedFileName}</p>}
                </div>

                <div className="rounded-2xl border border-[#F2D6A3] bg-[#FFF7E8] p-5 text-sm leading-6 text-[#7A5818]">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-bold">XLSX import is enabled with preview-first safety.</p>
                      <p className="mt-1">
                        No event records are saved until you confirm valid rows on the preview screen.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : inputType === 'upload' ? (
              <div className="relative mt-8 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DFD0C8] bg-[#FBF8F5] transition hover:border-[#9A5260]">
                <input
                  aria-label="Upload CSV or text file"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <UploadCloud className="size-10 text-[#C4B4AA]" />
                <p className="mt-4 text-sm font-bold text-[#5D4A52]">Click or drag to upload CSV</p>
                <p className="mt-1 text-xs text-[#6B564C]">Must include headers. Tab-separated copied exports are also supported through Paste Table.</p>
              </div>
            ) : (
              <div className="mt-8 flex flex-col">
                <textarea
                  aria-label="Paste registration rows"
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={'Name\tEmail\tPhone\nJohn Doe\tjohn@example.com\t555-0100'}
                  className="w-full rounded-xl border border-[#E5D7CF] p-4 font-mono text-sm focus:border-[#9A5260] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => parseAndMoveToMap(csvText, { sourceFileName: 'pasted-table', importBatchId: `pasted-${Date.now()}` })}
                  disabled={!csvText.trim()}
                  className="mt-4 self-end rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B] disabled:opacity-50"
                >
                  Parse rows
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8">
          {activeImportTab === 'response-inbox' && (
          <section id="response-inbox-panel" role="tabpanel" data-tour-id="response-inbox-workspace" className="mb-8 rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Google Forms Response Inbox</p>
                <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Review responses before mapping or import</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
                  New, Needs Review, Approved, Ready to Import, Waiting for Information, Duplicates, and History views all stay event-scoped. No response becomes a registration automatically. Nothing becomes a registration automatically.
                </p>
              </div>
              <span className="w-fit rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A5818]">
                {formsInboxConnectionLabel}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {FORM_INBOX_COLUMNS.map((label) => (
                <div key={label} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-xs font-bold text-[#5D4A52]">{label}</div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-3 rounded-2xl border border-[#F2E8E1] bg-[#FFFDFC] p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B564C]" htmlFor="forms-target-type">Target type</label>
                <select
                  id="forms-target-type"
                  value={formsInboxTargetType}
                  onChange={(event) => setFormsInboxTargetType(event.target.value)}
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm focus:border-[#9A5260] focus:outline-none"
                >
                  {FORM_TARGET_TYPES.map((target) => <option key={target} value={target}>{target.replaceAll('-', ' ')}</option>)}
                </select>
                <p className="text-xs leading-5 text-[#816D62]">
                  Guest registration responses can continue into the existing import mapper. Baker, vendor, sponsor, volunteer, school, feedback, and custom responses remain review records until a supported conversion is approved.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  aria-label="Paste Google Forms response export"
                  rows={6}
                  value={formsInboxText}
                  onChange={(event) => setFormsInboxText(event.target.value)}
                  placeholder={'Timestamp,Response ID,Full Name,Email Address,Contact Number\n2026-07-30T12:00:00Z,response-1,Test Guest,test@example.com,2465550100'}
                  className="w-full rounded-xl border border-[#E5D7CF] p-4 font-mono text-sm focus:border-[#9A5260] focus:outline-none"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={previewFormsInbox} disabled={!formsInboxText.trim()} className="rounded-xl bg-[#2B1723] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    Preview in Response Inbox
                  </button>
                  <button type="button" onClick={continueApprovedFormsToMapping} disabled={formsInboxSummary.convertible === 0 || formsInboxTargetType !== 'guest-registration'} className="rounded-xl bg-[#9A5260] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    Continue Approved to Mapping
                  </button>
                </div>
              </div>
            </div>

            {formsInboxResponses.length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-[#FBF8F5] p-3 text-sm"><strong>{formsInboxSummary.total}</strong><br />Total responses</div>
                  <div className="rounded-xl bg-[#FFF8EA] p-3 text-sm"><strong>{formsInboxSummary.reviewRequired}</strong><br />Require review</div>
                  <div className="rounded-xl bg-[#EAF6EF] p-3 text-sm"><strong>{formsInboxSummary.approved}</strong><br />Approved</div>
                  <div className="rounded-xl bg-[#F7F1ED] p-3 text-sm"><strong>{formsInboxSummary.convertible}</strong><br />Ready for mapping</div>
                  <div className="rounded-xl bg-[#FFF8EA] p-3 text-sm"><strong>{formsInboxSummary.waitingForInformation}</strong><br />Waiting for information</div>
                  <div className="rounded-xl bg-[#FFF1F1] p-3 text-sm"><strong>{formsInboxSummary.duplicateCount}</strong><br />Duplicates</div>
                  <div className="rounded-xl bg-[#F7F1ED] p-3 text-sm"><strong>{formsInboxSummary.historyCount}</strong><br />History</div>
                </div>
                {formsInboxResponses.map((response) => (
                  <article key={response.responseId} className="rounded-2xl border border-[#F2E8E1] bg-[#FFFDFC] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#2B1723]">{response.respondentSummary.name}</p>
                        <p className="mt-1 text-xs leading-5 text-[#816D62]">
                          {response.sourceForm} · {response.targetType.replaceAll('-', ' ')} · {response.receivedAt || 'Received time not mapped'}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#816D62]">
                          Mapped fields: {response.mappedFields} · Missing: {response.missingInformation.join(', ') || 'none'} · Duplicates: {response.duplicateCandidates.join(', ') || 'none'}
                        </p>
                      </div>
                      <span className="w-fit rounded-full bg-[#F7F1ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{formResponseStatusLabel(response.status)}</span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs leading-5 text-[#6B564C] md:grid-cols-2">
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Source</dt><dd>{response.sourceForm}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Respondent</dt><dd>{response.respondentSummary.email || response.respondentSummary.phone || 'No contact mapped'}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Submitted Information</dt><dd>{response.respondentSummary.name}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Mapping</dt><dd>{response.mappedFields} mapped fields; missing {response.missingInformation.join(', ') || 'none'}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Review Status</dt><dd>{formResponseStatusLabel(response.status)}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3"><dt className="font-bold text-[#2B1723]">Duplicate Information</dt><dd>{response.duplicateCandidates.join(', ') || 'No duplicate candidate detected'}</dd></div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3 md:col-span-2"><dt className="font-bold text-[#2B1723]">Next Action</dt><dd>{response.status === 'approved' ? 'Continue Approved to Mapping when ready.' : 'Review, approve, request information, wait-list, reject, mark duplicate, or link existing.'}</dd></div>
                    </dl>
                    {response.warnings.length > 0 && <p className="mt-3 rounded-xl bg-[#FFF8EA] p-3 text-xs leading-5 text-[#7A5818]">{response.warnings.join(' ')}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FORM_REVIEW_ACTIONS.map(([action, label]) => (
                        <button key={action} type="button" onClick={() => handleFormsInboxAction(response.responseId, action)} className="rounded-lg border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#5D4A52] hover:bg-[#FFF8F2]">
                          {label}
                        </button>
                      ))}
                      <Link to="/communications?purpose=response-info-request" className="rounded-lg border border-[#E7D6CC] px-3 py-2 text-xs font-bold text-[#5D4A52] hover:bg-[#FFF8F2]">
                        Open Message Builder to copy request
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          )}
          {activeImportTab === 'templates' && (
            <section id="templates-panel" role="tabpanel" data-tour-id="import-templates-workspace">
              <ImportTemplatesPanel />
            </section>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Select worksheet</p>
            <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Select the worksheet to import</h3>
            <p className="mt-2 text-sm leading-6 text-[#816D62]">
              Choose the sheet you want to import, review the sample rows, then confirm before continuing.
            </p>

            <div className="mt-5 space-y-3">
              {workbookSheets.map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => handleSheetSelection(sheet.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedSheetId === sheet.id ? 'border-[#9A5260] bg-[#FFF8F2]' : 'border-[#F2E8E1] bg-white hover:bg-[#FBF8F5]'}`}
                >
                  <span className="block text-sm font-bold text-[#2B1723]">{sheet.name}</span>
                  <span className="mt-1 block text-xs text-[#816D62]">
                    {sheet.rows.length} data rows · {sheet.columnCount || 0} columns
                  </span>
                  {!sheet.importable && (
                    <span className="mt-2 block text-xs font-bold text-[#A32626]">
                      This sheet does not appear to contain importable rows.
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Selected sheet</p>
                <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{selectedSheet?.name || 'No sheet selected'}</h3>
                {selectedSheet && (
                  <p className="mt-2 text-sm text-[#816D62]">
                    {selectedSheet.rows.length} data rows · {selectedSheet.columnCount || 0} columns
                  </p>
                )}
              </div>
              {confirmedSheetId && selectedSheet && (
                <span className="rounded-full bg-[#E5F3EC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1E7345]">
                  Using sheet: {selectedSheet.name}
                </span>
              )}
            </div>

            {!selectedSheet?.importable && (
              <div className="mt-4 rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">
                This sheet does not appear to contain importable rows.
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-xl border border-[#F2E8E1]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-[#F2E8E1]">
                    {(selectedSheet?.sampleRows || []).slice(0, 6).map((row, rowIndex) => (
                      <tr key={`${selectedSheet.id}-${rowIndex}`} className={rowIndex === 0 ? 'bg-[#FBF8F5] font-bold text-[#2B1723]' : 'text-[#5D4A52]'}>
                        {(row || []).slice(0, 8).map((cell, cellIndex) => (
                          <td key={cellIndex} className="max-w-[12rem] truncate px-3 py-2">{String(cell ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                    {(!selectedSheet || selectedSheet.sampleRows.length === 0) && (
                      <tr>
                        <td className="px-3 py-4 text-[#816D62]">No sample rows available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={reset}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#6B564C] transition hover:bg-[#F2E8E1]"
              >
                Clear File / Start Over
              </button>
              {!canConfirmSheet && (
                <p className="self-center text-xs font-semibold text-[#A32626]">
                  Select an importable sheet to continue.
                </p>
              )}
              <button
                type="button"
                onClick={confirmSheetSelection}
                disabled={!canConfirmSheet}
                className="rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B] disabled:opacity-50"
              >
                Confirm Sheet Selection
              </button>
            </div>
          </section>
        </div>
      )}

      {step === 3 && (
        <FieldMappingForm
          headers={parsedData.headers}
          rows={parsedData.rows}
          fieldMap={fieldMap}
          onMapChange={setFieldMap}
          onCancel={reset}
          onProceed={handleProceedToPreview}
          sheetName={importContext.sourceSheetName}
          onChangeSheet={workbookSheets.length > 0 ? handleChangeSheet : undefined}
          onStartOver={reset}
          recordTypeLabel={selectedRecordType.label}
          reviewOnly={selectedRecordType.writeSupport !== 'supported'}
        />
      )}

      {step === 3 && !existingRegistrationsLoaded && (
        <div className="rounded-xl border border-[#E6D4B4] bg-[#FFF7E8] px-4 py-3 text-xs leading-5 text-[#7A5818]">
          Loading current registrations for <strong>{activeEvent.eventName}</strong> so duplicate checks stay event-accurate before preview.
        </div>
      )}

      {step === 4 && (
        <ImportPreviewTable
          processedRows={processedRows}
          onCancel={reset}
          onStartOver={reset}
          onBack={handleBackToHeaderMapping}
          mode="review"
          reviewActions={reviewActions}
          onActionChange={handleReviewAction}
          onContinue={handleContinueToFinalPreview}
          onRowEdit={handleRowEdit}
          onRevalidateAll={handleRevalidateAll}
          canContinue={processedRows.every((processed, index) => (
            processed.status !== 'needs-review' || !['needs-review', undefined].includes(reviewActions[index])
          ))}
        />
      )}

      {step === 5 && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#6B564C]">Ticket code handling</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['use-imported', 'Use imported ticket codes'],
                ['generate-missing', 'Auto-generate missing ticket codes'],
                ['leave-missing', 'Leave missing ticket codes blank for now'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTicketMode(value)
                    setFinalRows(rowsWithTicketMode(buildFinalRowsFromReview(), value))
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold ${ticketMode === value ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-[#816D62]">
              QR payload remains GSV:TICKET:{'{ticketCode}'}. Importing registrations never changes scanner permissions.
            </p>
            <div className="mt-5 rounded-2xl border border-[#F2E8E1] bg-[#FBF8F5] p-4 text-sm text-[#5D4A52]">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Final confirmation summary</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div><dt className="font-bold">Working Event</dt><dd>{activeEvent.eventName}</dd></div>
                <div><dt className="font-bold">Source</dt><dd>{selectedSource.label}</dd></div>
                <div><dt className="font-bold">Record Type</dt><dd>{selectedRecordType.label}</dd></div>
                <div><dt className="font-bold">Origin</dt><dd>{importContext.sourceFileName || uploadedFileName || 'manual input'}</dd></div>
                <div><dt className="font-bold">Total Rows</dt><dd>{processedRows.length}</dd></div>
                <div><dt className="font-bold">Ready Rows</dt><dd>{finalRows.length}</dd></div>
                <div><dt className="font-bold">Skipped Rows</dt><dd>{Math.max(0, processedRows.length - finalRows.length)}</dd></div>
                <div><dt className="font-bold">Duplicate / Review Rows</dt><dd>{processedRows.filter((row) => !row.isValid || row.duplicateInfo?.isDuplicate).length}</dd></div>
                <div><dt className="font-bold">Import Destination</dt><dd>{selectedRecordType.writeSupport === 'supported' ? 'Registrations' : 'Review only'}</dd></div>
                <div><dt className="font-bold">Writes Data</dt><dd>{selectedRecordType.writeSupport === 'supported' ? 'Yes, after final confirmation' : 'No'}</dd></div>
              </dl>
            </div>
          </section>
          <ImportPreviewTable
            processedRows={finalRows}
            onCancel={reset}
            onImport={handleImport}
            importing={importing}
            importProgress={importProgress}
            onStartOver={reset}
            onBack={handleBackToDuplicateReview}
          />
        </div>
      )}

      {step === 6 && (
        <ImportSummary result={importResult} onReset={reset} />
      )}

      <ConfirmDialog
        open={changeSheetConfirmationOpen}
        title="Change import sheet?"
        recordName={selectedSheet?.name}
        message="Changing sheets resets mapping, duplicate review, and preview for the current sheet."
        confirmLabel="Change Sheet"
        onCancel={() => setChangeSheetConfirmationOpen(false)}
        onConfirm={confirmChangeSheet}
      />
    </div>
  )
}
