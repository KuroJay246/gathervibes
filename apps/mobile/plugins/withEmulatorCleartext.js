const { withAndroidManifest } = require('@expo/config-plugins')

module.exports = function withEmulatorCleartext(config) {
  if (process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATORS !== 'true') return config

  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0]
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true'
      application['meta-data'] ||= []
      application['meta-data'].push({
        $: {
          'android:name': 'firebase_crashlytics_collection_enabled',
          'android:value': 'false',
        },
      })
    }
    return mod
  })
}
