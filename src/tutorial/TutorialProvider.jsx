import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import { useActiveEvent } from '../events/useActiveEvent.js'
import { canViewRoute } from '../utils/accessRoles.js'
import { TutorialContext } from './TutorialContext.js'
import { WelcomeCelebration } from './WelcomeCelebration.jsx'
import { TutorialCompletion } from './TutorialCompletion.jsx'
import { TutorialErrorBoundary } from './TutorialErrorBoundary.jsx'
import { TutorialOverlay } from './TutorialOverlay.jsx'
import { TutorialTransitionController } from './TutorialController.js'
import { createTutorialDiagnostics } from './tutorialDiagnostics.js'
import { initialTutorialMachine, tutorialReducer, TUTORIAL_STATES } from './TutorialStateMachine.js'
import { TARGET_UIDS, guidedTutorialSteps, practiceMissions, TUTORIAL_VERSION } from './tutorialSteps.js'
import {
  loadTutorialState,
  markTutorialCompleted,
  markTutorialProgress,
  markTutorialReplay,
  markTutorialSkipped,
  markTutorialStarted,
} from './tutorialStorage.js'

export function TutorialProvider({ children }) {
  const { user, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const navigate = useNavigate()
  const [machine, dispatch] = useReducer(tutorialReducer, initialTutorialMachine)
  const [storedState, setStoredState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completionVisible, setCompletionVisible] = useState(false)
  const [actionFeedback, setActionFeedback] = useState('')
  const controllerRef = useRef(null)
  const navigateRef = useRef(navigate)
  const activeEventNameRef = useRef(null)
  const isTargetUser = Boolean(user?.uid && TARGET_UIDS.includes(user.uid))

  const activeEventName = activeEvent?.eventName || null

  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  useEffect(() => {
    activeEventNameRef.current = activeEventName
  }, [activeEventName])

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!isTargetUser || !user) {
        if (mounted) setLoading(false)
        return
      }
      try {
        const state = await loadTutorialState(user)
        if (!mounted) return
        setStoredState(state)
        const skippedThisSession = sessionStorage.getItem(`tutorial_skipped_${TUTORIAL_VERSION}`)
        if (state?.version !== TUTORIAL_VERSION || (!state?.completed && !skippedThisSession)) {
          dispatch({ type: 'OPEN_WELCOME' })
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[Tutorial] State load failed:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [isTargetUser, user])

  useEffect(() => {
    controllerRef.current = new TutorialTransitionController({
      navigate: (pathname) => navigateRef.current(pathname),
      locationProvider: () => window.location.pathname,
      dispatch,
      activeEventName: () => activeEventNameRef.current,
    })
    return () => controllerRef.current?.cancelCurrent()
  }, [])

  const goToStep = useCallback(async (stepIndex, direction = 'next') => {
    setActionFeedback('')
    const boundedIndex = Math.max(0, Math.min(guidedTutorialSteps.length - 1, stepIndex))
    const step = guidedTutorialSteps[boundedIndex]
    if (!canViewRoute(access, step.pathname)) {
      dispatch({
        type: 'ERROR',
        error: 'Your current role cannot view this tutorial page.',
        diagnostics: createTutorialDiagnostics({ step, transitionId: 'access-denied', activeEventName, reason: 'route access denied' }),
      })
      return
    }
    const result = await controllerRef.current.transitionToStep(step, boundedIndex, direction, createTutorialDiagnostics)
    if (result.ok && user) {
      markTutorialProgress(user, boundedIndex + 1).catch((error) => {
        if (import.meta.env.DEV) console.error('[Tutorial] Progress save failed:', error)
      })
    }
  }, [access, activeEventName, user])

  const showMe = useCallback(async () => {
    const step = guidedTutorialSteps[machine.stepIndex]
    const result = await controllerRef.current?.performStepAction(step, 'show')
    setActionFeedback(result?.message || step?.showMe || 'This step target is ready.')
  }, [machine.stepIndex])

  const letMeTry = useCallback(async () => {
    const step = guidedTutorialSteps[machine.stepIndex]
    const result = await controllerRef.current?.performStepAction(step, 'try')
    setActionFeedback(result?.ok
      ? (step?.letMeTry ? `Verified: ${step.letMeTry}` : 'Verified.')
      : (result?.message || 'Try the action, then select Let Me Try again.'))
  }, [machine.stepIndex])

  const startGuided = useCallback(async () => {
    if (!user) return
    dispatch({ type: 'START_GUIDED', stepIndex: Math.max(0, (storedState?.lastStep || 1) - 1), transitionId: 'start-guided' })
    markTutorialStarted(user, Math.max(1, storedState?.lastStep || 1)).catch((error) => {
      if (import.meta.env.DEV) console.error('[Tutorial] Start save failed:', error)
    })
    await goToStep(Math.max(0, (storedState?.lastStep || 1) - 1), 'next')
  }, [goToStep, storedState?.lastStep, user])

  const skip = useCallback(async () => {
    controllerRef.current?.cancelCurrent()
    const lastStep = machine.stepIndex + 1
    sessionStorage.setItem(`tutorial_skipped_${TUTORIAL_VERSION}`, 'true')
    if (user) await markTutorialSkipped(user, lastStep).catch(() => {})
    dispatch({ type: 'CLOSE' })
    dispatch({ type: 'RESET' })
  }, [machine.stepIndex, user])

  const close = useCallback(async () => {
    await skip()
  }, [skip])

  const complete = useCallback(async () => {
    if (!user) return
    dispatch({ type: 'COMPLETING' })
    try {
      await markTutorialCompleted(user, storedState)
      setStoredState((prev) => ({ ...prev, version: TUTORIAL_VERSION, completed: true, completedAt: prev?.completedAt || new Date(), lastStep: guidedTutorialSteps.length }))
      dispatch({ type: 'COMPLETE' })
      setCompletionVisible(true)
    } catch (error) {
      dispatch({
        type: 'ERROR',
        error: 'Could not save tutorial completion. Check your connection and try again.',
        diagnostics: createTutorialDiagnostics({ step: guidedTutorialSteps[machine.stepIndex], transitionId: machine.transitionId, activeEventName, reason: error.message }),
      })
    }
  }, [activeEventName, machine.stepIndex, machine.transitionId, storedState, user])

  const replay = useCallback(async () => {
    if (user) await markTutorialReplay(user).catch(() => {})
    setStoredState((prev) => ({ ...prev, lastStep: 0 }))
    dispatch({ type: 'OPEN_WELCOME' })
  }, [user])

  useEffect(() => {
    function replayHandler() {
      replay()
    }
    window.addEventListener('replay-onboarding', replayHandler)
    window.addEventListener('replay-tutorial', replayHandler)
    return () => {
      window.removeEventListener('replay-onboarding', replayHandler)
      window.removeEventListener('replay-tutorial', replayHandler)
    }
  }, [replay])

  const contextValue = useMemo(() => ({
    loading,
    machine,
    isTargetUser,
    replay,
    practiceMissions,
    tutorialVersion: TUTORIAL_VERSION,
  }), [isTargetUser, loading, machine, replay])

  const currentStep = guidedTutorialSteps[machine.stepIndex] || guidedTutorialSteps[0]
  const showWelcome = machine.mode === 'welcome' && isTargetUser
  const showGuided = machine.mode === 'guided' && isTargetUser && [TUTORIAL_STATES.presenting, TUTORIAL_STATES.retryableError, TUTORIAL_STATES.advancing, TUTORIAL_STATES.reversing, TUTORIAL_STATES.positioning, TUTORIAL_STATES.waitingForRoute, TUTORIAL_STATES.waitingForTarget].includes(machine.status)

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      {showWelcome && (
        <WelcomeCelebration
          onStart={startGuided}
          onPractice={startGuided}
          onSkip={skip}
          onClose={close}
        />
      )}
      {showGuided && (
        <TutorialErrorBoundary>
          <TutorialOverlay
            step={currentStep}
            stepIndex={machine.stepIndex}
            total={guidedTutorialSteps.length}
            machine={machine}
            onNext={() => goToStep(machine.stepIndex + 1, 'next')}
            onBack={() => goToStep(machine.stepIndex - 1, 'back')}
            onSkip={skip}
            onClose={close}
            onRetry={() => goToStep(machine.stepIndex, 'retry')}
            onSkipStep={() => goToStep(machine.stepIndex + 1, 'next')}
            onFinish={complete}
            onShowMe={showMe}
            onLetMeTry={letMeTry}
            actionFeedback={actionFeedback}
          />
        </TutorialErrorBoundary>
      )}
      {completionVisible && <TutorialCompletion onDismiss={() => setCompletionVisible(false)} />}
    </TutorialContext.Provider>
  )
}
