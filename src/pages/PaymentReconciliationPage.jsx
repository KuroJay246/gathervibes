import { useMemo, useState } from 'react'
import { AlertTriangle, FileSpreadsheet, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import { useActiveEvent } from '../events/useActiveEvent'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import {
  RECONCILIATION_FILTERS,
  buildPaymentReconciliationPreview,
} from '../utils/paymentReconciliation'
import { formatCurrency } from '../utils/financeUtils'
import { readReconciliationWorkbook } from '../utils/reconciliationWorkbook'
import { loadReconciliationOperations, loadReconciliationRegistrations } from '../services/reconciliationReadService'

function Metric({ label, value, help }) {
  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
      <p className="text-xl font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#80685B]">{label}</p>
      {help && <p className="mt-1 text-xs leading-5 text-[#816D62]">{help}</p>}
    </div>
  )
}

const DETAIL_SECTION_TONES = {
  neutral: 'border-[#EFE2DA] bg-[#FBF8F5]',
  warning: 'border-[#F2D6A3] bg-[#FFF8EA]',
  success: 'border-[#D9EBD8] bg-[#EAF6EF]',
}

function DetailSection({ label, value, tone = 'neutral' }) {
  return (
    <div className={`rounded-2xl border p-4 ${DETAIL_SECTION_TONES[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#2B1723]">{value}</p>
    </div>
  )
}

function GuardrailNotice() {
  return (
    <section className="rounded-2xl border border-[#F2D6A3] bg-[#FFF8EA] p-5 text-sm leading-6 text-[#715D46]">
      <div className="flex gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#7A5818]" />
        <div>
          <h3 className="font-bold text-[#4E3928]">Read-only reconciliation preview</h3>
          <p className="mt-1">
            This tool loads workbook records, the selected event's registration records, and the selected event's Operations records for comparison only.
            It uses the selected Working Event, does not save changes, does not import registrations, and does not apply payment updates.
          </p>
        </div>
      </div>
    </section>
  )
}

function SetupPanel({ activeEvent, fileName, onFileChange, onLoad, loading }) {
  const canLoad = Boolean(activeEvent?.eventId && fileName && !loading)
  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Target event</span>
          <div className="min-h-11 rounded-xl border border-[#E5D7CF] bg-[#FBF8F5] px-3 py-3 text-sm font-semibold text-[#2B1723]">
            {activeEvent?.eventName || 'Select a Working Event first'}
          </div>
          <p className="text-xs text-[#816D62]">The preview uses the current Working Event and does not change the event status.</p>
        </div>

        <label className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Workbook</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFileChange}
            className="block min-h-11 w-full rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm text-[#2B1723] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F7F1ED] file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#6B564C]"
          />
          <p className="text-xs text-[#816D62]">{fileName || 'Choose the organizer-approved payment workbook for the selected event.'}</p>
        </label>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Write behavior</span>
          <div className="min-h-11 rounded-xl border border-[#E5D7CF] bg-[#FBF8F5] px-3 py-3 text-sm font-semibold text-[#2B1723]">
            Preview only
          </div>
          <p className="text-xs text-[#816D62]">Corrections are made through the normal audited registration and payment workflows.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onLoad}
          disabled={!canLoad}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? <RefreshCw className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}
          Load Preview
        </button>
        <p className="text-xs leading-5 text-[#816D62]">
          Select the correct Working Event before loading. The preview never writes event, registration, ticket, attendance, Operations, or audit-log records.
        </p>
      </div>
    </section>
  )
}

function TotalsPanel({ preview }) {
  const currency = preview.targetEvent.currency
  const appGuestCount = preview.recordSets.registrationRecords.reduce((sum, record) => sum + (record.finance?.personsAttending || 0), 0)
  const proposedRows = preview.workbookClassifications.filter((row) => row.filterKey === 'proposed-update')
  const changedFieldCount = proposedRows.reduce((sum, row) => sum + (row.proposedChanges?.length || 0), 0)
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Workbook records" value={preview.recordSets.workbookRecords.length} help={`${formatCurrency(preview.totals.workbook.amountPaid, currency)} recorded paid`} />
      <Metric label="Registration records" value={preview.recordSets.registrationRecords.length} help={`${appGuestCount} guests from personsAttending`} />
      <Metric label="Workbook expected" value={formatCurrency(preview.totals.workbook.amountDue, currency)} help={`${formatCurrency(preview.totals.workbook.balanceDue, currency)} outstanding`} />
      <Metric label="Workbook paid" value={formatCurrency(preview.totals.workbook.amountPaid, currency)} />
      <Metric label="Current app expected" value={formatCurrency(preview.totals.currentApp.totalExpected, currency)} help={`${formatCurrency(preview.totals.currentApp.totalOutstanding, currency)} outstanding`} />
      <Metric label="Current app paid" value={formatCurrency(preview.totals.currentApp.totalCollected, currency)} />
      <Metric label="Hypothetical expected" value={formatCurrency(preview.totals.hypotheticalApp.totalExpected, currency)} help="After proposed safe updates only." />
      <Metric label="Hypothetical paid" value={formatCurrency(preview.totals.hypotheticalApp.totalCollected, currency)} help="Preview only; no updates applied." />
      <Metric label="Hypothetical outstanding" value={formatCurrency(preview.totals.hypotheticalApp.totalOutstanding, currency)} help={`${proposedRows.length} registrations, ${changedFieldCount} fields`} />
      <Metric label="Operations excluded" value={preview.totals.operationsExcluded.count} help={`${preview.totals.operationsExcluded.possibleOverlapCount} possible overlaps flagged`} />
    </section>
  )
}

function EvidencePanel({ preview }) {
  const countRows = [
    ['No Change', 'no-change'],
    ['Proposed Update', 'proposed-update'],
    ['Manual Review', 'manual-review'],
    ['Workbook Only', 'workbook-only'],
    ['App Only', 'app-only'],
    ['Duplicate/Non-Unique', 'duplicate'],
    ['Conflict', 'conflict'],
    ['Blocked', 'blocked'],
  ]
  const proposals = preview.workbookClassifications.filter((row) => row.filterKey === 'proposed-update')
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
        <h3 className="font-serif text-xl text-[#2B1723]">Workbook classifications</h3>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">Mutually exclusive workbook-row counts. Total must equal workbook records.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {countRows.filter(([, key]) => key !== 'app-only').map(([label, key]) => (
            <div key={key} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-sm">
              <strong>{preview.classificationCounts.workbook[key] || 0}</strong>
              <span className="ml-2 text-xs text-[#816D62]">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
        <h3 className="font-serif text-xl text-[#2B1723]">App registration classifications</h3>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">Mutually exclusive app-registration counts. Total must equal registration documents.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {countRows.filter(([, key]) => key !== 'workbook-only').map(([label, key]) => (
            <div key={key} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-sm">
              <strong>{preview.classificationCounts.app[key] || 0}</strong>
              <span className="ml-2 text-xs text-[#816D62]">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
        <h3 className="font-serif text-xl text-[#2B1723]">Warning instances</h3>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">Warnings may overlap and are separate from classification totals.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(preview.warningCounts).map(([key, value]) => (
            <div key={key} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-sm">
              <strong>{value}</strong>
              <span className="ml-2 text-xs text-[#816D62]">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
        <h3 className="font-serif text-xl text-[#2B1723]">Duplicate groups</h3>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">Grouped by duplicated identifier key. Blocking groups are ticket/reference only.</p>
        <div className="mt-4 space-y-2">
          {preview.duplicateGroups.length === 0 ? (
            <p className="text-sm text-[#816D62]">No duplicate identifier groups detected.</p>
          ) : preview.duplicateGroups.slice(0, 8).map((group) => (
            <div key={`${group.source}-${group.key}`} className="rounded-xl bg-[#FBF8F5] px-3 py-2 text-xs leading-5 text-[#6B564C]">
              <strong>{group.source}</strong> · {group.label} · {group.count} records · {group.blocking ? 'blocking' : 'warning only'}
            </div>
          ))}
          {preview.duplicateGroups.length > 8 && <p className="text-xs text-[#816D62]">Plus {preview.duplicateGroups.length - 8} additional duplicate groups.</p>}
        </div>
      </div>
      <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4 xl:col-span-2">
        <h3 className="font-serif text-xl text-[#2B1723]">Proposal field list</h3>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">Only changed supported payment fields are listed. Manual-review rows are excluded from proposals.</p>
        {proposals.length === 0 ? (
          <p className="mt-4 text-sm text-[#816D62]">No safe proposals are available.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="uppercase tracking-wider text-[#80685B]">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Workbook row</th>
                  <th className="px-2 py-2">Registration</th>
                  <th className="px-2 py-2">Match</th>
                  <th className="px-2 py-2">Changed fields</th>
                  <th className="px-2 py-2">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8E1]">
                {proposals.map((row, index) => (
                  <tr key={row.workbookRecord.workbookRecordId}>
                    <td className="px-2 py-2 font-bold">{index + 1}</td>
                    <td className="px-2 py-2">Row {row.workbookRecord.sourceRowNumber}</td>
                    <td className="px-2 py-2">{row.registrationRecord.registrationId}</td>
                    <td className="px-2 py-2">{row.matchBasis}</td>
                    <td className="px-2 py-2">{row.proposedChanges.map((change) => change.field).join(', ')}</td>
                    <td className="px-2 py-2">{row.proposalWarnings.length ? row.proposalWarnings.join('; ') : 'None'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function RowLabel({ row }) {
  const workbook = row.workbookRecord
  const registration = row.registrationRecord
  if (workbook) {
    return (
      <div>
        <p className="font-bold text-[#2B1723]">{workbook.guestName || workbook.buyerContact || `Workbook row ${workbook.sourceRowNumber}`}</p>
        <p className="text-xs text-[#816D62]">Workbook row {workbook.sourceRowNumber} · {workbook.ticketCode || 'no ticket'} · {workbook.email || 'no email'}</p>
      </div>
    )
  }
  return (
    <div>
      <p className="font-bold text-[#2B1723]">{registration?.fullName || 'App registration'}</p>
      <p className="text-xs text-[#816D62]">{registration?.registrationId || 'no id'} · {registration?.ticketCode || 'no ticket'}</p>
    </div>
  )
}

function reconciliationRowKey(row) {
  return [
    row.filterKey,
    row.workbookRecord?.workbookRecordId,
    row.registrationRecord?.registrationId,
    row.workbookRecord?.ticketCode,
    row.workbookRecord?.guestName,
    row.registrationRecord?.fullName,
    row.matchBasis,
  ].filter(Boolean).join('::')
}

function ReconciliationTable({ preview, filter, onSelect, selectedRowKey }) {
  const rows = preview.rows.filter((row) => filter === 'all' || row.filterKey === filter)
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
      <div className="border-b border-[#EEDFD6] bg-[#FBF8F5] p-4">
        <h3 className="font-serif text-2xl text-[#2B1723]">Dry-run classifications</h3>
        <p className="mt-1 text-sm text-[#816D62]">Payment balance and evidence discrepancy stay separate. Strong exact or multi-field matches may produce proposed payment-field updates. Name-only matches stay manual review.</p>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-[#816D62]">No rows match this filter.</p>
      ) : (
        <>
          <div className="grid gap-3 border-b border-[#F2E8E1] bg-[#FFFDFC] p-4 xl:hidden">
            {rows.map((row, index) => {
              const key = reconciliationRowKey(row) || `row-${index}`
              return (
                <button
                  key={`card-${key}`}
                  type="button"
                  onClick={() => onSelect(row)}
                  className={`rounded-2xl border p-4 text-left ${selectedRowKey === key ? 'border-[#9A5260] bg-[#FFF8F2]' : 'border-[#EFE2DA] bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <RowLabel row={row} />
                    <span className="rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{row.status}</span>
                  </div>
                  <p className="mt-3 text-xs text-[#816D62]">Payment status stays separate from reconciliation status.</p>
                </button>
              )
            })}
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-[#F2E8E1] text-xs font-bold uppercase tracking-wider text-[#80685B]">
              <tr>
                <th className="px-3 py-2">Registration</th>
                <th className="px-3 py-2">Expected amount</th>
                <th className="px-3 py-2">Recorded amount</th>
                <th className="px-3 py-2">Evidence amount</th>
                <th className="px-3 py-2">Difference</th>
                <th className="px-3 py-2">Reconciliation status</th>
                <th className="px-3 py-2">Evidence reference</th>
                <th className="px-3 py-2">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8E1]">
              {rows.map((row, index) => (
                (() => {
                  const rowKey = reconciliationRowKey(row) || `row-${index}`
                  return (
                <tr
                  key={rowKey}
                  className={selectedRowKey === rowKey ? 'bg-[#FFF8F2]' : ''}
                >
                  <td className="px-3 py-3"><button type="button" onClick={() => onSelect(row)} className="text-left"><RowLabel row={row} /></button></td>
                  <td className="px-3 py-3 text-xs text-[#816D62]">{formatCurrency(row.registrationRecord?.amountDue ?? 0, preview.targetEvent.currency)}</td>
                  <td className="px-3 py-3 text-xs text-[#816D62]">{formatCurrency(row.registrationRecord?.amountPaid ?? 0, preview.targetEvent.currency)}</td>
                  <td className="px-3 py-3 text-xs text-[#816D62]">{formatCurrency(row.workbookRecord?.amountPaid ?? 0, preview.targetEvent.currency)}</td>
                  <td className="px-3 py-3 text-xs text-[#816D62]">{formatCurrency((row.workbookRecord?.amountPaid ?? 0) - (row.registrationRecord?.amountPaid ?? 0), preview.targetEvent.currency)}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-[#F7F1ED] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{row.status}</span></td>
                  <td className="px-3 py-3 text-xs text-[#816D62]">{row.workbookRecord?.paymentReference || 'No evidence reference'}</td>
                  <td className="max-w-[260px] px-3 py-3 text-xs leading-5 text-[#816D62]">{row.reason}</td>
                </tr>
                  )
                })()
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  )
}

export function PaymentReconciliationPage() {
  const { activeEvent } = useActiveEvent()
  const [workbookFile, setWorkbookFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedRowKey, setSelectedRowKey] = useState('')
  const [selectedRow, setSelectedRow] = useState(null)

  const selectedTarget = activeEvent ? { ...activeEvent, currency: activeEvent.currency || 'BBD' } : null
  const setupReady = Boolean(selectedTarget?.eventId && workbookFile)

  const workbookParserNote = useMemo(() => {
    const sheet = preview?.workbookSheets?.[0]
    if (!sheet?.parserWarning) return ''
    const extras = [sheet.formulasDetected ? `${sheet.formulasDetected} formulas used cached values` : '', sheet.mergedCellsDetected ? `${sheet.mergedCellsDetected} merged cells detected` : ''].filter(Boolean).join('; ')
    return `${sheet.parserWarning}${extras ? ` ${extras}.` : ''}`
  }, [preview])

  async function loadDryRun() {
    if (!setupReady || !selectedTarget) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const [workbookSheets, registrations, operationsEntries] = await Promise.all([
        readReconciliationWorkbook(workbookFile),
        loadReconciliationRegistrations(selectedTarget.eventId),
        loadReconciliationOperations(selectedTarget.eventId),
      ])
      const workbookSheet = workbookSheets.find((sheet) => sheet.headers?.length && sheet.rows?.length) || workbookSheets[0]
      const nextPreview = buildPaymentReconciliationPreview({
        workbookSheet,
        registrations,
        operationsEntries,
        event: selectedTarget,
      })
      setPreview({ ...nextPreview, workbookSheets })
      setFilter('all')
      setSelectedRow(nextPreview.rows[0] || null)
      setSelectedRowKey(nextPreview.rows[0] ? `${nextPreview.rows[0].filterKey}-${nextPreview.rows[0].workbookRecord?.workbookRecordId || nextPreview.rows[0].registrationRecord?.registrationId || 0}` : '')
    } catch (err) {
      setError(err?.message || 'Payment reconciliation preview could not load.')
    } finally {
      setLoading(false)
    }
  }

  function onFileChange(event) {
    setWorkbookFile(event.target.files?.[0] || null)
    setPreview(null)
    setError('')
    setSelectedRow(null)
    setSelectedRowKey('')
  }

  function handleSelectRow(row) {
    const key = reconciliationRowKey(row)
    setSelectedRow(row)
    setSelectedRowKey(key)
  }

  if (loading) return <LoadingState message="Loading payment reconciliation preview..." />

  return (
    <div data-tour-id="reconciliation-workspace" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Payments · dry-run only</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Payment Reconciliation</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
            Compare a payment workbook to the selected event's registration payment records without changing data. Missing evidence does not automatically mean unpaid.
          </p>
        </div>
        <div className="rounded-2xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
          <strong className="text-[#2B1723]">Working Event unchanged:</strong> {activeEvent?.eventName || 'No selected Working Event'}
        </div>
      </header>

      <GuardrailNotice />
      <SetupPanel
        activeEvent={activeEvent}
        fileName={workbookFile?.name || ''}
        onFileChange={onFileChange}
        onLoad={loadDryRun}
        loading={loading}
      />

      {error && <ErrorState title="Preview could not load" message={error} />}

      {!preview && !error && (
        <section className="rounded-2xl border border-[#EEDFD6] bg-[#FBF8F5] p-5 text-sm leading-6 text-[#816D62]">
          <div className="flex gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0" />
            <div>
              <h3 className="font-bold text-[#2B1723]">No target loaded</h3>
              <p>Select a Working Event and choose its organizer-approved payment workbook to load a read-only preview.</p>
            </div>
          </div>
        </section>
      )}

      {preview && (
        <>
          <section className="gsv-section-card">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Reconciliation summary</p>
            <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Payment balance vs evidence discrepancy</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <DetailSection label="Payment balance" value="Registration payment fields show what the app currently records as expected, collected, and outstanding for the selected Working Event." />
              <DetailSection label="Evidence discrepancy" value="Reconciliation statuses describe how well workbook evidence matches those payment records. They do not by themselves change the payment status." tone="warning" />
            </div>
          </section>
          {workbookParserNote && (
            <section className="rounded-2xl border border-[#F2D6A3] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{workbookParserNote}</p>
              </div>
            </section>
          )}
          <TotalsPanel preview={preview} />
          <EvidencePanel preview={preview} />
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {RECONCILIATION_FILTERS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-2 text-xs font-bold ${filter === value ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C]'}`}
                >
                  {label} ({preview.counts[value] || 0})
                </button>
              ))}
            </div>
          </section>
          {selectedRow && (
            <section className="gsv-section-card">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Review details</p>
              <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Selected reconciliation item</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <DetailSection label="Registration" value={selectedRow.registrationRecord?.fullName || selectedRow.workbookRecord?.guestName || 'No matched registration yet'} />
                <DetailSection label="Recorded payment" value={`${formatCurrency(selectedRow.registrationRecord?.amountPaid ?? 0, preview.targetEvent.currency)} · ${selectedRow.registrationRecord?.paymentStatus || 'unknown'}`} />
                <DetailSection label="Evidence" value={`${formatCurrency(selectedRow.workbookRecord?.amountPaid ?? 0, preview.targetEvent.currency)} · ${selectedRow.workbookRecord?.paymentReference || 'No evidence reference'}`} />
                <DetailSection label="Difference" value={formatCurrency((selectedRow.workbookRecord?.amountPaid ?? 0) - (selectedRow.registrationRecord?.amountPaid ?? 0), preview.targetEvent.currency)} tone={selectedRow.filterKey === 'proposed-update' || selectedRow.filterKey === 'no-change' ? 'success' : 'warning'} />
                <DetailSection label="Reconciliation status" value={selectedRow.status} />
                <DetailSection label="Notes" value={selectedRow.reason} />
              </div>
            </section>
          )}
          <ReconciliationTable preview={preview} filter={filter} onSelect={handleSelectRow} selectedRowKey={selectedRowKey} />
          <section className="rounded-2xl border border-[#F2C3C3] bg-[#FFF8F8] p-5 text-sm leading-6 text-[#7E1E1E]">
            <h3 className="font-bold">No apply action is available here</h3>
            <p className="mt-1">Supported updates are previewed only for organizer review. Identity fields, event ID, guest count, ticket codes, check-in fields, and audit history are never proposed here.</p>
          </section>
        </>
      )}
    </div>
  )
}
