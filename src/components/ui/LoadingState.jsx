export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-[24px] border border-[#EEDFD6] bg-white" role="status">
      <div className="flex flex-col items-center gap-4">
        <span className="size-8 animate-spin rounded-full border-[3px] border-[#F1DDE1] border-t-[#9A5260]" />
        <p className="text-xs font-semibold text-[#806C61]">{message}</p>
      </div>
    </div>
  )
}
