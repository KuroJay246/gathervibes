import { findRegisteredTarget, isTargetAllowedForRoute } from './tutorialRegistry.js'

const DEFAULT_TIMEOUT_MS = 8000

export class TutorialTransitionController {
  constructor({ navigate, locationProvider, dispatch, activeEventName }) {
    this.navigate = navigate
    this.locationProvider = locationProvider
    this.dispatch = dispatch
    this.activeEventName = activeEventName
    this.current = null
    this.sequence = 0
  }

  nextTransitionId() {
    this.sequence += 1
    return `tutorial-transition-${this.sequence}-${Date.now()}`
  }

  cancelCurrent() {
    if (this.current?.controller) {
      this.current.controller.abort()
    }
    this.current = null
  }

  async transitionToStep(step, stepIndex, direction, createDiagnostics) {
    this.cancelCurrent()
    const transitionId = this.nextTransitionId()
    const controller = new AbortController()
    const startedAt = Date.now()
    this.current = { transitionId, controller, stepIndex }

    this.dispatch({ type: 'TRANSITION', direction, transitionId })

    try {
      if (!step) throw new Error('Missing tutorial step')
      if (!isTargetAllowedForRoute(step.routeId, step.targetId)) {
        throw new Error(`Target ${step.targetId} is not registered for route ${step.routeId}`)
      }

      await this.ensureRoute(step, transitionId, controller.signal)
      await this.waitForTarget(step, transitionId, controller.signal)
      this.dispatch({ type: 'POSITIONING', transitionId })
      this.ensureActive(transitionId, controller.signal)
      this.dispatch({ type: 'PRESENT', transitionId, stepIndex })
      return { ok: true, transitionId }
    } catch (error) {
      if (controller.signal.aborted) return { ok: false, aborted: true, transitionId }
      this.dispatch({
        type: 'ERROR',
        transitionId,
        error: friendlyError(error),
        diagnostics: createDiagnostics({ step, transitionId, startedAt, activeEventName: this.activeEventName(), reason: error.message }),
      })
      return { ok: false, error, transitionId }
    }
  }

  async ensureRoute(step, transitionId, signal) {
    this.ensureActive(transitionId, signal)
    if (this.locationProvider() !== step.pathname) {
      this.dispatch({ type: 'WAITING_FOR_ROUTE', transitionId })
      this.navigate(step.pathname)
    }
    await waitUntil({
      signal,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      test: () => this.locationProvider() === step.pathname,
      onFrame: () => this.dispatch({ type: 'WAITING_FOR_ROUTE', transitionId }),
    })
  }

  async waitForTarget(step, transitionId, signal) {
    this.dispatch({ type: 'WAITING_FOR_TARGET', transitionId })

    await waitUntil({
      signal,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      test: () => Boolean(findRegisteredTarget(step.targetId)),
    })

    const target = findRegisteredTarget(step.targetId)
    if (!target) throw new Error(`Target ${step.targetId} was not measurable`)
    target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })

    await waitUntil({
      signal,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      test: () => {
        const rect = target.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      },
    })
  }

  ensureActive(transitionId, signal) {
    if (signal.aborted || this.current?.transitionId !== transitionId) {
      throw new DOMException('Tutorial transition aborted', 'AbortError')
    }
  }
}

function friendlyError(error) {
  if (/Target/.test(error.message)) return 'This tutorial step could not find its page target yet.'
  if (/timed out/i.test(error.message)) return 'This tutorial step took too long to load.'
  return 'This tutorial step could not be prepared.'
}

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function waitUntil({ signal, timeoutMs, test, onFrame }) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    let rafId = null
    let observer = null

    function cleanup() {
      if (rafId != null) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }

    function check() {
      if (signal.aborted) {
        cleanup()
        reject(new DOMException('Tutorial transition aborted', 'AbortError'))
        return
      }
      if (test()) {
        cleanup()
        resolve()
        return
      }
      if (Date.now() - startedAt > timeoutMs) {
        cleanup()
        reject(new Error('Tutorial readiness timed out'))
        return
      }
      onFrame?.()
      rafId = requestAnimationFrame(check)
    }

    observer = new MutationObserver(() => {
      if (!signal.aborted && test()) check()
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    check()
  })
}
