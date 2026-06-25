import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Copy, Download, ShieldCheck } from 'lucide-react'
import {
  CPB_AUDIT_APPROVAL_TEXT,
  buildDryRunReport,
  generateAuditMatches,
} from '../../services/cpbAuditBackfill'
import { downloadCsv } from '../../utils/exportUtils'

function money(value) {
  return `BBD $${Number(value || 0).toFixed(2)}`
}

function valueText(value) {
  if (value === null || value === undefined || value === '') return 'Blank'
  return String(value)
}

function compactTotals(totals = {}) {
  return [
    ['Early Bird confirmed', `${totals.earlyBirdConfirmed?.rows || 0} / ${money(totals.earlyBirdConfirmed?.amountPaid)}`],
    ['General confirmed', `${totals.generalConfirmed?.rows || 0} / ${money(totals.generalConfirmed?.amountPaid)}`],
    ['General inferred', `${totals.generalInferred?.rows || 0} / ${money(totals.generalInferred?.amountPaid)}`],
    ['Partial General', `${money(totals.partialGeneral?.amountPaid)} paid / ${money(totals.partialGeneral?.balanceDue)} balance`],
    ['Door/Late paid', money(totals.doorLatePaid?.amountPaid)],
    ['Door to pay', `${totals.doorToPay?.rows || 0} / ${money(totals.doorToPay?.expectedTotal)}`],
  ]
}

function AuditRowsTable({ title, rows, emptyText }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E5D7CF] bg-white">
      <div className="border-b border-[#E5D7CF] bg-[#FBF8F5] p-4">
        <h4 className="font-bold text-[#2B1723]">{title} ({rows.length})</h4>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-[#816D62]">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E5D7CF] text-xs font-bold uppercase tracking-wider text-[#816D62]">
                <th className="px-3 py-2">Row</th>
                <th className="px-3 py-2">Audit guest</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">Proposed</th>
                <th className="px-3 py-2">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8E1]">
              {rows.map((row) => (
                <tr key={`${row.rowNumber}-${row.auditData.ticketDoorId}-${row.auditData.guestName}`} className={row.needsReview ? 'bg-[#FFF7E8]/40' : ''}>
                  <td className="px-3 py-3 text-xs font-bold text-[#8C7567]">{row.rowNumber}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-[#2B1723]">{row.auditData.guestName || row.auditData.buyerContact}</p>
                    <p className="font-mono text-xs text-[#816D62]">{row.auditData.ticketDoorId || 'No ticket/door ID'}</p>
                    <p className="text-xs text-[#816D62]">{row.auditData.paymentStatusText}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#2B1723]">{row.matchType}</p>
                    <p className="text-xs text-[#816D62]">{row.confidence} confidence</p>
                    {row.matchedRegistration && <p className="text-xs text-[#816D62]">{row.matchedRegistration.fullName}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-[#5D4A52]">
                    <div>Status: {valueText(row.currentValues.paymentStatus)}</div>
                    <div>Tier: {valueText(row.currentValues.priceTier)}</div>
                    <div>Due: {valueText(row.currentValues.amountDue)}</div>
                    <div>Paid: {valueText(row.currentValues.amountPaid)}</div>
                    <div>Ticket: {valueText(row.currentValues.ticketCode)}</div>
                  </td>
                  <td className="px-3 py-3 text-xs leading-5 text-[#5D4A52]">
                    <div>Status: {valueText(row.proposedUpdates.paymentStatus)}</div>
                    <div>Method: {valueText(row.proposedUpdates.paymentMethod)}</div>
                    <div>Tier: {valueText(row.proposedUpdates.priceTier)}</div>
                    <div>Due: {money(row.proposedUpdates.amountDue)}</div>
                    <div>Paid: {money(row.proposedUpdates.amountPaid)}</div>
                    <div>Ref: {row.proposedUpdates.paymentReference}</div>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {row.reviewReasons.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-4 text-[#7A5818]">
                        {row.reviewReasons.map((reason) => <li key={reason}>{reason}</li>)}
                      </ul>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-[#1E7345]">
                        <CheckCircle2 className="size-3.5" /> No review flag
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function PaymentAuditBackfillPanel({ sheet, existingRegistrations, event, onReset }) {
  const [copied, setCopied] = useState(false)
  const [approvalText, setApprovalText] = useState('')
  const [rowView, setRowView] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')

  const analysis = useMemo(() => {
    try {
      return { matchesResult: generateAuditMatches(sheet, existingRegistrations), error: '' }
    } catch (err) {
      return { matchesResult: null, error: err.message || 'Could not analyze payment audit.' }
    }
  }, [sheet, existingRegistrations])

  const matchesResult = analysis.matchesResult
  const error = analysis.error

  const dryRunReport = useMemo(() => (matchesResult ? buildDryRunReport(matchesResult) : ''), [matchesResult])
  const reviewRows = useMemo(() => {
    if (!matchesResult) return []
    const groups = {
      all: [...matchesResult.matches, ...matchesResult.unmatched, ...matchesResult.reviewNeeded, ...matchesResult.createCandidates],
      matched: matchesResult.matches,
      unmatched: matchesResult.unmatched,
      review: matchesResult.reviewNeeded,
      candidates: matchesResult.createCandidates,
    }
    const rows = groups[rowView] || groups.all
    if (confidenceFilter === 'all') return rows
    return rows.filter((row) => String(row.confidence || '').toLowerCase() === confidenceFilter)
  }, [confidenceFilter, matchesResult, rowView])

  async function copyDryRunReport() {
    try {
      await navigator.clipboard.writeText(dryRunReport)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  function downloadDryRunReport() {
    downloadCsv(dryRunReport, `CPB_PAYMENT_AUDIT_DRY_RUN_${event.eventId}_${Date.now()}.md`)
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#F2C3C3] bg-[#FFF1F1] p-6 text-[#A32626]">
        <h3 className="font-bold">Payment Audit could not be analyzed</h3>
        <p className="mt-2 text-sm">{error}</p>
        <button onClick={onReset} className="mt-4 rounded-xl bg-[#A32626] px-4 py-2 text-sm font-bold text-white">Start over</button>
      </div>
    )
  }

  if (!matchesResult) {
    return <div className="rounded-2xl border border-[#EEDFD6] bg-white p-6 text-[#816D62]">Analyzing payment audit...</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#F2D6A3] bg-[#FFF7E8] p-6 text-[#7A5818]">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <div>
            <h3 className="font-bold text-lg">CPB Payment Audit Backfill - Dry-Run Preview</h3>
            <p className="mt-1 text-sm leading-6">
              No Firestore writes have been performed. Review unmatched rows, review-needed rows, and missing registration candidates before any future apply step. Gmail links are not stored or exported in this report.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6">
              The organizer also shared the original audit spreadsheet with Cole for independent review. Backfill results should be cross-checked against the spreadsheet before CPB apply is approved.
            </p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Rows processed', matchesResult.totals.rowsProcessed],
          ['Matched rows', matchesResult.totals.matched],
          ['Unmatched rows', matchesResult.totals.unmatched],
          ['Review needed', matchesResult.totals.reviewNeeded],
          ['Create candidates', matchesResult.totals.createCandidates],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#E5D7CF] bg-white p-4">
            <p className="text-2xl font-bold text-[#2B1723]">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#816D62]">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="font-bold text-[#2B1723]">Totals comparison</h4>
            <p className="mt-1 text-xs text-[#816D62]">Dry-run totals grouped from workbook fields.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={copyDryRunReport} className="inline-flex items-center gap-2 rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">
              <Copy className="size-4" /> {copied ? 'Copied' : 'Copy report'}
            </button>
            <button type="button" onClick={downloadDryRunReport} className="inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white">
              <Download className="size-4" /> Download report
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {compactTotals(matchesResult.totalsComparison).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#FBF8F5] p-3">
              <p className="text-sm font-bold text-[#2B1723]">{value}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Dry-run row review</p>
            <h4 className="mt-1 font-bold text-[#2B1723]">Review inside the app before approval</h4>
            <p className="mt-1 text-xs leading-5 text-[#816D62]">Filter matched rows, unmatched rows, review-needed rows, create candidates, and confidence. Current values and proposed values are shown side by side.</p>
          </div>
          <select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)} className="rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm">
            <option value="all">All confidence levels</option>
            <option value="high">High confidence</option>
            <option value="medium">Medium confidence</option>
            <option value="low">Low confidence</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ['all', 'All dry-run rows'],
            ['matched', 'Matched rows'],
            ['unmatched', 'Unmatched rows'],
            ['review', 'Review-needed rows'],
            ['candidates', 'Create candidates'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRowView(value)}
              className={`rounded-full px-4 py-2 text-xs font-bold ${rowView === value ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <AuditRowsTable title="Filtered dry-run review rows" rows={reviewRows} emptyText="No rows match this review filter." />

      <section className="rounded-2xl border border-[#F2C3C3] bg-[#FFF8F8] p-5 text-[#7E1E1E]">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold">Apply Approved Updates is locked</h4>
            <p className="mt-1 text-sm leading-6">
              This Phase 14B implementation stops after dry-run by default. Future apply must require exact organizer approval, export a backup first, update only selected matched rows, create auditLogs, and never create missing registrations automatically.
            </p>
            <label className="mt-4 block text-xs font-bold uppercase tracking-wider">Required confirmation text</label>
            <input
              value={approvalText}
              onChange={(event) => setApprovalText(event.target.value)}
              placeholder={CPB_AUDIT_APPROVAL_TEXT}
              className="mt-2 w-full rounded-xl border border-[#F2C3C3] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={approvalText !== CPB_AUDIT_APPROVAL_TEXT}
              onClick={() => window.alert('Apply is intentionally not run in this dry-run implementation. No CPB writes were performed.')}
              className="mt-3 rounded-xl bg-[#A32626] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply remains disabled for dry-run handoff
            </button>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" onClick={onReset} className="rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#6B564C]">
          Start over
        </button>
      </div>
    </div>
  )
}
