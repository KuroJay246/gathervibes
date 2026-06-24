import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
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

export const db = app ? (
  typeof window !== 'undefined' && import.meta.env.MODE !== 'test' && !window.__FIRESTORE_TEST_ENV__
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      })
    : getFirestore(app)
) : null
