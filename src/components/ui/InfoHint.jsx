import { useState } from 'react'
import { Info } from 'lucide-react'

export function InfoHint({ label = 'More information', children, className = '' }) {
  const [open, setOpen] = useState(false)

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex size-5 items-center justify-center rounded-full text-[#A48A7B] transition hover:bg-[#F7F1ED] hover:text-[#2B1723] focus:bg-[#F7F1ED] focus:text-[#2B1723] focus:outline-none"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span className="absolute right-0 top-6 z-20 w-60 rounded-xl border border-[#EEDFD6] bg-white p-3 text-left text-[11px] font-semibold leading-4 text-[#6B564C] shadow-lg">
          {children}
        </span>
      )}
    </span>
  )
}
