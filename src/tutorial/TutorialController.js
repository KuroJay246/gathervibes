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
      await this.prepareStep(step, transitionId, controller.signal)
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

  async prepareStep(step, transitionId, signal) {
    this.ensureActive(transitionId, signal)
    const prepare = step.prepare
    if (!prepare) return

    if (prepare.type === 'open-event-form') {
      await openEventFormIfNeeded()
      if (prepare.formStep) {
        window.dispatchEvent(new CustomEvent('tutorial:event-form-step', { detail: { stepId: prepare.formStep } }))
      }
      return
    }

    if (prepare.type === 'close-event-form') {
      await closeEventFormIfOpen()
      return
    }

    if (prepare.type === 'open-details') {
      const details = document.querySelector(prepare.selector)
      if (details instanceof HTMLDetailsElement) details.open = true
      return
    }

    if (prepare.type === 'select-tab') {
      const tab = document.querySelector(`[role="tab"][aria-controls="${prepare.panelId}"]`)
      tab?.click()
      await animationFrame()
    }
  }

  async performStepAction(step, mode = 'show') {
    if (!step) return { ok: false, message: 'No tutorial step is active.' }

    if (step.id === 'create-event') {
      await openEventFormIfNeeded()
      return { ok: Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')), message: 'The event form is open. Nothing has been saved.' }
    }

    if (['event-basics', 'event-category', 'event-capabilities'].includes(step.id)) {
      await openEventFormIfNeeded()
      if (step.prepare?.formStep) {
        window.dispatchEvent(new CustomEvent('tutorial:event-form-step', { detail: { stepId: step.prepare.formStep } }))
        await animationFrame()
      }
      const target = findRegisteredTarget(step.targetId)
      target?.focus?.()
      return { ok: Boolean(target), message: mode === 'try' ? 'Target verified in the temporary event form. Nothing has been saved.' : 'The temporary event form target is ready. Nothing has been saved.' }
    }

    if (step.id === 'event-planning') {
      await closeEventFormIfOpen()
      return { ok: Boolean(findRegisteredTarget(step.targetId)), message: 'The unsaved form is closed and the planning workspace is visible.' }
    }

    if (step.id === 'partners' || step.id === 'commitments') {
      const details = document.querySelector('[data-tour-container="partners-commitments"]')
      if (details instanceof HTMLDetailsElement) details.open = true
      await animationFrame()
      return { ok: Boolean(findRegisteredTarget(step.targetId)), message: 'The partner commitments section is open.' }
    }

    if (step.id === 'add-registration') {
      const target = findRegisteredTarget(step.targetId)
      target?.click()
      await animationFrame()
      return { ok: true, message: 'The Add Registration form was opened for inspection. Cancel before saving.' }
    }

    if (step.id === 'check-in') {
      const target = findRegisteredTarget(step.targetId)
      target?.focus?.()
      return { ok: Boolean(target), message: 'The Check-In search field is focused. No check-in was recorded.' }
    }

    const target = findRegisteredTarget(step.targetId)
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    return { ok: Boolean(target), message: target ? 'Target verified and brought into view.' : 'This step target is not visible yet.' }
  }

  ensureActive(transitionId, signal) {
    if (signal.aborted || this.current?.transitionId !== transitionId) {
      throw new DOMException('Tutorial transition aborted', 'AbortError')
    }
  }
}

async function openEventFormIfNeeded() {
  if (document.querySelector('[data-tour-id="event-name-field"]')) return
  const createButton = document.querySelector('[data-tour-id="create-event-action"]')
  createButton?.click()
  await waitForDom(() => Boolean(document.querySelector('[data-tour-id="event-name-field"]')), 3000)
}

async function closeEventFormIfOpen() {
  const cancelButton = document.querySelector('[data-tour-id="event-form-cancel"]')
  if (cancelButton) {
    cancelButton.click()
    await waitForDom(() => !document.querySelector('[data-tour-id="event-form-cancel"]'), 3000)
  }
}

function animationFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

function waitForDom(test, timeoutMs) {
  const startedAt = Date.now()
  return new Promise((resolve) => {
    function check() {
      if (test() || Date.now() - startedAt > timeoutMs) {
        resolve()
        return
      }
      requestAnimationFrame(check)
    }
    check()
  })
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
