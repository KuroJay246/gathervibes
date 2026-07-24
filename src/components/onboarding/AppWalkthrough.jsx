import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, ChevronRight, ChevronLeft, Map, RefreshCw } from 'lucide-react'
import { walkthroughSteps } from './onboardingSteps'
import { useActiveEvent } from '../../events/useActiveEvent'
import { useAuth } from '../../auth/useAuth'
import { canViewRoute } from '../../utils/accessRoles'

// Route-specific markers to confirm a page has actually finished rendering.
// Each value is a CSS selector that should exist in the DOM once the route is ready.
const ROUTE_READY_MARKERS = {
  '/dashboard': '[data-route="dashboard"], h2.font-serif',
  '/events': 'h2.font-serif',
  '/registrations': 'h2.font-serif',
  '/payments': 'h2.font-serif',
  '/tickets': 'h2.font-serif',
  '/check-in': 'h2.font-serif',
  '/operations': 'h2.font-serif',
  '/event-review': 'h2.font-serif',
  '/communications': 'h2.font-serif',
  '/imports': 'h2.font-serif',
  '/settings': 'h2.font-serif',
}

// Page-title text that must appear in the AppShell h1 for route confirmation.
// This prevents false positives from a generic heading being present before navigation.
const ROUTE_HEADER_TITLES = {
  '/dashboard': 'Overview',
  '/events': 'Events',
  '/registrations': 'Guests',
  '/payments': 'Payments',
  '/tickets': 'Tickets',
  '/check-in': 'Check-In',
  '/operations': 'Operations',
  '/event-review': 'Reports',
  '/communications': 'Message Builder',
  '/imports': 'Import Center',
  '/settings': 'Settings',
}

const NAV_TIMEOUT_MS = 5000

export function AppWalkthrough({ initialStep = 0, onComplete, onSkip, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep)
  const [errorMsg, setErrorMsg] = useState('')
  const [navPending, setNavPending] = useState(false)
  const [saving, setSaving] = useState(false)
  const headingRef = useRef(null)
  const modalRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeEvent } = useActiveEvent()
  const { access } = useAuth()

  const step = walkthroughSteps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === walkthroughSteps.length - 1
  const isCompletionScreen = currentStepIndex === walkthroughSteps.length

  // Focus heading after step changes
  useEffect(() => {
    if (!navPending && headingRef.current) {
      headingRef.current.focus()
    }
  }, [currentStepIndex, navPending])

  // Focus trap
  useEffect(() => {
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements?.[0]
    const lastElement = focusableElements?.[focusableElements.length - 1]

    if (!navPending) firstElement?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose(currentStepIndex)
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
  }, [currentStepIndex, onClose, navPending])

  // Verify a route has actually rendered by checking the AppShell h1 text
  // and a route-specific marker element. Returns true once confirmed.
  const waitForRouteReady = useCallback((targetRoute) => {
    return new Promise((resolve, reject) => {
      const expectedTitle = ROUTE_HEADER_TITLES[targetRoute]
      const marker = ROUTE_READY_MARKERS[targetRoute]
      const deadline = Date.now() + NAV_TIMEOUT_MS

      function check() {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for route: ${targetRoute}`))
          return
        }
        // Check path matches
        if (window.location.pathname !== targetRoute) {
          requestAnimationFrame(check)
          return
        }
        // Check the AppShell h1 contains expected title text
        const h1 = document.querySelector('header h1')
        if (expectedTitle && h1 && !h1.textContent.includes(expectedTitle)) {
          requestAnimationFrame(check)
          return
        }
        // Check route-specific marker exists
        if (marker && !document.querySelector(marker)) {
          requestAnimationFrame(check)
          return
        }
        resolve()
      }

      requestAnimationFrame(check)
    })
  }, [])

  const navigateAndAdvance = useCallback(async (nextIndex) => {
    const nextStep = walkthroughSteps[nextIndex]
    if (!nextStep) {
      setCurrentStepIndex(nextIndex)
      return
    }

    const targetRoute = nextStep.route
    const alreadyThere = location.pathname === targetRoute

    if (!targetRoute || alreadyThere) {
      setCurrentStepIndex(nextIndex)
      return
    }

    if (!canViewRoute(access, targetRoute)) {
      setErrorMsg('You do not have permission to view this page.')
      return
    }

    const requiresEvent = ['/payments', '/check-in', '/operations', '/tickets', '/registrations'].includes(targetRoute)
    if (requiresEvent && !activeEvent) {
      // Navigate anyway — the page will show its own empty state
    }

    setNavPending(true)
    setErrorMsg('')
    navigate(targetRoute)

    try {
      await waitForRouteReady(targetRoute)
      setCurrentStepIndex(nextIndex)
    } catch (err) {
      console.error('[Onboarding] Navigation timeout:', err)
      setErrorMsg(`Navigation to this page is taking longer than expected. Try again or continue.`)
    } finally {
      setNavPending(false)
    }
  }, [location.pathname, access, activeEvent, navigate, waitForRouteReady])

  const handleNext = () => {
    setErrorMsg('')
    if (isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      navigateAndAdvance(currentStepIndex + 1)
    }
  }

  const handleBack = () => {
    setErrorMsg('')
    if (isCompletionScreen) {
      navigateAndAdvance(walkthroughSteps.length - 1)
    } else if (!isFirstStep) {
      navigateAndAdvance(currentStepIndex - 1)
    }
  }

  const handleFinish = async (targetRoute) => {
    setSaving(true)
    setErrorMsg('')
    const result = await onComplete(currentStepIndex)
    setSaving(false)
    if (result?.success) {
      if (targetRoute) navigate(targetRoute)
    } else {
      if (import.meta.env.DEV) {
        console.error('[Onboarding] Completion save failed:', result?.error)
      }
      setErrorMsg('Could not save your progress. Please check your connection and try again.')
    }
  }

  // Progress bar (0–100%)
  const progress = isCompletionScreen
    ? 100
    : Math.round(((currentStepIndex + 1) / walkthroughSteps.length) * 100)

  const modal = isCompletionScreen ? (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-[#160B12]/55 px-4 py-6 backdrop-blur-[2px] sm:px-6"
      aria-hidden="false"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-completion-title"
        className="relative flex w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl"
      >
        {/* Progress — completed */}
        <div className="h-1 w-full bg-[#8A3F4B]" aria-hidden="true" />

        <div className="p-6 sm:p-8 text-center">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-[#F7DDE6] text-[#8A3F4B]">
            <Map className="size-6" aria-hidden="true" />
          </div>

          <h2
            id="tour-completion-title"
            ref={headingRef}
            tabIndex={-1}
            className="mb-3 font-serif text-2xl font-bold text-[#2B1723] focus:outline-none"
          >
            You&rsquo;re Ready to Begin
          </h2>
          <p className="mb-3 text-[15px] leading-relaxed text-[#5F493F]">
            Your Gather &amp; Savor Event Hub is ready. Select an action below to get started.
          </p>

          <p className="mb-2 text-xs font-medium text-[#8A3F4B] uppercase tracking-wider">
            Created by Jaylan Maynard
          </p>
          <p className="mb-6 text-xs text-[#5F493F]">
            Need help using the app? Contact Jaylan Maynard.
          </p>

          {errorMsg && (
            <div role="alert" className="mb-5 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleFinish('/dashboard')}
              disabled={saving}
              className="w-full rounded-xl bg-[#2B1723] px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#160B12] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2"
            >
              {saving ? 'Saving…' : 'Finish and Go to Overview'}
            </button>
            <button
              type="button"
              onClick={() => handleFinish('/events')}
              disabled={saving}
              className="w-full rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-sm font-bold text-[#2B1723] transition hover:bg-[#FFF8F2] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2"
            >
              {saving ? 'Saving…' : 'Plan a New Event'}
            </button>
            {errorMsg && (
              <button
                type="button"
                onClick={() => handleFinish('/dashboard')}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E7D6CC] px-4 py-3 text-sm font-bold text-[#5F493F] transition hover:bg-[#FFF8F2] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-2"
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-[#160B12]/55 px-4 py-6 backdrop-blur-[2px] sm:px-6"
      aria-hidden="false"
    >
      {/* Backdrop click closes tour */}
      <button
        type="button"
        aria-label="Close tour"
        className="absolute inset-0 cursor-default"
        onClick={() => onClose(currentStepIndex)}
        tabIndex={-1}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="pointer-events-auto relative flex w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl"
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-[#EEDDD3]" aria-hidden="true">
          <div
            className="h-1 bg-[#8A3F4B] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEDDD3] px-5 py-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A3F4B]">
              Step {currentStepIndex + 1} of {walkthroughSteps.length}
            </span>
            <h2
              id="tour-step-title"
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-bold text-[#2B1723] focus:outline-none"
            >
              {step.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onClose(currentStepIndex)}
            className="rounded-full p-2 text-[#5F493F] transition hover:bg-[#FFF8F2] hover:text-[#2B1723] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]"
            aria-label="Close tour"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-6">
          <p className="max-w-prose text-[15px] leading-relaxed text-[#5F493F]">
            {step.content}
          </p>

          {navPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-[#8A3F4B]" aria-live="polite">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              <span>Navigating to this page&hellip;</span>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <p className="mb-2">{errorMsg}</p>
              {navPending === false && (
                <button
                  type="button"
                  onClick={() => navigateAndAdvance(currentStepIndex)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 underline underline-offset-2 hover:no-underline"
                >
                  <RefreshCw className="size-3" aria-hidden="true" />
                  Retry Navigation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#EEDDD3] bg-[#FFF8F2] px-5 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onSkip(currentStepIndex)}
            className="text-sm font-semibold text-[#5F493F] hover:text-[#2B1723] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] rounded-lg px-2 py-1"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep || navPending}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                isFirstStep || navPending
                  ? 'text-gray-400 opacity-50 cursor-not-allowed'
                  : 'text-[#2B1723] hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]'
              }`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" /> Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={navPending}
              className="flex items-center gap-1 rounded-lg bg-[#2B1723] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#160B12] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#8A3F4B] focus:ring-offset-1"
            >
              {isLastStep ? 'Finish' : 'Next'} <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
