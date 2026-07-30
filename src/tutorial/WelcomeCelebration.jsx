import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X } from 'lucide-react'
import { BrandMark } from '../components/BrandMark.jsx'
import { useAuth } from '../auth/useAuth.js'
import { welcomeGreeting } from '../utils/organizerDisplay.js'

export function WelcomeCelebration({ onStart, onPractice, onSkip, onClose }) {
  const { user, staffProfile } = useAuth()
  const modalRef = useRef(null)

  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const firstElement = focusableElements?.[0]
    const lastElement = focusableElements?.[focusableElements.length - 1]
    firstElement?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && firstElement && lastElement) {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#160B12]/80 px-4 py-6 backdrop-blur-md sm:px-6">
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative flex w-full max-w-[520px] flex-col overflow-hidden rounded-[24px] border border-[#E7D6CC] bg-[#FFF8F2] shadow-2xl"
      >
        <button onClick={onClose} type="button" aria-label="Close welcome" className="absolute right-4 top-4 z-10 rounded-full bg-white/60 p-2 text-[#5F493F] transition hover:bg-white hover:text-[#2B1723]">
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className="relative z-10 flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10">
          <div className="mb-6 flex justify-center" aria-label="Gather & Savor Logo" role="img">
            <div aria-hidden="true">
              <BrandMark light={false} compact={false} />
            </div>
          </div>

          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#F7DDE6] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#8A3F4B]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Guided Event Hub Orientation</span>
          </div>

          <h1 id="welcome-title" className="mb-2 font-serif text-2xl font-bold text-[#2B1723] sm:text-3xl">
            {welcomeGreeting(user, staffProfile)}
          </h1>

          <p className="mb-5 text-[15px] leading-relaxed text-[#5F493F]">
            This guided orientation shows how to plan events, organize guests, track payments, manage tickets, coordinate suppliers and sponsors, prepare for event day, and review everything in one place.
          </p>

          <div className="mb-6 rounded-xl border border-[#EEDDD3] bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-[#2B1723]">Created for you by Jaylan Maynard.</p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <button onClick={onStart} type="button" className="rounded-xl bg-[#8A3F4B] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#70303b] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2">
              Start Guided Tour
            </button>
            <button onClick={onPractice} type="button" className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-sm font-bold text-[#5F493F] transition hover:bg-[#FFF8F2] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2">
              Practice Using the App
            </button>
            <button onClick={onSkip} type="button" className="rounded-xl px-4 py-3 text-sm font-bold text-[#6B564C] transition hover:bg-[#EEDDD3]/50 focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2">
              Skip for Now
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  )
}
