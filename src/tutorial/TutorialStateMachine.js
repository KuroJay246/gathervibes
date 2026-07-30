export const TUTORIAL_STATES = {
  idle: 'idle',
  opening: 'opening',
  preparingRoute: 'preparing-route',
  navigating: 'navigating',
  waitingForRoute: 'waiting-for-route',
  waitingForData: 'waiting-for-data',
  waitingForTarget: 'waiting-for-target',
  positioning: 'positioning',
  presenting: 'presenting',
  advancing: 'advancing',
  reversing: 'reversing',
  paused: 'paused',
  retryableError: 'retryable-error',
  completing: 'completing',
  completed: 'completed',
  closing: 'closing',
}

export const initialTutorialMachine = {
  status: TUTORIAL_STATES.idle,
  mode: 'idle',
  stepIndex: 0,
  transitionId: null,
  error: null,
  diagnostics: null,
}

export function tutorialReducer(state, event) {
  switch (event.type) {
    case 'OPEN_WELCOME':
      return { ...state, status: TUTORIAL_STATES.opening, mode: 'welcome', error: null, diagnostics: null }
    case 'START_GUIDED':
      return {
        ...state,
        status: TUTORIAL_STATES.preparingRoute,
        mode: 'guided',
        stepIndex: event.stepIndex || 0,
        transitionId: event.transitionId,
        error: null,
        diagnostics: null,
      }
    case 'TRANSITION':
      return {
        ...state,
        status: event.direction === 'back' ? TUTORIAL_STATES.reversing : TUTORIAL_STATES.advancing,
        transitionId: event.transitionId,
        error: null,
        diagnostics: null,
      }
    case 'WAITING_FOR_ROUTE':
      if (event.transitionId !== state.transitionId) return state
      return { ...state, status: TUTORIAL_STATES.waitingForRoute }
    case 'WAITING_FOR_TARGET':
      if (event.transitionId !== state.transitionId) return state
      return { ...state, status: TUTORIAL_STATES.waitingForTarget }
    case 'POSITIONING':
      if (event.transitionId !== state.transitionId) return state
      return { ...state, status: TUTORIAL_STATES.positioning }
    case 'PRESENT':
      if (event.transitionId !== state.transitionId) return state
      return {
        ...state,
        status: TUTORIAL_STATES.presenting,
        stepIndex: event.stepIndex,
        error: null,
        diagnostics: null,
      }
    case 'PAUSE':
      return { ...state, status: TUTORIAL_STATES.paused }
    case 'ERROR':
      if (event.transitionId && event.transitionId !== state.transitionId) return state
      return {
        ...state,
        status: TUTORIAL_STATES.retryableError,
        error: event.error,
        diagnostics: event.diagnostics || null,
      }
    case 'COMPLETING':
      return { ...state, status: TUTORIAL_STATES.completing, error: null }
    case 'COMPLETE':
      return { ...state, status: TUTORIAL_STATES.completed, mode: 'completion', error: null, diagnostics: null }
    case 'CLOSE':
      return { ...state, status: TUTORIAL_STATES.closing, mode: 'idle' }
    case 'RESET':
      return { ...initialTutorialMachine }
    default:
      return state
  }
}

export function isTransitioning(status) {
  return [
    TUTORIAL_STATES.preparingRoute,
    TUTORIAL_STATES.navigating,
    TUTORIAL_STATES.waitingForRoute,
    TUTORIAL_STATES.waitingForData,
    TUTORIAL_STATES.waitingForTarget,
    TUTORIAL_STATES.positioning,
    TUTORIAL_STATES.advancing,
    TUTORIAL_STATES.reversing,
    TUTORIAL_STATES.completing,
  ].includes(status)
}
