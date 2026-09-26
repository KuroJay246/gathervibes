import { useEffect, useRef } from 'react'
import { Redirect } from 'expo-router'

import { Banner, LoadingView, Screen, Section } from '@/components/ui'
import { firebaseRuntimeConfig } from '@/lib/firebase'
import { useAuth } from '@/providers/useAuth'

export default function EmulatorE2EAuthScreen() {
  const { authInitialized, defaultRoute, isAuthorized, signInForE2E } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    if (started.current || !firebaseRuntimeConfig.useEmulators || !firebaseRuntimeConfig.e2eAuthEnabled) return
    started.current = true
    void signInForE2E()
  }, [signInForE2E])

  if (!firebaseRuntimeConfig.useEmulators || !firebaseRuntimeConfig.e2eAuthEnabled) {
    return (
      <Screen>
        <Section eyebrow="Unavailable" title="Test authentication disabled">
          <Banner tone="danger">This route is unavailable outside an explicitly enabled Firebase emulator build.</Banner>
        </Section>
      </Screen>
    )
  }

  if (authInitialized && isAuthorized) return <Redirect href={defaultRoute === '/scanner' ? '/scanner' : '/home'} />
  return <LoadingView label="Establishing emulator test identity…" />
}
