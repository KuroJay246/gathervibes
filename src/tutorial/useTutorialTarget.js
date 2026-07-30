import { useMemo } from 'react'
import { selectorForTutorialTarget } from './tutorialRegistry.js'

export function useTutorialTarget(targetId) {
  return useMemo(() => ({
    'data-tour-id': targetId,
    selector: selectorForTutorialTarget(targetId),
  }), [targetId])
}
