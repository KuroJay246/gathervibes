import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X } from 'lucide-react'
import { BrandMark } from '../BrandMark'
import { useAuth } from '../../auth/useAuth'
import { welcomeGreeting } from '../../utils/organizerDisplay'

const CONFETTI_PIECES = [...Array(50)].map((_, i) => ({
  id: i,
  width: `${Math.random() * 8 + 4}px`,
  height: `${Math.random() * 8 + 4}px`,
  transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)`,
  animationDelay: `${Math.random() * 0.2}s`,
  tx: `${(Math.random() - 0.5) * 300}px`,
  ty: `${(Math.random() - 0.5) * 300 - 100}px`
}))

function Confetti() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-70">
        {CONFETTI_PIECES.map((c) => (
          <div
            key={c.id}
            className="absolute rounded-full bg-gradient-to-br from-[#8A3F4B] to-[#D7B8BD]"
            style={{
              width: c.width,
              height: c.height,
              top: '50%',
              left: '50%',
              transform: c.transform,
              animation: `confetti-burst 1.5s ease-out forwards`,
              animationDelay: c.animationDelay,
              // Using custom properties to pass random directions to CSS
              '--tx': c.tx,
              '--ty': c.ty,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function WelcomeCelebration({ onStart, onSkip, onClose }) {
  const { user, staffProfile } = useAuth()
  const modalRef = useRef(null)
  
  useEffect(() => {
    // Focus trap setup
    const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const firstElement = focusableElements?.[0]
    const lastElement = focusableElements?.[focusableElements.length - 1]
    
    firstElement?.focus()
    
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose()
      }
      
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])
  
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#160B12]/80 px-4 py-6 backdrop-blur-md sm:px-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-[24px] border border-[#E7D6CC] bg-[#FFF8F2] shadow-2xl"
      >
        <Confetti />
        
        <button
          onClick={onClose}
          type="button"
          aria-label="Close welcome"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/50 p-2 text-[#5F493F] transition hover:bg-white hover:text-[#2B1723]"
        >
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
            <span>App Officially Open</span>
          </div>
          
          <h1 id="welcome-title" className="mb-2 font-serif text-2xl font-bold text-[#2B1723] sm:text-3xl">
            {welcomeGreeting(user, staffProfile)}
          </h1>
          
          <p className="mb-6 text-[15px] leading-relaxed text-[#5F493F]">
            This space was created to help you plan events, organize guests, track payments, manage tickets, coordinate suppliers and sponsors, prepare for event day, and review everything in one place.
          </p>
          
          <div className="mb-8 rounded-xl border border-[#EEDDD3] bg-white px-5 py-3 shadow-sm">
            <p className="text-sm font-medium text-[#2B1723]">Created for you by Jaylan Maynard.</p>
          </div>
          
          <p className="mb-6 text-sm text-[#5F493F]">
            Select <strong>Start Your Tour</strong> for a short walkthrough of the app.
          </p>
          
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              onClick={onSkip}
              type="button"
              className="flex-1 rounded-xl px-4 py-3.5 text-sm font-bold text-[#6B564C] transition hover:bg-[#EEDDD3]/50 focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2"
            >
              Skip for Now
            </button>
            <button
              onClick={onStart}
              type="button"
              className="flex-1 rounded-xl bg-[#8A3F4B] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#70303b] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2"
            >
              Start Your Tour
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.5);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(1);
          }
        }
      `}</style>
    </div>,
    document.body
  )
}
