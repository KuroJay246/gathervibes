/* global process */
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getApp } from '@react-native-firebase/app'
import { initializeAppCheck } from '@react-native-firebase/app-check'
import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth'
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore'

import { DEBUG_TOKEN_ENV, getNativeAppCheckProviderOptions } from './appCheckConfig'

export const firebaseApp = getApp()
export const firebaseRuntimeConfig = Constants.expoConfig?.extra?.gsvFirebase || {}
export const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || ''
const useFirebaseEmulators = firebaseRuntimeConfig.useEmulators === true || process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true'
const appCheckProviderOptions = getNativeAppCheckProviderOptions({
  platform: Platform.OS,
  isDev: globalThis.__DEV__ === true,
  useEmulators: useFirebaseEmulators,
  debugToken: process.env[DEBUG_TOKEN_ENV],
})

export const appCheck = appCheckProviderOptions
  ? initializeAppCheck(firebaseApp, {
      provider: { providerOptions: appCheckProviderOptions },
      isTokenAutoRefreshEnabled: true,
    })
  : null

export const auth = getAuth(firebaseApp)
export const firestore = getFirestore(firebaseApp)

function defaultEmulatorHost(port) {
  return `${Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1'}:${port}`
}

function parseEmulatorHost(rawValue, fallbackPort) {
  const normalized = String(rawValue || defaultEmulatorHost(fallbackPort)).trim()
  const [host, portValue] = normalized.split(':')
  const port = Number(portValue)
  if (!host || !Number.isFinite(port)) {
    throw new Error(`Invalid emulator host "${normalized}". Expected host:port.`)
  }
  return { host, port }
}

if (useFirebaseEmulators) {
  globalThis.__GSV_MOBILE_FIREBASE_EMULATORS__ ||= {}

  const authTarget = parseEmulatorHost(firebaseRuntimeConfig.authEmulatorHost || process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, 9099)
  const firestoreTarget = parseEmulatorHost(firebaseRuntimeConfig.firestoreEmulatorHost || process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST, 8080)

  if (!globalThis.__GSV_MOBILE_FIREBASE_EMULATORS__.auth) {
    connectAuthEmulator(auth, `http://${authTarget.host}:${authTarget.port}`, { disableWarnings: true })
    globalThis.__GSV_MOBILE_FIREBASE_EMULATORS__.auth = true
  }

  if (!globalThis.__GSV_MOBILE_FIREBASE_EMULATORS__.firestore) {
    connectFirestoreEmulator(firestore, firestoreTarget.host, firestoreTarget.port)
    globalThis.__GSV_MOBILE_FIREBASE_EMULATORS__.firestore = true
  }
}
