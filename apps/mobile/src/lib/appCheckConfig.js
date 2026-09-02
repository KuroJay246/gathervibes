const DEBUG_TOKEN_ENV = 'EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN'

export function getNativeAppCheckProviderOptions({
  platform,
  isDev,
  useEmulators,
  debugToken,
}) {
  const useDebugProvider = Boolean(isDev || useEmulators)
  const configuredDebugToken = String(debugToken || '').trim()
  const debugOptions = useDebugProvider && configuredDebugToken
    ? { debugToken: configuredDebugToken }
    : {}

  if (platform === 'android') {
    return {
      android: {
        provider: useDebugProvider ? 'debug' : 'playIntegrity',
        ...debugOptions,
      },
    }
  }

  if (platform === 'ios') {
    return {
      apple: {
        provider: useDebugProvider ? 'debug' : 'appAttestWithDeviceCheckFallback',
        ...debugOptions,
      },
    }
  }

  return null
}

export { DEBUG_TOKEN_ENV }
