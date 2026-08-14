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
      title: 'Gather & Savor Hub cannot reach the internet.',
      body: 'Your browser appears offline or the connection is unstable. Check the connection, then try again.',
    },
    'stale-deployment': {
      title: 'Gather & Savor Hub needs the latest deployed files.',
      body: 'The browser may be holding an older page that references a JavaScript file replaced during deployment. Reloading the latest version usually fixes this.',
    },
    'module-load': {
      title: 'A required application file did not load.',
      body: 'One of the JavaScript files needed by this page was not available. This can happen during a deployment or a temporary network interruption.',
    },
    firebase: {
      title: 'Firebase is not available right now.',
      body: 'The app could not reach its Firebase services. Try again, and check the connection if it continues.',
    },
    'permission-denied': {
      title: 'This account does not have permission for that action.',
      body: 'Your sign-in worked, but Firestore rejected the requested access. Sign in with an approved organizer account or ask the protected owner to review access.',
    },
    'auth-session': {
      title: 'Your sign-in session needs attention.',
      body: 'The current browser session may have expired or become invalid. Sign in again to refresh access.',
    },
    'server-hosting': {
      title: 'Gather & Savor Hub hosting did not respond correctly.',
      body: 'The hosted app or one of its server responses failed. Try again after a moment.',
    },
    unknown: {
      title: 'Something went wrong loading Gather & Savor Hub.',
      body: 'Try again first. If this account still gets stuck, reload the latest version, then sign in again if needed.',
    },
  }
  return content[category] || content.unknown
}
