import { Redirect, useRouter } from 'expo-router'
import { Text } from 'react-native'
import { useNetworkState } from 'expo-network'

import { Banner, Card, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

export default function SettingsScreen() {
  const router = useRouter()
  const networkState = useNetworkState()
  const { access, authInitialized, currentRoleLabel, isAuthorized, signOut, user } = useAuth()
  const { activeEvent, clearActiveEvent, ready } = useActiveEvent()

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Settings"
        title="Settings and Sign Out"
        description="This screen is deliberately narrow. It does not edit workspace access, does not connect Gmail or Outlook, and does not queue offline check-ins."
      >
        <Card>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>{user?.email || 'Signed-in account'}</Text>
          <Text style={{ color: '#5c554f' }}>{currentRoleLabel}</Text>
          <Text style={{ color: '#5c554f' }}>{activeEvent.eventName || activeEvent.eventId}</Text>
          <Text style={{ color: '#5c554f' }}>{networkState.isInternetReachable ?? networkState.isConnected ? 'Online' : 'Offline'}</Text>
        </Card>

        <Banner tone="info">
          Firebase Auth persistence is native on iOS and Android in this stack. The selected event snapshot is stored with expo-secure-store, not plain AsyncStorage.
        </Banner>

        <Banner tone="warning">
          Google mobile sign-in, provider mailbox connections, Apple signing, and physical iPhone validation remain separate follow-up work.
        </Banner>

        <PrimaryButton label="Choose Another Assigned Event" onPress={async () => {
          await clearActiveEvent()
          router.replace('/events')
        }} />
        <SecondaryButton label="Sign Out" onPress={() => void signOut()} />
        {access?.protectedOwner ? <SecondaryButton label="Return to Event-Day Home" onPress={() => router.replace('/home')} /> : null}
      </Section>
    </Screen>
  )
}
