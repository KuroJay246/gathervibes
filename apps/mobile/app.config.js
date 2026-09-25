const baseConfig = require('./app.json')

const useFirebaseEmulators = process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true'
const firebaseAuthEmulatorHost = process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '10.0.2.2:9099'
const firestoreEmulatorHost = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_HOST || '10.0.2.2:8080'

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    android: { ...baseConfig.expo.android },
    extra: {
      ...(baseConfig.expo.extra || {}),
      gsvFirebase: {
        useEmulators: useFirebaseEmulators,
        authEmulatorHost: firebaseAuthEmulatorHost,
        firestoreEmulatorHost: firestoreEmulatorHost,
      },
    },
    plugins: [
      ...baseConfig.expo.plugins,
      ...(useFirebaseEmulators ? ['./plugins/withEmulatorCleartext'] : []),
    ],
  },
}
