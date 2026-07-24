import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react'
import { walkthroughSteps } from './onboardingSteps'
import { useActiveEvent } from '../../events/useActiveEvent'
import { useAuth } from '../../auth/useAuth'
import { canViewRoute } from '../../utils/accessRoles'

export function AppWalkthrough({ onComplete, onSkip, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const modalRef = useRef(null)
  const navigate = useNavigate()
  const { activeEvent } = useActiveEvent()
  const { access } = useAuth()
  
  const step = walkthroughSteps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === walkthroughSteps.length - 1
  const isCompletionScreen = currentStepIndex === walkthroughSteps.length

  // Focus management
  useEffect(() => {
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
  }, [currentStepIndex, onClose])

  const handleNext = () => {
    setErrorMsg('')
    if (isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      setCurrentStepIndex(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    setErrorMsg('')
    if (!isFirstStep && !isCompletionScreen) {
      setCurrentStepIndex(currentStepIndex - 1)
    } else if (isCompletionScreen) {
      setCurrentStepIndex(walkthroughSteps.length - 1)
    }
  }

  const navigateToStepRoute = () => {
    if (!step?.route) return
    if (!canViewRoute(access, step.route)) {
      setErrorMsg('You do not have permission to view this page.')
      return
    }
    const requiresEvent = ['/payments', '/check-in', '/operations', '/tickets', '/registrations'].includes(step.route)
    if (requiresEvent && !activeEvent) {
      setErrorMsg('This page requires a selected Working Event to view.')
      return
    }
    navigate(step.route)
  }

  const handleFinish = async (targetRoute) => {
    const result = await onComplete(currentStepIndex)
    if (result?.success) {
      if (targetRoute) {
        navigate(targetRoute)
      }
    } else {
      setErrorMsg('Failed to save completion. Please try again.')
    }
  }

  if (isCompletionScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#160B12]/40 p-4 backdrop-blur-sm sm:p-6 pointer-events-none">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-completion-title"
          className="pointer-events-auto relative flex w-full max-w-[440px] flex-col rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl"
        >
          <div className="p-6 sm:p-8 text-center">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[#F7DDE6] text-[#8A3F4B]">
              <Map className="size-6" />
            </div>
            
            <h2 id="tour-completion-title" className="mb-3 font-serif text-2xl font-bold text-[#2B1723]">
              You’re Ready to Begin
            </h2>
            <p className="mb-6 text-[15px] leading-relaxed text-[#5F493F]">
              Your Gather & Savor Event Hub is ready for your next event. Start by selecting <strong>Plan a New Event</strong>, or continue with an event already created.
            </p>
            
            <p className="mb-8 text-xs font-medium text-[#8A3F4B] uppercase tracking-wider">
              Created by Jaylan Maynard
            </p>
            
            {errorMsg && (
              <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleFinish('/events')}
                className="w-full rounded-xl bg-[#8A3F4B] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#70303b]"
              >
                Plan a New Event
              </button>
              <button
                onClick={() => handleFinish('/dashboard')}
                className="w-full rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-sm font-bold text-[#2B1723] transition hover:bg-[#FFF8F2]"
              >
                Go to Overview
              </button>
              <button
                onClick={() => handleFinish()}
                className="w-full px-4 py-2 text-sm text-[#5F493F] transition hover:text-[#2B1723]"
              >
                Finish Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="pointer-events-auto relative flex w-full max-w-[400px] flex-col rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl sm:max-w-[440px]"
      >
        <div className="flex items-center justify-between border-b border-[#EEDDD3] px-5 py-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A3F4B]">
              Step {currentStepIndex + 1} of {walkthroughSteps.length}
            </span>
            <h2 id="tour-step-title" className="text-lg font-bold text-[#2B1723]">
              {step.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5F493F] transition hover:bg-[#FFF8F2] hover:text-[#2B1723]"
            aria-label="Close tour"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-[15px] leading-relaxed text-[#5F493F]">
            {step.content}
          </p>
          
          {step.route && (
            <div className="mt-5">
              <button
                onClick={navigateToStepRoute}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A3F4B] hover:text-[#70303b]"
              >
                Open This Page <ChevronRight className="size-4" />
              </button>
            </div>
          )}
          
          {errorMsg && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#EEDDD3] bg-[#FFF8F2] px-5 py-4 rounded-b-2xl">
          <button
            onClick={onSkip}
            className="text-sm font-semibold text-[#5F493F] hover:text-[#2B1723]"
          >
            Skip Tour
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={isFirstStep}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isFirstStep ? 'text-gray-400 opacity-50' : 'text-[#2B1723] hover:bg-white hover:shadow-sm'
              }`}
            >
              <ChevronLeft className="size-4" /> Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-[#2B1723] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#160B12]"
            >
              Next <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
