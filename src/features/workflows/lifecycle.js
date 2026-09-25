export const IMPORT_LIFECYCLE = Object.freeze(['idle', 'fileSelected', 'parsing', 'validating', 'mapping', 'previewReady', 'commitPending', 'committing', 'partialFailure', 'failed', 'complete', 'cancelled'])
export const CHECKIN_LIFECYCLE = Object.freeze(['idle', 'permissionRequired', 'cameraUnavailable', 'ready', 'scanning', 'validating', 'checkInPending', 'success', 'duplicate', 'invalid', 'offline', 'failed', 'retrying'])
export const PROVIDER_LIFECYCLE = Object.freeze(['notConfigured', 'authorizationRequired', 'connecting', 'connected', 'refreshing', 'expired', 'failed', 'reconnectRequired'])

export function createLifecycleSnapshot(state = 'idle', details = {}) {
  return Object.freeze({ state, updatedAt: new Date().toISOString(), ...details })
}

export function isLifecycleState(states, state) {
  return Array.isArray(states) && states.includes(state)
}
