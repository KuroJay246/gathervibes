import { AlertTriangle, RefreshCw } from 'lucide-react'

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-[24px] border border-[#F0C6C6] bg-[#FFF4F4] p-8 text-center" role="alert">
      <AlertTriangle className="mx-auto size-7 text-[#C53030]" />
      <h3 className="mt-4 font-serif text-xl text-[#6F2424]">Events could not be loaded</h3>
      <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-[#8C4A4A]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C53030] px-4 py-2.5 text-xs font-bold text-white"
      >
        <RefreshCw className="size-3.5" /> Retry
      </button>
    </div>
  )
}
