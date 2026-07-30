export function TutorialProgress({ current, total }) {
  const percent = Math.round((current / total) * 100)
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">Step {current} of {total}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EEDDD3]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#8A3F4B] transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
