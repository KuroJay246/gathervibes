export function BrandMark({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid shrink-0 place-items-center rounded-2xl border font-serif text-2xl italic shadow-sm ${
          light
            ? 'border-white/15 bg-white/10 text-[#F5E6C8]'
            : 'border-[#B76E79]/20 bg-white text-[#B76E79]'
        } ${compact ? 'size-10' : 'size-12'}`}
        aria-hidden="true"
      >
        &
      </div>
      {!compact && (
        <div>
          <p className={`font-serif text-lg leading-none ${light ? 'text-white' : 'text-[#2B1723]'}`}>
            Gather & Savor
          </p>
          <p className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] ${light ? 'text-white/45' : 'text-[#A48A7B]'}`}>
            Event Hub
          </p>
        </div>
      )}
    </div>
  )
}
