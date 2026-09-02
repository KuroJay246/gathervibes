import { getApp, getApps, initializeApp } from 'firebase/app'
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

function resolveAuthDomain() {
  const configuredDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  if (typeof window === 'undefined') return configuredDomain

  const currentHost = window.location.hostname
  if (currentHost.endsWith('.web.app') || currentHost.endsWith('.firebaseapp.com')) {
    return currentHost
  }

  return configuredDomain
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseProjectId = firebaseConfig.projectId || ''

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId']

export const isFirebaseConfigured = requiredConfigKeys.every(
  (key) => typeof firebaseConfig[key] === 'string' && firebaseConfig[key].trim().length > 0,
)

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null

export const auth = app ? getAuth(app) : null

const useFirebaseEmulators = import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true'
const appCheckSiteKey = String(import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY || '').trim()
const appCheckDebugToken = String(import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN || '').trim()

const runtimeSecurityState = {
  appCheck: {
    mode: useFirebaseEmulators ? 'emulator-disabled' : import.meta.env.MODE === 'test' ? 'test-disabled' : 'not-configured',
    provider: 'none',
    siteKeyConfigured: Boolean(appCheckSiteKey),
    initialized: false,
    debugTokenConfigured: Boolean(appCheckDebugToken),
    error: '',
  },
}

function publishRuntimeSecurityState() {
  if (typeof window !== 'undefined') {
    window.__GSV_RUNTIME_SECURITY__ = {
      ...runtimeSecurityState,
      appCheck: { ...runtimeSecurityState.appCheck },
    }
  }
  return runtimeSecurityState
}

function setAppCheckState(nextState) {
  runtimeSecurityState.appCheck = {
    ...runtimeSecurityState.appCheck,
    ...nextState,
  }
  publishRuntimeSecurityState()
}

export function readRuntimeSecurityState() {
  return publishRuntimeSecurityState()
}

export const db = app ? (
  useFirebaseEmulators
    ? initializeFirestore(app, { experimentalForceLongPolling: true })
    : typeof window !== 'undefined' && import.meta.env.MODE !== 'test' && !window.__FIRESTORE_TEST_ENV__
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      })
    : getFirestore(app)
) : null

if (useFirebaseEmulators && typeof window !== 'undefined') {
  window.__GSV_FIREBASE_EMULATORS__ ||= {}

  if (auth && !window.__GSV_FIREBASE_EMULATORS__.auth) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    window.__GSV_FIREBASE_EMULATORS__.auth = true
  }

  if (db && !window.__GSV_FIREBASE_EMULATORS__.firestore) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    window.__GSV_FIREBASE_EMULATORS__.firestore = true
  }
}

if (typeof window !== 'undefined') {
  publishRuntimeSecurityState()
}

if (app && typeof window !== 'undefined') {
  if (useFirebaseEmulators) {
    setAppCheckState({
      mode: 'emulator-disabled',
      provider: 'none',
      initialized: false,
      error: '',
    })
  } else if (import.meta.env.MODE === 'test') {
    setAppCheckState({
      mode: 'test-disabled',
      provider: 'none',
      initialized: false,
      error: '',
    })
  } else if (!appCheckSiteKey) {
    setAppCheckState({
      mode: 'not-configured',
      provider: 'none',
      initialized: false,
      error: '',
    })
  } else {
    try {
      if (appCheckDebugToken) {
        window.FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken
      }

      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      })

      setAppCheckState({
        mode: 'recaptcha-enterprise',
        provider: 'recaptcha-enterprise',
        initialized: true,
        error: '',
      })
    } catch (error) {
      setAppCheckState({
        mode: 'initialization-failed',
        provider: 'recaptcha-enterprise',
        initialized: false,
        error: error instanceof Error ? error.message : 'App Check initialization failed.',
      })
    }
  }
}
