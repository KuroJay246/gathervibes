import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { AppIcon, Banner, Card, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
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
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="person-circle-outline" size={25} color={colors.primary} accessibilityLabel="Signed-in account" /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{user?.email || 'Signed-in account'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{currentRoleLabel}</Text>
              <Text style={{ ...typography.caption, color: colors.textSubtle }}>{activeEvent.eventName || activeEvent.eventId}</Text>
            </View>
            <Pill tone={networkState.isInternetReachable ?? networkState.isConnected ? 'success' : 'warning'}>{networkState.isInternetReachable ?? networkState.isConnected ? 'Online' : 'Offline'}</Pill>
          </View>
        </Card>

        <Banner tone="info">
          Firebase Auth persistence is native on iOS and Android in this stack. The selected event snapshot is stored with expo-secure-store, not plain AsyncStorage.
        </Banner>

        <Banner tone="info">
          Google is the production sign-in method. Workspace access still comes from the immutable Firebase UID, staff profile, enabled status, role capabilities, and Working Event assignment.
        </Banner>

        <PrimaryButton label="Choose Another Assigned Event" onPress={async () => {
          await clearActiveEvent()
          router.replace('/events')
        }} testID="settings-change-event-button" accessibilityLabel="settings-change-event-button" />
        <SecondaryButton label="Sign Out" onPress={() => void signOut()} testID="settings-sign-out-button" accessibilityLabel="settings-sign-out-button" />
        {access?.protectedOwner ? <SecondaryButton label="Return to Event-Day Home" onPress={() => router.replace('/home')} /> : null}
      </Section>
    </Screen>
  )
}
