import { AlertTriangle } from 'lucide-react'

export function DeleteEventDialog({ event, deleting, error, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#160B12]/65 p-4 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-event-title" className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_80px_rgba(26,12,19,0.3)] sm:p-7">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#FFF0F0] text-[#C53030]">
          <AlertTriangle className="size-5" />
        </span>
        <h2 id="delete-event-title" className="mt-5 font-serif text-2xl text-[#2B1723]">Delete this event?</h2>
        <p className="mt-3 text-sm leading-6 text-[#806C61]">
          <strong className="text-[#4A333D]">{event.eventName}</strong> will be permanently removed. This action cannot be undone.
        </p>
        {error && <p className="mt-4 rounded-xl bg-[#FFF0F0] px-4 py-3 text-xs text-[#A32626]" role="alert">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={deleting} className="rounded-xl border border-[#E1D1C8] px-5 py-3 text-xs font-bold text-[#6B564C] disabled:opacity-50">Keep event</button>
          <button type="button" onClick={onConfirm} disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C53030] px-5 py-3 text-xs font-bold text-white disabled:opacity-60">
            {deleting && <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  )
}
