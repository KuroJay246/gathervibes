import { Link } from 'react-router-dom'
import { CheckCircle2, RotateCcw } from 'lucide-react'

export function ImportSummary({ result, onReset }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-[0_4px_24px_rgba(43,23,35,0.04)]">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E5F3EC] text-[#1E7345]">
        <CheckCircle2 className="size-8" strokeWidth={2} />
      </div>
      
      <h3 className="mt-5 font-serif text-2xl text-[#2B1723]">Import succeeded</h3>
      <p className="mt-2 text-[#816D62]">
        Successfully imported <strong>{result.importedCount}</strong> registration{result.importedCount !== 1 && 's'}.
      </p>

      {result.blockedCount > 0 && (
        <div className="mx-auto mt-6 max-w-sm rounded-xl bg-[#FFF1F1] p-4 text-sm text-[#A32626]">
          <strong>{result.blockedCount}</strong> row{result.blockedCount !== 1 && 's'} were skipped due to errors or being duplicates.
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/registrations"
          className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30"
        >
          View Registrations
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#FFF8F2] px-6 py-2.5 text-sm font-bold text-[#8C7567] transition hover:bg-[#F2E8E1]"
        >
          <RotateCcw className="size-4" />
          Import Another File
        </button>
      </div>
    </div>
  )
}
