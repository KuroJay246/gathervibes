import { useState } from 'react'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { formatPaymentLabel, normalizePaymentStatus } from '../../utils/paymentStatus'
import { PAYMENT_METHODS, formatCurrency, formatPaymentMethod, normalizePaymentMethod, parseMoney } from '../../utils/financeUtils'

function statusTone(status) {
  if (status === 'valid') return 'text-[#1E7345]'
  if (status === 'warning' || status === 'needs-review') return 'text-[#986F26]'
  if (status === 'skipped') return 'text-[#8C7567]'
  return 'text-[#A32626]'
}

function statusLabel(status) {
  if (status === 'valid') return 'Ready'
  if (status === 'warning') return 'Warning'
  if (status === 'needs-review') return 'Needs Review'
  if (status === 'skipped') return 'Skipped'
  return 'Blocked'
}

function StatusIcon({ status }) {
  if (status === 'valid') return <CheckCircle2 className="size-5 text-[#1E7345]" />
  if (status === 'warning' || status === 'needs-review') return <AlertCircle className="size-5 text-[#986F26]" />
  return <XCircle className="size-5 text-[#A32626]" />
}

function formatAttendees(row = {}) {
  return Array.isArray(row.attendeeNames) && row.attendeeNames.length > 0
    ? row.attendeeNames.join(', ')
    : row.fullName || 'No guest names'
}

export function ImportPreviewTable({
  processedRows,
  onCancel,
  onImport,
  importing,
  importProgress,
  mode = 'final',
  reviewActions = {},
  onActionChange,
  onContinue,
  canContinue = true,
  onBack,
  onStartOver,
  onRowEdit,
  onRevalidateAll,
}) {
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [selectedRows, setSelectedRows] = useState(new Set())
  const validRows = processedRows.filter(r => r.status === 'valid')
  const warningRows = processedRows.filter(r => r.status === 'warning')
  const reviewRows = processedRows.filter(r => r.status === 'needs-review')
  const blockedRows = processedRows.filter(r => r.status === 'blocked')
  const skippedRows = processedRows.filter(r => r.status === 'skipped')
  
  const canImport = mode === 'final' && processedRows.some((row) => row.status !== 'blocked' && row.status !== 'skipped')
  const isReviewMode = mode === 'review'
  const importableCount = processedRows.filter((row) => row.status !== 'blocked' && row.status !== 'skipped').length
  const disabledReason = isReviewMode && !canContinue
    ? 'Resolve every Needs Review row before continuing.'
    : !isReviewMode && !canImport
      ? 'No rows were imported because every row is blocked or skipped.'
      : ''
  const selectedProcessedRows = processedRows.filter((_, index) => selectedRows.has(index))
  const selectedCount = selectedRows.size

  function toggleSelected(index) {
    setSelectedRows((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function selectByStatus(status) {
    setSelectedRows(new Set(processedRows
      .map((row, index) => (row.status === status ? index : null))
      .filter((index) => index !== null)))
  }

  function updateDraft(field, value) {
    setEditDraft((current) => ({ ...current, [field]: value }))
  }

  function beginEdit(index, row) {
    setEditingIndex(index)
    setEditDraft({
      fullName: row.fullName || '',
      buyerName: row.buyerName || '',
      attendeeNames: Array.isArray(row.attendeeNames) ? row.attendeeNames.join('\n') : '',
      groupName: row.groupName || '',
      email: row.email || '',
      phone: row.phone || '',
      personsAttending: row.personsAttending || 1,
      paymentStatus: normalizePaymentStatus(row.paymentStatus),
      priceTier: row.priceTier || '',
      ticketPrice: row.ticketPrice ?? '',
      amountDue: row.amountDue ?? '',
      amountPaid: row.amountPaid ?? '',
      balanceDue: row.balanceDue ?? '',
      paymentMethod: normalizePaymentMethod(row.paymentMethod),
      paymentReference: row.paymentReference || '',
      ticketCode: row.ticketCode || '',
      notes: row.notes || '',
      preferredSchool: row.preferredSchool || '',
    })
  }

  async function saveEdit(index) {
    await onRowEdit?.(index, {
      ...editDraft,
      attendeeNames: String(editDraft.attendeeNames || '').split(/\n|,|;/).map((name) => name.trim()).filter(Boolean),
      personsAttending: Number(editDraft.personsAttending) || 1,
      paymentStatus: normalizePaymentStatus(editDraft.paymentStatus),
      priceTier: String(editDraft.priceTier || '').trim(),
      ticketPrice: parseMoney(editDraft.ticketPrice),
      amountDue: parseMoney(editDraft.amountDue),
      amountPaid: parseMoney(editDraft.amountPaid) ?? 0,
      balanceDue: parseMoney(editDraft.balanceDue),
      paymentMethod: normalizePaymentMethod(editDraft.paymentMethod),
      ticketCode: String(editDraft.ticketCode || '').trim(),
      edited: true,
    })
    setEditingIndex(null)
    setEditDraft({})
  }

  function skipSelected() {
    selectedRows.forEach((index) => onActionChange?.(index, 'skip'))
  }

  function clearSelectedActions() {
    selectedRows.forEach((index) => onActionChange?.(index, processedRows[index]?.defaultAction || 'keep'))
  }

  async function applyPaymentToSelected(paymentStatus) {
    if (!paymentStatus) return
    for (const index of selectedRows) {
      const row = processedRows[index]?.row
      if (row) await onRowEdit?.(index, { ...row, paymentStatus: normalizePaymentStatus(paymentStatus), edited: true })
    }
  }

  async function generateTicketsForSelected() {
    for (const index of selectedRows) {
      const row = processedRows[index]?.row
      if (row && !row.ticketCode) {
        await onRowEdit?.(index, { ...row, ticketCode: `IMP-${String(index + 1).padStart(3, '0')}`, edited: true })
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-xl text-[#2B1723]">{isReviewMode ? 'Duplicate Review' : 'Final Import Preview'}</h3>
          <p className="mt-1 text-sm text-[#816D62]">
            {isReviewMode
              ? 'Review hard errors, shared-contact warnings, and possible true duplicates before the final preview.'
              : 'Preview the exact rows that will be written after confirmation. No Firestore write happens before this step.'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <div className="flex items-center gap-1.5 text-[#1E7345]">
            <CheckCircle2 className="size-4" />
            {validRows.length} Valid
          </div>
          <div className="flex items-center gap-1.5 text-[#986F26]">
            <AlertCircle className="size-4" />
            {warningRows.length} Warning
          </div>
          <div className="flex items-center gap-1.5 text-[#986F26]">
            <AlertCircle className="size-4" />
            {reviewRows.length} Review
          </div>
          <div className="flex items-center gap-1.5 text-[#A32626]">
            <XCircle className="size-4" />
            {blockedRows.length} Blocked
          </div>
          {skippedRows.length > 0 && (
            <div className="flex items-center gap-1.5 text-[#8C7567]">
              <XCircle className="size-4" />
              {skippedRows.length} Skipped
            </div>
          )}
        </div>
      </div>
      {isReviewMode && (
        <div className="sticky top-20 z-10 flex flex-col gap-3 rounded-2xl border border-[#EEDFD6] bg-white/95 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span>Total {processedRows.length}</span>
            <span className="text-[#1E7345]">Ready {validRows.length}</span>
            <span className="text-[#986F26]">Warnings {warningRows.length}</span>
            <span className="text-[#986F26]">Review {reviewRows.length}</span>
            <span className="text-[#A32626]">Blocked {blockedRows.length}</span>
            <span className="text-[#8C7567]">Selected {selectedCount}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => selectByStatus('warning')} className="rounded-lg border border-[#E7D6CC] px-3 py-1.5 text-xs font-bold text-[#6B564C]">Select warnings</button>
            <button type="button" onClick={() => selectByStatus('blocked')} className="rounded-lg border border-[#E7D6CC] px-3 py-1.5 text-xs font-bold text-[#6B564C]">Select blocked</button>
            <button type="button" onClick={() => setSelectedRows(new Set())} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8C7567]">Clear selected</button>
            <button type="button" onClick={skipSelected} disabled={selectedCount === 0} className="rounded-lg bg-[#F7F1ED] px-3 py-1.5 text-xs font-bold text-[#6B564C] disabled:opacity-50">Skip selected</button>
            <button type="button" onClick={clearSelectedActions} disabled={selectedCount === 0} className="rounded-lg bg-[#F7F1ED] px-3 py-1.5 text-xs font-bold text-[#6B564C] disabled:opacity-50">Clear actions</button>
            <select
              aria-label="Apply payment status to selected import rows"
              disabled={selectedCount === 0}
              onChange={(event) => {
                applyPaymentToSelected(event.target.value)
                event.target.value = ''
              }}
              className="rounded-lg border border-[#E7D6CC] bg-white px-2 py-1.5 text-xs font-bold text-[#6B564C]"
            >
              <option value="">Apply payment...</option>
              {['paid', 'pending', 'complimentary', 'door'].map((status) => <option key={status} value={status}>{formatPaymentLabel(status)}</option>)}
            </select>
            <button type="button" onClick={generateTicketsForSelected} disabled={selectedCount === 0 || selectedProcessedRows.every((row) => row.row.ticketCode)} className="rounded-lg bg-[#F7F1ED] px-3 py-1.5 text-xs font-bold text-[#6B564C] disabled:opacity-50">Generate missing tickets</button>
            <button type="button" onClick={onRevalidateAll} className="rounded-lg bg-[#2B1723] px-3 py-1.5 text-xs font-bold text-white">Revalidate all</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#F2E8E1]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                {isReviewMode && <th className="px-4 py-3">Select</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Guests</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">Pay</th>
                <th className="px-4 py-3">Money</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Issues</th>
                {isReviewMode && <th className="px-4 py-3">Decision</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8E1]">
              {processedRows.slice(0, 100).map((pr, idx) => (
                <tr key={idx} className={pr.status === 'blocked' ? 'bg-[#FFF1F1]/50' : pr.status === 'warning' || pr.status === 'needs-review' ? 'bg-[#FFF4DF]/30' : pr.status === 'skipped' ? 'bg-[#F7F1ED]/60' : ''}>
                  {isReviewMode && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedRows.has(idx)} onChange={() => toggleSelected(idx)} aria-label={`Select import row ${idx + 1}`} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={pr.status} />
                      <span className={`text-xs font-bold ${statusTone(pr.status)}`}>{statusLabel(pr.status)}</span>
                      {pr.row.edited && <span className="rounded-full bg-[#E6F0FA] px-2 py-0.5 text-[10px] font-bold text-[#285E9E]">Edited</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-bold text-[#8C7567]">{pr.row.sourceRowIndex || idx + 1}</td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="max-w-[16rem] whitespace-normal font-medium text-[#2B1723]">{formatAttendees(pr.row)}</div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="font-medium text-[#2B1723]">{pr.row.buyerName || pr.row.fullName || 'No buyer/contact'}</div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">{pr.row.personsAttending || 1}</td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div>{formatPaymentLabel(pr.row.paymentStatus)}</div>
                    <div className="mt-0.5 text-xs text-[#8C7567]">{formatPaymentMethod(pr.row.paymentMethod)}</div>
                    {pr.row.paymentReference && <div className="mt-0.5 text-xs text-[#8C7567]">{pr.row.paymentReference}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5D4A52]">
                    <div>Tier: {pr.row.priceTier || 'Needs review'}</div>
                    <div>Price: {pr.row.ticketPrice === null || pr.row.ticketPrice === undefined ? 'Needs review' : formatCurrency(pr.row.ticketPrice)}</div>
                    <div>Due: {pr.row.amountDue === null || pr.row.amountDue === undefined ? 'Needs review' : formatCurrency(pr.row.amountDue)}</div>
                    <div>Paid: {formatCurrency(pr.row.amountPaid || 0)}</div>
                    <div>Balance: {pr.row.balanceDue === null || pr.row.balanceDue === undefined ? 'Needs review' : formatCurrency(pr.row.balanceDue)}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#2B1723]">
                    {pr.row.ticketCode || <span className="font-sans font-normal italic text-[#A48A7B]">No ticket code assigned</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5D4A52]">
                    <div className="space-y-0.5">
                      {pr.row.email && <div>{pr.row.email}</div>}
                      {pr.row.phone && <div>{pr.row.phone}</div>}
                      {pr.row.groupName && <div>Group: {pr.row.groupName}</div>}
                      {pr.row.preferredSchool && <div>School: {pr.row.preferredSchool}</div>}
                      {pr.row.notes && <div>{pr.row.notes}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5D4A52]">
                    {pr.issues.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4">
                        {pr.issues.map((issue) => <li key={issue}>{issue}</li>)}
                        {pr.recommendedAction && <li className="font-bold text-[#2B1723]">{pr.recommendedAction}</li>}
                      </ul>
                    ) : <span className="text-[#816D62]">None</span>}
                  </td>
                  {isReviewMode && (
                    <td className="px-4 py-3">
                      {pr.status === 'blocked' ? (
                        <span className="rounded-full bg-[#FCEEF1] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#A32626]">Blocked</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {editingIndex === idx ? (
                            <div className="min-w-[18rem] space-y-2 rounded-xl border border-[#E7D6CC] bg-white p-3">
                              {[
                                ['fullName', 'Full name'],
                                ['buyerName', 'Buyer'],
                                ['groupName', 'Group'],
                                ['email', 'Email'],
                                ['phone', 'Phone'],
                                ['priceTier', 'Price tier'],
                                ['ticketPrice', 'Ticket price'],
                                ['amountDue', 'Amount due'],
                                ['amountPaid', 'Amount paid'],
                                ['balanceDue', 'Balance due'],
                                ['paymentReference', 'Payment ref'],
                                ['ticketCode', 'Ticket'],
                                ['preferredSchool', 'School'],
                              ].map(([field, label]) => (
                                <input key={field} value={editDraft[field] || ''} onChange={(event) => updateDraft(field, event.target.value)} placeholder={label} className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs" />
                              ))}
                              <textarea value={editDraft.attendeeNames || ''} onChange={(event) => updateDraft('attendeeNames', event.target.value)} placeholder="Attendee names" className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs" />
                              <input type="number" min="1" value={editDraft.personsAttending || 1} onChange={(event) => updateDraft('personsAttending', event.target.value)} className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs" />
                              <select value={editDraft.paymentStatus || 'unknown'} onChange={(event) => updateDraft('paymentStatus', event.target.value)} className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs">
                                {['paid', 'pending', 'complimentary', 'door', 'unknown'].map((status) => <option key={status} value={status}>{formatPaymentLabel(status)}</option>)}
                              </select>
                              <select value={editDraft.paymentMethod || 'unknown'} onChange={(event) => updateDraft('paymentMethod', event.target.value)} className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs">
                                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{formatPaymentMethod(method)}</option>)}
                              </select>
                              <textarea value={editDraft.notes || ''} onChange={(event) => updateDraft('notes', event.target.value)} placeholder="Notes" className="w-full rounded-lg border border-[#E5D7CF] px-2 py-1.5 text-xs" />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => saveEdit(idx)} className="rounded-lg bg-[#2B1723] px-3 py-1.5 text-xs font-bold text-white">Save changes</button>
                                <button type="button" onClick={() => { setEditingIndex(null); setEditDraft({}) }} className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#6B564C] hover:bg-[#F7F1ED]">Cancel edit</button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEdit(idx, pr.row)}
                              className="rounded-lg px-3 py-2 text-left text-xs font-bold transition bg-[#F7F1ED] text-[#6B564C] hover:bg-[#EFE2DA]"
                            >
                              Edit row
                            </button>
                          )}
                          {[
                            ['keep', 'Keep Separate'],
                            ['merge', 'Merge Into One Group Registration'],
                            ['skip', 'Skip Row'],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => onActionChange?.(idx, value)}
                              className={`rounded-lg px-3 py-2 text-left text-xs font-bold transition ${reviewActions[idx] === value ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C] hover:bg-[#EFE2DA]'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {processedRows.length > 100 && (
                <tr>
                  <td colSpan={isReviewMode ? 12 : 10} className="px-4 py-3 text-center text-xs italic text-[#8C7567]">
                    ...and {processedRows.length - 100} more rows not shown.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {disabledReason && (
          <p className="self-center text-xs font-semibold text-[#A32626]">{disabledReason}</p>
        )}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={importing}
            className="rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#6B564C] transition hover:bg-[#FBF8F5] disabled:opacity-50"
          >
            {isReviewMode ? 'Back to Header Mapping' : 'Back to Duplicate Review'}
          </button>
        )}
        <button
          type="button"
          onClick={onStartOver || onCancel}
          disabled={importing}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#8C7567] transition hover:bg-[#F2E8E1] disabled:opacity-50"
        >
          Change File / Start Over
        </button>
        {isReviewMode ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30 disabled:opacity-50"
          >
            Continue to Final Import Preview
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onImport(processedRows.filter((row) => row.status !== 'blocked' && row.status !== 'skipped'))}
            disabled={!canImport || importing}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30 disabled:opacity-50"
          >
            {importing ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {importProgress > 0 ? `Importing ${importProgress} of ${importableCount}…` : 'Starting Import…'}
              </>
            ) : (
              `Confirm Import (${importableCount} rows)`
            )}
          </button>
        )}
      </div>
    </div>
  )
}
