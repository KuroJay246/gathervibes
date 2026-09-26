export function resolveNativeAuthMode({ useEmulators = false, e2eAuthEnabled = false } = {}) {
  if (useEmulators && e2eAuthEnabled) return 'emulator-e2e'
  return 'google'
}
