import { TUTORIAL_VERSION } from './tutorialSteps.js'

export function createTutorialDiagnostics({ step, transitionId, startedAt, activeEventName, reason }) {
  const viewport = typeof window === 'undefined'
    ? { width: 0, height: 0, scale: 1 }
    : {
        width: window.visualViewport?.width || window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight,
        scale: window.visualViewport?.scale || 1,
      }

  return {
    tutorialVersion: TUTORIAL_VERSION,
    stepId: step?.id || 'unknown',
    expectedPath: step?.pathname || null,
    actualPath: typeof window === 'undefined' ? null : window.location.pathname,
    expectedTarget: step?.targetId || null,
    transitionId,
    elapsedMs: startedAt ? Date.now() - startedAt : 0,
    currentWorkingEvent: activeEventName || 'not selected',
    viewport,
    reason,
  }
}
