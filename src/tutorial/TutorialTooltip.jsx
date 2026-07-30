import { X } from 'lucide-react'
import { TutorialArrow } from './TutorialArrow.jsx'
import { TutorialProgress } from './TutorialProgress.jsx'
import { isTransitioning, TUTORIAL_STATES } from './TutorialStateMachine.js'

export function TutorialTooltip({
  step,
  stepIndex,
  total,
  placement,
  style,
  machine,
  onNext,
  onBack,
  onSkip,
  onClose,
  onRetry,
  onSkipStep,
  onFinish,
  headingRef,
}) {
  const busy = isTransitioning(machine.status)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === total - 1
  const hasError = machine.status === TUTORIAL_STATES.retryableError

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
      className="pointer-events-auto absolute max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl border border-[#E7D6CC] bg-white shadow-2xl"
      style={style}
    >
      <TutorialArrow placement={placement} />
      <div className="flex items-start justify-between gap-4 border-b border-[#EEDDD3] px-5 py-4">
        <div className="min-w-0 flex-1">
          <TutorialProgress current={stepIndex + 1} total={total} />
          <h2 id="tutorial-step-title" ref={headingRef} tabIndex={-1} className="mt-3 font-serif text-xl text-[#2B1723] focus:outline-none">
            {step.title}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-[#5F493F] hover:bg-[#FFF8F2] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]" aria-label="Close tour">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 px-5 py-5 text-sm leading-6 text-[#5F493F]">
        <div className="inline-flex rounded-full bg-[#F7DDE6] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A3F4B]">
          {step.area}
        </div>
        <p>{step.content}</p>
        <div className="space-y-3 rounded-2xl border border-[#EFE2DA] bg-[#FFF8F2] p-4">
          <p><strong className="text-[#2B1723]">When to use it:</strong> {step.when}</p>
          <p><strong className="text-[#2B1723]">Normal action:</strong> {step.action}</p>
          <p><strong className="text-[#2B1723]">Example:</strong> {step.example}</p>
          <p><strong className="text-[#2B1723]">How it connects:</strong> {step.affects}</p>
        </div>

        {busy && (
          <p className="rounded-xl border border-[#E7D6CC] bg-[#FFF8F2] p-3 text-sm font-semibold text-[#8A3F4B]" aria-live="polite">
            Preparing this tutorial step...
          </p>
        )}

        {hasError && (
          <div role="alert" className="rounded-xl border border-[#F2C98C] bg-[#FFF8EA] p-3 text-sm leading-6 text-[#7A5818]">
            <p>{machine.error}</p>
            {machine.diagnostics && (
              <p className="mt-2 text-xs">Step: {machine.diagnostics.stepId}. Expected target: {machine.diagnostics.expectedTarget}.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={onRetry} className="rounded-lg bg-[#7A5818] px-3 py-2 text-xs font-bold text-white">Retry</button>
              <button type="button" onClick={onSkipStep} className="rounded-lg border border-[#D7B26B] px-3 py-2 text-xs font-bold">Skip This Step</button>
              <button type="button" onClick={onClose} className="rounded-lg border border-[#D7B26B] px-3 py-2 text-xs font-bold">Exit Tour</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#EEDDD3] bg-[#FFF8F2] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onSkip} className="rounded-lg px-2 py-2 text-sm font-semibold text-[#5F493F] hover:text-[#2B1723] focus:outline-none focus:ring-2 focus:ring-[#8A3F4B]">
          Skip
        </button>
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onBack} disabled={isFirst || busy} className="inline-flex min-h-10 items-center rounded-xl border border-[#E7D6CC] bg-white px-3 text-sm font-bold text-[#5F493F] disabled:cursor-not-allowed disabled:opacity-50">
            Back
          </button>
          {isLast ? (
            <button type="button" onClick={onFinish} disabled={busy} className="inline-flex min-h-10 items-center rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white disabled:opacity-60">
              Finish
            </button>
          ) : (
            <button type="button" onClick={onNext} disabled={busy} className="inline-flex min-h-10 items-center rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white disabled:opacity-60">
              Next
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
