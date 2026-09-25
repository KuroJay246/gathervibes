// @ts-nocheck
import { Redirect } from 'expo-router'

import { LoadingView } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { mobileLandingRouteForAccess } from '@gsv/contracts/accessRoles'

export default function IndexRoute() {
  const { authInitialized, isAuthorized, loading, access } = useAuth()
  const { activeEvent, ready } = useActiveEvent()

  if (!authInitialized || loading || !ready) {
    return <LoadingView label="Preparing mobile workspace…" />
  }

  if (!isAuthorized) return <Redirect href="/sign-in" />
  return <Redirect href={mobileLandingRouteForAccess(access, Boolean(activeEvent?.eventId))} />
}
