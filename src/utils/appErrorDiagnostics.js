export const CACHE_BUST_RELOAD_KEY = 'gsv:last-cache-bust-reload'
export const CACHE_BUST_RELOAD_WINDOW_MS = 30000

export function categorizeAppError(error, online = typeof navigator !== 'undefined' ? navigator.onLine : true) {
  const message = `${error?.name || ''} ${error?.message || ''}`.toLowerCase()
  const code = String(error?.code || '').toLowerCase()

  if (online === false) return 'connection'
  if (message.includes('failed to fetch dynamically imported module') || message.includes('importing a module script failed') || message.includes('loading chunk') || message.includes('chunkloaderror')) return 'stale-deployment'
  if (message.includes('dynamically imported module') || message.includes('module script')) return 'module-load'
  if (code.includes('permission-denied') || message.includes('permission_denied') || message.includes('permission denied') || message.includes('insufficient permissions')) return 'permission-denied'
  if (code.includes('auth/') || message.includes('auth/') || message.includes('invalid sign-in') || message.includes('expired') || message.includes('unauthorized')) return 'auth-session'
  if (code.includes('firestore/') || message.includes('firestore') || message.includes('firebase')) return 'firebase'
  if (message.includes('500') || message.includes('503') || message.includes('server') || message.includes('hosting')) return 'server-hosting'
  return 'unknown'
}

export function appErrorContentForCategory(category) {
  const content = {
    connection: {
      title: 'No internet connection',
      body: 'Gather & Savor cannot load right now. Check your connection and try again.',
      supportExplanation: 'The app could not reach the internet from this browser. Your event data is normally safe; reconnect and try again.',
      actions: ['try-again', 'check-connection'],
    },
    'stale-deployment': {
      title: 'The app was updated',
      body: 'Your browser is still using an older version. Reload the latest version to continue.',
      supportExplanation: 'The website was updated, but this browser tried to load a file from the older version. Reloading the latest version should correct it. This does not normally mean event data was lost.',
      actions: ['reload-latest', 'try-again'],
    },
    'module-load': {
      title: 'The app was updated',
      body: 'Your browser is still using an older version. Reload the latest version to continue.',
      supportExplanation: 'A page file did not load. This is most often caused by a recent app update or a short connection interruption. Reloading the latest version should correct it, and event data is normally safe.',
      actions: ['reload-latest', 'try-again'],
    },
    firebase: {
      title: 'Gather & Savor is temporarily unavailable',
      body: 'The app could not connect to its data service. Wait a moment and try again.',
      supportExplanation: 'Gather & Savor could not reach the data service. This usually means the service or connection is temporarily unavailable. Try again shortly; saved event data is normally safe.',
      actions: ['try-again'],
    },
    'permission-denied': {
      title: 'You do not have access to this page',
      body: 'This account may not have permission to use this feature. Check Settings or contact the Protected Owner.',
      supportExplanation: 'The app loaded, but this account was not allowed to open the page or complete the action. Ask the Protected Owner to review access if this seems wrong. No event data was changed by this error.',
      actions: ['dashboard'],
    },
    'auth-session': {
      title: 'Please sign in again',
      body: 'Your sign-in session has expired or could not be verified.',
      supportExplanation: 'The browser could not verify the current sign-in session. Sign in again and retry the action. This does not normally mean event data was lost.',
      actions: ['sign-in', 'try-again'],
    },
    'server-hosting': {
      title: 'Gather & Savor is temporarily unavailable',
      body: 'The app could not connect to its data service. Wait a moment and try again.',
      supportExplanation: 'The hosted app or a supporting service did not respond correctly. Try again after a moment. Saved event data is normally safe.',
      actions: ['try-again'],
    },
    unknown: {
      title: 'Something went wrong',
      body: 'Gather & Savor could not complete this request. Try again, and open support details if the problem continues.',
      supportExplanation: 'The app hit an unexpected problem. Try again first. If it keeps happening, copy the support details so the issue can be investigated. Saved event data is normally safe unless the failed action said otherwise.',
      actions: ['try-again', 'dashboard'],
    },
  }
  return content[category] || content.unknown
}

export function failedFileFromError(error = {}) {
  const message = String(error?.message || '')
  const match = message.match(/https?:\/\/[^\s)'"]+|\/assets\/[^\s)'"]+/)
  return match?.[0] || 'not detected'
}
