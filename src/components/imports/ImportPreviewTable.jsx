import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

export function ImportPreviewTable({ processedRows, onCancel, onImport, importing }) {
  const validRows = processedRows.filter(r => r.status === 'valid')
  const warningRows = processedRows.filter(r => r.status === 'warning')
  const blockedRows = processedRows.filter(r => r.status === 'blocked')
  
  const canImport = validRows.length > 0 || warningRows.length > 0

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(43,23,35,0.04)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-serif text-xl text-[#2B1723]">Preview Import</h3>
          <p className="mt-1 text-sm text-[#816D62]">
            Review the rows before importing to Firestore.
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
          <div className="flex items-center gap-1.5 text-[#A32626]">
            <XCircle className="size-4" />
            {blockedRows.length} Blocked
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#F2E8E1]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2E8E1]">
              {processedRows.slice(0, 100).map((pr, idx) => (
                <tr key={idx} className={pr.status === 'blocked' ? 'bg-[#FFF1F1]/50' : pr.status === 'warning' ? 'bg-[#FFF4DF]/30' : ''}>
                  <td className="px-4 py-3">
                    {pr.status === 'valid' && <CheckCircle2 className="size-5 text-[#1E7345]" />}
                    {pr.status === 'warning' && <AlertCircle className="size-5 text-[#986F26]" />}
                    {pr.status === 'blocked' && <XCircle className="size-5 text-[#A32626]" />}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2B1723]">{pr.row.fullName}</td>
                  <td className="px-4 py-3 text-[#5D4A52]">
                    <div className="flex flex-col gap-0.5">
                      {pr.row.email && <span>{pr.row.email}</span>}
                      {pr.row.phone && <span>{pr.row.phone}</span>}
                      {!pr.row.email && !pr.row.phone && <span className="italic text-[#A48A7B]">No contact</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#A32626]">
                    {pr.issues.length > 0 ? pr.issues.join(', ') : <span className="text-[#816D62]">None</span>}
                  </td>
                </tr>
              ))}
              {processedRows.length > 100 && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-center text-xs italic text-[#8C7567]">
                    ...and {processedRows.length - 100} more rows not shown.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={importing}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#8C7567] transition hover:bg-[#F2E8E1] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onImport(validRows.concat(warningRows))}
          disabled={!canImport || importing}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30 disabled:opacity-50"
        >
          {importing ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Importing…
            </>
          ) : (
            `Import ${validRows.length + warningRows.length} rows`
          )}
        </button>
      </div>
    </div>
  )
}
