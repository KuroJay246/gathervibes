import { Link } from 'react-router'
import { CheckCircle2, RotateCcw } from 'lucide-react'

export function ImportSummary({ result, onReset }) {
  const importedCount = result?.importedCount ?? 0
  const rejectedCount = result?.rejectedCount ?? 0
  const duplicateCount = result?.duplicateCount ?? result?.blockedCount ?? 0
  const failedCount = result?.failedCount ?? 0
  const unattemptedCount = result?.unattemptedCount ?? 0
  const alreadyImportedCount = result?.alreadyImportedCount ?? 0
  const operationStatus = failedCount || unattemptedCount ? 'Partial success - retry remaining when available' : 'Completed'

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-[0_4px_24px_rgba(43,23,35,0.04)]">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E5F3EC] text-[#1E7345]">
        <CheckCircle2 className="size-8" strokeWidth={2} />
      </div>
      
      <h3 className="mt-5 font-serif text-2xl text-[#2B1723]">Import succeeded</h3>
      <p className="mt-2 text-[#816D62]">
        Successfully imported <strong>{importedCount}</strong> registration{importedCount !== 1 && 's'}.
      </p>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-[#F2E8E1] bg-[#FBF8F5] p-4 text-left text-sm text-[#5D4A52] sm:grid-cols-2">
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Operation status</dt><dd className="font-bold text-[#2B1723]">{operationStatus}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Imported</dt><dd>{importedCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Rejected</dt><dd>{rejectedCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Duplicates</dt><dd>{duplicateCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Failed</dt><dd>{failedCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Unattempted</dt><dd>{unattemptedCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Already imported</dt><dd>{alreadyImportedCount}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Retry Remaining</dt><dd>{failedCount + unattemptedCount}</dd></div>
      </dl>

      {(result?.blockedCount ?? 0) > 0 && (
        <div className="mx-auto mt-6 max-w-sm rounded-xl bg-[#FFF1F1] p-4 text-sm text-[#A32626]">
          <strong>{result.blockedCount}</strong> row{result.blockedCount !== 1 && 's'} were skipped due to errors or being duplicates.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/registrations"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#9A5260]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#9A5260]/30"
        >
          View Registrations
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#FFF8F2] px-6 py-2.5 text-sm font-bold text-[#80685B] transition hover:bg-[#F2E8E1]"
        >
          <RotateCcw className="size-4" />
          Import Another File
        </button>
      </div>
    </div>
  )
}
