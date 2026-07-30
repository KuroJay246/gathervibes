import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { findRegisteredTarget, selectorForTutorialTarget } from './tutorialRegistry.js'
import { TutorialSpotlight } from './TutorialSpotlight.jsx'
import { TutorialTooltip } from './TutorialTooltip.jsx'

const SAFE_MARGIN = 12
const SPOTLIGHT_PADDING = 8
const TOOLTIP_WIDTH = 390
const TOOLTIP_HEIGHT = 430
const TOOLTIP_GAP = 16

export function TutorialOverlay(props) {
  const { step, machine, stepIndex, total } = props
  const [targetRect, setTargetRect] = useState(null)
  const [placement, setPlacement] = useState('bottom')
  const headingRef = useRef(null)

  const targetSelector = useMemo(() => selectorForTutorialTarget(step.targetId), [step.targetId])

  useLayoutEffect(() => {
    let rafId = null
    let resizeObserver = null
    let intersectionObserver = null
    const viewport = window.visualViewport

    function measure() {
      const target = findRegisteredTarget(step.targetId)
      if (!target) {
        setTargetRect(null)
        return
      }
      const raw = target.getBoundingClientRect()
      const visualWidth = viewport?.width || window.innerWidth
      const visualHeight = viewport?.height || window.innerHeight
      const rect = {
        left: clamp(raw.left - SPOTLIGHT_PADDING, SAFE_MARGIN, visualWidth - SAFE_MARGIN),
        top: clamp(raw.top - SPOTLIGHT_PADDING, SAFE_MARGIN, visualHeight - SAFE_MARGIN),
        width: clamp(raw.width + SPOTLIGHT_PADDING * 2, 48, visualWidth - SAFE_MARGIN * 2),
        height: clamp(raw.height + SPOTLIGHT_PADDING * 2, 40, visualHeight - SAFE_MARGIN * 2),
      }
      setTargetRect(rect)
      setPlacement(calculatePlacement(rect, visualWidth, visualHeight))
    }

    function scheduleMeasure() {
      if (rafId != null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(measure)
    }

    const target = findRegisteredTarget(step.targetId)
    target?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
    scheduleMeasure()

    if (target) {
      resizeObserver = new ResizeObserver(scheduleMeasure)
      resizeObserver.observe(target)
      intersectionObserver = new IntersectionObserver(scheduleMeasure, { threshold: [0, 0.25, 0.5, 1] })
      intersectionObserver.observe(target)
    }

    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('scroll', scheduleMeasure, true)
    viewport?.addEventListener('resize', scheduleMeasure)
    viewport?.addEventListener('scroll', scheduleMeasure)

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure, true)
      viewport?.removeEventListener('resize', scheduleMeasure)
      viewport?.removeEventListener('scroll', scheduleMeasure)
    }
  }, [step.targetId, targetSelector])

  useEffect(() => {
    headingRef.current?.focus()
  }, [step.id])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') props.onClose()
      if (event.key === 'ArrowRight') props.onNext()
      if (event.key === 'ArrowLeft') props.onBack()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props])

  return createPortal(
    <div className="fixed inset-0 z-[120] pointer-events-none" aria-hidden="false">
      <div className="absolute inset-0" aria-hidden="true" />
      <TutorialSpotlight rect={targetRect} />
      <TutorialTooltip
        {...props}
        headingRef={headingRef}
        placement={placement}
        style={tooltipStyle(targetRect, placement)}
        machine={machine}
        stepIndex={stepIndex}
        total={total}
      />
    </div>,
    document.body
  )
}

function calculatePlacement(rect, viewportWidth, viewportHeight) {
  const canRight = rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_WIDTH < viewportWidth - SAFE_MARGIN
  const canLeft = rect.left - TOOLTIP_GAP - TOOLTIP_WIDTH > SAFE_MARGIN
  const canBelow = rect.top + rect.height + TOOLTIP_GAP + TOOLTIP_HEIGHT < viewportHeight - SAFE_MARGIN
  const canAbove = rect.top - TOOLTIP_GAP - TOOLTIP_HEIGHT > SAFE_MARGIN
  if (canRight) return 'right'
  if (canLeft) return 'left'
  if (canBelow) return 'bottom'
  if (canAbove) return 'top'
  return 'center'
}

function tooltipStyle(rect, placement) {
  const viewportWidth = window.visualViewport?.width || window.innerWidth
  const viewportHeight = window.visualViewport?.height || window.innerHeight
  const width = Math.min(TOOLTIP_WIDTH, viewportWidth - SAFE_MARGIN * 2)
  const height = Math.min(TOOLTIP_HEIGHT, viewportHeight - SAFE_MARGIN * 2)
  const maxTop = Math.max(SAFE_MARGIN, viewportHeight - height - SAFE_MARGIN)
  const base = {
    width,
    maxHeight: height,
    overflowY: 'auto',
  }
  const center = {
    left: '50%',
    top: '50%',
    ...base,
    transform: 'translate(-50%, -50%)',
  }
  if (!rect || placement === 'center') return center
  if (placement === 'right') {
    return { left: clamp(rect.left + rect.width + TOOLTIP_GAP, SAFE_MARGIN, viewportWidth - width - SAFE_MARGIN), top: clamp(rect.top, SAFE_MARGIN, maxTop), ...base }
  }
  if (placement === 'left') {
    return { left: clamp(rect.left - width - TOOLTIP_GAP, SAFE_MARGIN, viewportWidth - width - SAFE_MARGIN), top: clamp(rect.top, SAFE_MARGIN, maxTop), ...base }
  }
  if (placement === 'top') {
    return { left: clamp(rect.left, SAFE_MARGIN, viewportWidth - width - SAFE_MARGIN), top: clamp(rect.top - height - TOOLTIP_GAP, SAFE_MARGIN, maxTop), ...base }
  }
  return { left: clamp(rect.left, SAFE_MARGIN, viewportWidth - width - SAFE_MARGIN), top: clamp(rect.top + rect.height + TOOLTIP_GAP, SAFE_MARGIN, maxTop), ...base }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
