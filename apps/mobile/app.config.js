const googleServices = require('./google-services.json')

const useFirebaseEmulators = process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true'
const firebaseAuthEmulatorHost = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '10.0.2.2:9099'
const firestoreEmulatorHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || '10.0.2.2:8080'
const e2eAuthEnabled = useFirebaseEmulators && process.env.GSV_MOBILE_E2E_AUTH === 'true'
const googleWebClientId = googleServices.client
  ?.flatMap((entry) => entry.oauth_client || [])
  .find((client) => client.client_type === 3)
  ?.client_id || ''

module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android },
  extra: {
    ...(config.extra || {}),
    gsvFirebase: {
      useEmulators: useFirebaseEmulators,
      authEmulatorHost: firebaseAuthEmulatorHost,
      firestoreEmulatorHost: firestoreEmulatorHost,
      e2eAuthEnabled,
      e2eEmail: e2eAuthEnabled ? process.env.GSV_MOBILE_E2E_EMAIL || 'mobilee2e@gsv.test' : '',
      e2ePassword: e2eAuthEnabled ? process.env.GSV_MOBILE_E2E_PASSWORD || 'MobileE2E123' : '',
    },
    googleWebClientId,
  },
  plugins: [
    ...config.plugins,
    ...(useFirebaseEmulators ? ['./plugins/withEmulatorCleartext'] : []),
  ],
})
