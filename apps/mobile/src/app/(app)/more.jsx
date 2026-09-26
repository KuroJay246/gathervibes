import { Redirect, useRouter } from 'expo-router'
import { Text } from 'react-native'

import { SecondaryButton, Screen, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

export default function MoreScreen() {
  const router = useRouter()
  const { isAuthorized, access } = useAuth()
  const { activeEvent, ready } = useActiveEvent()

  if (!ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  if (access?.role === 'scanner' && !access?.protectedOwner && !access?.isAdmin) return <Redirect href="/scanner" />

  return (
    <Screen scroll>
      <Section eyebrow="Workspace" title="More" description="Planning and administration for the selected event.">
        <Text accessibilityRole="header">{activeEvent.eventName || 'Working event'}</Text>
        <SecondaryButton label="Run of Show" onPress={() => router.push('/run-of-show')} />
        <SecondaryButton label="Operations" onPress={() => router.push('/operations')} />
        <SecondaryButton label="Event Contacts" onPress={() => router.push('/contacts')} />
        <SecondaryButton label="Limited Reports" onPress={() => router.push('/reports')} />
        <SecondaryButton label="Settings" onPress={() => router.push('/settings')} />
        <SecondaryButton label="Operational Notes" onPress={() => router.push('/notes')} />
      </Section>
    </Screen>
  )
}
