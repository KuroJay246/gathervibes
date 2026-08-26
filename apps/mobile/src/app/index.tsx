// @ts-nocheck
import { Redirect } from 'expo-router'

import { LoadingView } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

export default function IndexRoute() {
  const { authInitialized, isAuthorized, loading } = useAuth()
  const { activeEvent, ready } = useActiveEvent()

  if (!authInitialized || loading || !ready) {
    return <LoadingView label="Preparing mobile workspace…" />
  }

  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  return <Redirect href="/home" />
}
