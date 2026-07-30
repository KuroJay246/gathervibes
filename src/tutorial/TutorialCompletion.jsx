import { createPortal } from 'react-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../auth/useAuth.js'
import { welcomeAboardMessage } from '../utils/organizerDisplay.js'

export function TutorialCompletion({ onDismiss }) {
  const { user, staffProfile } = useAuth()

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#160B12]/80 px-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="tutorial-complete-title" className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#F7DDE6]">
          <Sparkles className="size-5 text-[#8A3F4B]" aria-hidden="true" />
        </div>
        <h2 id="tutorial-complete-title" className="mb-2 font-serif text-xl font-bold text-[#2B1723]">{welcomeAboardMessage(user, staffProfile)}</h2>
        <p className="text-sm leading-6 text-[#5F493F]">Your Event Hub tutorial is complete. Replay it anytime from Settings.</p>
        <button type="button" onClick={onDismiss} className="mt-5 min-h-10 rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white">
          Continue
        </button>
      </section>
    </div>,
    document.body
  )
}
