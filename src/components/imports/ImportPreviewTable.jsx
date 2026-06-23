import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

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
  mode = 'final',
  reviewActions = {},
  onActionChange,
  onContinue,
  canContinue = true,
  onBack,
  onStartOver,
}) {
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

      <div className="overflow-hidden rounded-xl border border-[#F2E8E1]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Buyer / Contact</th>
                <th className="px-4 py-3">Guests Attending</th>
                <th className="px-4 py-3">Group Name</th>
                <th className="px-4 py-3">Persons Count</th>
                <th className="px-4 py-3">Email / Phone</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Ticket Code</th>
                <th className="px-4 py-3">Notes / Dietary Notes</th>
                <th className="px-4 py-3">Issues</th>
                {isReviewMode && <th className="px-4 py-3">Decision</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8E1]">
              {processedRows.slice(0, 100).map((pr, idx) => (
                <tr key={idx} className={pr.status === 'blocked' ? 'bg-[#FFF1F1]/50' : pr.status === 'warning' || pr.status === 'needs-review' ? 'bg-[#FFF4DF]/30' : pr.status === 'skipped' ? 'bg-[#F7F1ED]/60' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={pr.status} />
                      <span className={`text-xs font-bold ${statusTone(pr.status)}`}>{statusLabel(pr.status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="font-medium text-[#2B1723]">{pr.row.buyerName || pr.row.fullName || 'No buyer/contact'}</div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="max-w-[16rem] whitespace-normal font-medium text-[#2B1723]">{formatAttendees(pr.row)}</div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">{pr.row.groupName || <span className="italic text-[#A48A7B]">No group</span>}</td>
                  <td className="px-4 py-3 text-[#5D4A52]">{pr.row.personsAttending || 1}</td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="flex flex-col gap-0.5">
                      {pr.row.email && <span>{pr.row.email}</span>}
                      {pr.row.phone && <span>{pr.row.phone}</span>}
                      {!pr.row.email && !pr.row.phone && <span className="italic text-[#A48A7B]">No contact</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div>{pr.row.paymentStatus || 'unknown'}</div>
                    {pr.row.paymentReference && <div className="mt-0.5 text-xs text-[#8C7567]">{pr.row.paymentReference}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-[#2B1723]">
                    {pr.row.ticketCode || <span className="font-sans font-normal italic text-[#A48A7B]">None</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5D4A52]">
                    {pr.row.notes || <span className="italic text-[#A48A7B]">None</span>}
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
                  <td colSpan={isReviewMode ? 11 : 10} className="px-4 py-3 text-center text-xs italic text-[#8C7567]">
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
                Importing…
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
