const baseConfig = require('./app.json')

const useFirebaseEmulators = process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS === 'true'

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    android: { ...baseConfig.expo.android },
    plugins: [
      ...baseConfig.expo.plugins,
      ...(useFirebaseEmulators ? ['./plugins/withEmulatorCleartext'] : []),
    ],
  },
}
