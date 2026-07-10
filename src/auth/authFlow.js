const DEFAULT_ADMIN_ROUTE = '/dashboard'
const SCANNER_ROUTE = '/scanner'
const REDIRECT_PATH_MAX_AGE_MS = 30 * 60 * 1000

export const GOOGLE_SIGN_IN_REDIRECT_STATE_KEY = 'gsv.googleSignInState'

const REDIRECT_FALLBACK_ERROR_CODES = new Set([
  'auth/popup-blocked',
  'auth/web-storage-unsupported',
])

const POPUP_CANCELLED_ERROR_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
])

function normalizePathString(path) {
  return typeof path === 'string' ? path.trim() : ''
}

export function isInternalReturnPath(path) {
  const value = normalizePathString(path)
  return Boolean(value) && value.startsWith('/') && !value.startsWith('//')
}

export function sanitizeReturnPath(path, { defaultRoute = DEFAULT_ADMIN_ROUTE, allowScanner = false } = {}) {
  const value = normalizePathString(path)
  if (!isInternalReturnPath(value)) return defaultRoute
  if (value === '/login') return defaultRoute
  if (!allowScanner && value.startsWith(SCANNER_ROUTE)) return defaultRoute
  return value
}

export function getRequestedReturnPath(locationState, fallback = DEFAULT_ADMIN_ROUTE, options = {}) {
  const fromState = locationState?.from
  const rawPath = fromState
    ? `${fromState.pathname || ''}${fromState.search || ''}${fromState.hash || ''}`
    : fallback
  return sanitizeReturnPath(rawPath || fallback, options)
}

export function storeGoogleSignInState(path, { strategy = 'redirect' } = {}) {
  if (typeof window === 'undefined') return

  const safePath = sanitizeReturnPath(path)
  const payload = JSON.stringify({
    path: safePath,
    strategy,
    timestamp: Date.now(),
  })

  window.sessionStorage.setItem(GOOGLE_SIGN_IN_REDIRECT_STATE_KEY, payload)
}

export function readGoogleSignInState() {
  if (typeof window === 'undefined') return null

  const rawValue = window.sessionStorage.getItem(GOOGLE_SIGN_IN_REDIRECT_STATE_KEY)
  if (!rawValue) return null

  try {
    const parsed = JSON.parse(rawValue)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.timestamp !== 'number' || (Date.now() - parsed.timestamp) > REDIRECT_PATH_MAX_AGE_MS) {
      return null
    }

    return {
      path: sanitizeReturnPath(parsed.path),
      strategy: typeof parsed.strategy === 'string' ? parsed.strategy : 'redirect',
      timestamp: parsed.timestamp,
    }
  } catch {
    return null
  }
}

export function consumeGoogleSignInState() {
  const state = readGoogleSignInState()
  clearGoogleSignInState()
  return state
}

export function clearGoogleSignInState() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(GOOGLE_SIGN_IN_REDIRECT_STATE_KEY)
}

export function shouldFallbackToRedirectSignIn(errorCode = '') {
  return REDIRECT_FALLBACK_ERROR_CODES.has(errorCode)
}

export function isPopupCancelledError(errorCode = '') {
  return POPUP_CANCELLED_ERROR_CODES.has(errorCode)
}

export function shouldPreferRedirectGoogleSignIn({
  hostname = '',
  userAgent = '',
  standalone = false,
} = {}) {
  const safeHost = normalizePathString(hostname).toLowerCase()
  const safeUa = normalizePathString(userAgent).toLowerCase()

  if (safeHost === 'localhost') return false

  const isEmbedded = /( wv\)|; wv\b|webview|instagram|fbav|fban|line\/|micromessenger|gsa\/|snapchat|pinterest|linkedinapp)/i.test(safeUa)
  if (isEmbedded) return true

  const isMobile = /(iphone|ipad|ipod|android|mobile)/i.test(safeUa)
  if (isMobile || standalone) return true

  return false
}

export function getDefaultRouteForResolvedAccess(access, fallback = DEFAULT_ADMIN_ROUTE) {
  return access?.level === 'staff' && access?.role === 'scanner' ? SCANNER_ROUTE : fallback
}
