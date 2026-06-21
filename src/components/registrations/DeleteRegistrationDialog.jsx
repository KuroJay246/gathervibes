import { AlertTriangle, Trash2 } from 'lucide-react'

export function DeleteRegistrationDialog({ registration, onConfirm, onCancel, deleting }) {
  if (!registration) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 event-modal-safe">
      <div className="absolute inset-0 bg-[#2B1723]/40 backdrop-blur-sm" onClick={!deleting ? onCancel : undefined} />
      
      <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 shadow-[0_24px_80px_rgba(43,23,35,0.16)] sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#FCEEF1] text-[#A32626]">
          <AlertTriangle className="size-6" strokeWidth={2} />
        </div>
        
        <h2 className="mt-5 text-center font-serif text-2xl text-[#2B1723]">Remove registration?</h2>
        <p className="mt-3 text-center text-sm leading-6 text-[#816D62]">
          This will permanently delete <strong>{registration.fullName}</strong>'s registration from this event. This action cannot be undone.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#A32626] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#851D1D] disabled:opacity-50"
          >
            {deleting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete registration
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[#5D4A52] transition hover:bg-[#F7F1ED]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
