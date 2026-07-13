import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  getRequestedReturnPath,
  isPopupCancelledError,
  sanitizeReturnPath,
  shouldFallbackToRedirectSignIn,
  shouldPreferRedirectGoogleSignIn,
} from '../src/auth/authFlow.js'

test('auth reliability keeps localhost desktop on popup-first Google sign-in', () => {
  assert.equal(shouldPreferRedirectGoogleSignIn({
    hostname: 'localhost',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/149.0.0.0 Safari/537.36',
  }), false)
})

test('auth reliability keeps mobile and embedded fallback on redirect', () => {
  assert.equal(shouldPreferRedirectGoogleSignIn({
    hostname: 'gathervibeshub.web.app',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  }), true)

  assert.equal(shouldPreferRedirectGoogleSignIn({
    hostname: 'gathervibeshub.web.app',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/149.0.0.0 Mobile Safari/537.36 Instagram 350.1.0.0.0',
  }), true)
})

test('auth reliability return path rules reject login, external, and stale scanner loops', () => {
  assert.equal(sanitizeReturnPath('/dashboard'), '/dashboard')
  assert.equal(sanitizeReturnPath('/login'), '/dashboard')
  assert.equal(sanitizeReturnPath('https://example.com/evil'), '/dashboard')
  assert.equal(sanitizeReturnPath('//example.com/evil'), '/dashboard')
  assert.equal(sanitizeReturnPath('/scanner'), '/dashboard')
  assert.equal(sanitizeReturnPath('/scanner', { defaultRoute: '/scanner', allowScanner: true }), '/scanner')
})

test('auth reliability derives intended route from protected-route state safely', () => {
  assert.equal(getRequestedReturnPath({ from: { pathname: '/event-review', search: '?tab=ops', hash: '#summary' } }), '/event-review?tab=ops#summary')
  assert.equal(getRequestedReturnPath({ from: { pathname: '/login' } }), '/dashboard')
  assert.equal(getRequestedReturnPath({ from: { pathname: '/scanner' } }), '/dashboard')
})

test('auth reliability popup fallback and cancellation logic stay deterministic', () => {
  assert.equal(shouldFallbackToRedirectSignIn('auth/popup-blocked'), true)
  assert.equal(shouldFallbackToRedirectSignIn('auth/web-storage-unsupported'), true)
  assert.equal(shouldFallbackToRedirectSignIn('auth/popup-closed-by-user'), false)
  assert.equal(isPopupCancelledError('auth/popup-closed-by-user'), true)
  assert.equal(isPopupCancelledError('auth/cancelled-popup-request'), true)
  assert.equal(isPopupCancelledError('auth/popup-blocked'), false)
})

test('auth reliability provider initializes persistence, popup sign-in, and unauthorized-state handling', async () => {
  const authProvider = await readFile('src/auth/AuthProvider.jsx', 'utf8')
  const protectedRoute = await readFile('src/auth/ProtectedRoute.jsx', 'utf8')
  const loginPage = await readFile('src/pages/LoginPage.jsx', 'utf8')

  assert.match(authProvider, /setPersistence\(auth, browserLocalPersistence\)/)
  assert.match(authProvider, /signInWithPopup/)
  assert.match(authProvider, /signInWithRedirect/)
  assert.match(authProvider, /auth\.authStateReady/)
  assert.match(authProvider, /handOffAuthorizedLoginRoute/)
  assert.match(authProvider, /window\.location\.replace\(targetRoute\)/)
  assert.match(authProvider, /setIsAuthorized\(false\)/)
  assert.match(authProvider, /setUser\(nextUser\)/)
  assert.doesNotMatch(authProvider, /await firebaseSignOut\(auth\)[\s\S]*auth\/access-check-failed/)
  assert.match(protectedRoute, /if \(!isAuthorized\)/)
  assert.match(loginPage, /Retry access check/)
  assert.match(loginPage, /clearGoogleSignInState\(\)/)
  assert.match(loginPage, /Google sign-in succeeded, but this workspace could not complete admin or staff access verification/)
})
