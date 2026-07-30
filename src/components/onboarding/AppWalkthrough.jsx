import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, Map, RefreshCw, X } from 'lucide-react'
import { walkthroughSteps } from './onboardingSteps'
import { useAuth } from '../../auth/useAuth'
import { canViewRoute } from '../../utils/accessRoles'

const ROUTE_READY_MARKERS = {
  '/dashboard': '[data-tour-id="overview-summary"], h2',
  '/events': '[data-tour-id="create-event-action"], h2',
  '/registrations': '[data-tour-id="registrations-workspace"], h2',
  '/payments': '[data-tour-id="payments-workspace"], h2',
  '/tickets': '[data-tour-id="tickets-workspace"], h2',
  '/check-in': '[data-tour-id="checkin-workspace"], h2',
  '/operations': '[data-tour-id="operations-workspace"], h2',
  '/event-review': '[data-tour-id="reports-workspace"], h2',
  '/communications': '[data-tour-id="message-builder-workspace"], h2',
  '/imports': '[data-tour-id="imports-workspace"], h2',
  '/settings': '[data-tour-id="settings-workspace"], h2',
  '/qa': '[data-tour-id="system-qa-workspace"], h2',
}

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
  '/qa': 'System QA',
}

const NAV_TIMEOUT_MS = 5000
const SPOTLIGHT_PADDING = 8
const TOOLTIP_GAP = 16

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function targetSelector(step) {
  return step?.targetId ? `[data-tour-id="${step.targetId}"]` : 'main h2, header h1'
}

function findTarget(step) {
  const candidates = [
    ...document.querySelectorAll(targetSelector(step)),
    ...document.querySelectorAll('main h2, header h1'),
  ]
  return candidates.find((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0
  }) || null
}

function calculatePlacement(targetRect, tooltipWidth = 360, tooltipHeight = 280) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const canRight = targetRect.right + TOOLTIP_GAP + tooltipWidth < viewportWidth
  const canLeft = targetRect.left - TOOLTIP_GAP - tooltipWidth > 0
  const canBelow = targetRect.bottom + TOOLTIP_GAP + tooltipHeight < viewportHeight
  const canAbove = targetRect.top - TOOLTIP_GAP - tooltipHeight > 0

  if (canRight) return 'right'
  if (canLeft) return 'left'
  if (canBelow) return 'bottom'
  if (canAbove) return 'top'
  return 'center'
}

function ArrowIcon({ placement }) {
  if (placement === 'right') return <ArrowLeft className="size-4" aria-hidden="true" />
  if (placement === 'left') return <ArrowRight className="size-4" aria-hidden="true" />
  if (placement === 'bottom') return <ArrowUp className="size-4" aria-hidden="true" />
  return <ArrowDown className="size-4" aria-hidden="true" />
}

export function AppWalkthrough({ initialStep = 0, onComplete, onSkip, onClose }) {
  const safeInitialStep = clamp(Number(initialStep) || 0, 0, walkthroughSteps.length - 1)
  const [currentStepIndex, setCurrentStepIndex] = useState(safeInitialStep)
  const [errorMsg, setErrorMsg] = useState('')
  const [navPending, setNavPending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [spotlight, setSpotlight] = useState(null)
  const [placement, setPlacement] = useState('bottom')
  const panelRef = useRef(null)
  const headingRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { access } = useAuth()

  const step = walkthroughSteps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === walkthroughSteps.length - 1
  const progress = Math.round(((currentStepIndex + 1) / walkthroughSteps.length) * 100)

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
        if (window.location.pathname !== targetRoute) {
          requestAnimationFrame(check)
          return
        }
        const h1 = document.querySelector('header h1')
        if (expectedTitle && h1 && !h1.textContent.includes(expectedTitle)) {
          requestAnimationFrame(check)
          return
        }
        if (marker && !document.querySelector(marker)) {
          requestAnimationFrame(check)
          return
        }
        resolve()
      }

      requestAnimationFrame(check)
    })
  }, [])

  const updateSpotlight = useCallback(() => {
    const target = findTarget(step)
    if (!target) {
      setSpotlight(null)
      return
    }

    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    window.setTimeout(() => {
      const rect = target.getBoundingClientRect()
      const nextRect = {
        top: clamp(rect.top - SPOTLIGHT_PADDING, 8, window.innerHeight - 24),
        left: clamp(rect.left - SPOTLIGHT_PADDING, 8, window.innerWidth - 24),
        width: clamp(rect.width + (SPOTLIGHT_PADDING * 2), 48, window.innerWidth - 16),
        height: clamp(rect.height + (SPOTLIGHT_PADDING * 2), 40, window.innerHeight - 16),
      }
      setSpotlight(nextRect)
      setPlacement(calculatePlacement(nextRect, 360, 320))
      headingRef.current?.focus()
    }, 180)
  }, [step])

  const navigateToStep = useCallback(async (nextIndex) => {
    const nextStep = walkthroughSteps[nextIndex]
    if (!nextStep) return
    if (!canViewRoute(access, nextStep.route)) {
      setErrorMsg('Your current role cannot view this page.')
      return
    }

    setErrorMsg('')
    if (location.pathname !== nextStep.route) {
      setNavPending(true)
      navigate(nextStep.route)
      try {
        await waitForRouteReady(nextStep.route)
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Onboarding] Navigation timeout:', error)
        setErrorMsg('Navigation is taking longer than expected. Retry navigation or continue when the page finishes loading.')
      } finally {
        setNavPending(false)
      }
    }
    setCurrentStepIndex(nextIndex)
  }, [access, location.pathname, navigate, waitForRouteReady])

  useEffect(() => {
    let cancelled = false
    async function ensureReady() {
      if (!step) return
      if (location.pathname !== step.route) {
        await navigateToStep(currentStepIndex)
      }
      if (!cancelled) updateSpotlight()
    }
    ensureReady()
    return () => {
      cancelled = true
    }
  }, [currentStepIndex, location.pathname, navigateToStep, step, updateSpotlight])

  useEffect(() => {
    function handleResize() {
      updateSpotlight()
    }
    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleResize, true)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleResize, true)
    }
  }, [updateSpotlight])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose(currentStepIndex)
      if (event.key === 'ArrowRight') navigateToStep(Math.min(walkthroughSteps.length - 1, currentStepIndex + 1))
      if (event.key === 'ArrowLeft') navigateToStep(Math.max(0, currentStepIndex - 1))
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentStepIndex, navigateToStep, onClose])

  async function finishTour() {
    setSaving(true)
    setErrorMsg('')
    const result = await onComplete(walkthroughSteps.length)
    setSaving(false)
    if (!result?.success) {
      if (import.meta.env.DEV) console.error('[Onboarding] Completion save failed:', result?.error)
      setErrorMsg('Could not save completion. Check your connection and try again.')
    }
  }

  function panelStyle() {
    const fallback = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
    if (!spotlight) return fallback

    const width = Math.min(390, window.innerWidth - 24)
    const height = 320
    if (placement === 'right') {
      return {
        left: `${clamp(spotlight.left + spotlight.width + TOOLTIP_GAP, 12, window.innerWidth - width - 12)}px`,
        top: `${clamp(spotlight.top, 12, window.innerHeight - height - 12)}px`,
        width: `${width}px`,
      }
    }
    if (placement === 'left') {
      return {
        left: `${clamp(spotlight.left - width - TOOLTIP_GAP, 12, window.innerWidth - width - 12)}px`,
        top: `${clamp(spotlight.top, 12, window.innerHeight - height - 12)}px`,
        width: `${width}px`,
      }
    }
    if (placement === 'top') {
      return {
        left: `${clamp(spotlight.left, 12, window.innerWidth - width - 12)}px`,
        top: `${clamp(spotlight.top - height - TOOLTIP_GAP, 12, window.innerHeight - height - 12)}px`,
        width: `${width}px`,
      }
    }
    if (placement === 'bottom') {
      return {
        left: `${clamp(spotlight.left, 12, window.innerWidth - width - 12)}px`,
        top: `${clamp(spotlight.top + spotlight.height + TOOLTIP_GAP, 12, window.innerHeight - height - 12)}px`,
        width: `${width}px`,
      }
    }
    return fallback
  }

  const modal = (
    <div className="fixed inset-0 z-[110] pointer-events-none" aria-hidden="false">
      <div className="absolute inset-0" aria-hidden="true" />
      {spotlight && (
        <div
          className="absolute rounded-[20px] border-2 border-[#F7DDE6] bg-transparent shadow-[0_0_0_9999px_rgba(22,11,18,0.62),0_18px_50px_rgba(0,0,0,0.25)] transition-all duration-200"
          style={{
            left: spotlight.left,
            top: spotlight.top,
            width: spotlight.width,
            height: spotlight.height,
          }}
          aria-hidden="true"
        />
      )}

      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-step-title"
        className="pointer-events-auto absolute max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl"
        style={panelStyle()}
      >
        <div className="h-1 w-full bg-[#EEDDD3]" aria-hidden="true">
          <div className="h-1 bg-[#8A3F4B] transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-[#EEDDD3] px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">Step {currentStepIndex + 1} of {walkthroughSteps.length}</p>
            <h2 id="tour-step-title" ref={headingRef} tabIndex={-1} className="mt-1 font-serif text-xl text-[#2B1723] focus:outline-none">{step.title}</h2>
          </div>
          <button type="button" onClick={() => onClose(currentStepIndex)} className="rounded-full p-2 text-[#5F493F] hover:bg-[#FFF8F2] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]" aria-label="Close tour">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#F7DDE6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A3F4B]">
            <ArrowIcon placement={placement} />
            Spotlight
          </div>
          <p className="text-sm leading-6 text-[#5F493F]">{step.content}</p>
          <div className="mt-4 space-y-3 rounded-2xl border border-[#EFE2DA] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#5F493F]">
            <p><strong className="text-[#2B1723]">When to use it:</strong> {step.when}</p>
            <p><strong className="text-[#2B1723]">Example:</strong> {step.example}</p>
          </div>

          {navPending && (
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#8A3F4B]" aria-live="polite">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              Navigating to the target page...
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mt-4 rounded-xl border border-[#F2C98C] bg-[#FFF8EA] p-3 text-sm leading-6 text-[#7A5818]">
              <p>{errorMsg}</p>
              <button type="button" onClick={() => navigateToStep(currentStepIndex)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold underline underline-offset-2">
                <RefreshCw className="size-3" aria-hidden="true" />
                Retry Navigation
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#EEDDD3] bg-[#FFF8F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => onSkip(currentStepIndex)} className="rounded-lg px-2 py-2 text-sm font-semibold text-[#5F493F] hover:text-[#2B1723] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]">
            Skip
          </button>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => navigateToStep(currentStepIndex - 1)}
              disabled={isFirstStep || navPending}
              className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm font-bold text-[#5F493F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Back
            </button>
            {isLastStep ? (
              <button type="button" onClick={finishTour} disabled={saving || navPending} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white disabled:opacity-60">
                <Map className="size-4" aria-hidden="true" />
                {saving ? 'Saving...' : 'Finish'}
              </button>
            ) : (
              <button type="button" onClick={() => navigateToStep(currentStepIndex + 1)} disabled={navPending} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white disabled:opacity-60">
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )

  return createPortal(modal, document.body)
}
