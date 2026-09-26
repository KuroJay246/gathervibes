import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { AppIcon, Card, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
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
      <Section eyebrow="Settings" title="Your workspace" description="Manage your account, selected event, and app access from one place.">
        <Text style={{ ...typography.caption, color: colors.textSubtle }}>ACCOUNT</Text>
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

        <Text style={{ ...typography.caption, color: colors.textSubtle }}>EVENT</Text>
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppIcon name="calendar-outline" size={22} color={colors.primary} accessibilityLabel="Selected event" />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...typography.label, color: colors.text }}>Selected event</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{activeEvent.eventName || 'Assigned event'}</Text>
            </View>
          </View>
        </Card>

        <Text style={{ ...typography.caption, color: colors.textSubtle }}>APPLICATION</Text>
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <AppIcon name="shield-checkmark-outline" size={22} color={colors.primary} accessibilityLabel="Private workspace" />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...typography.label, color: colors.text }}>Private staff workspace</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>Access is limited to approved team members and assigned event capabilities.</Text>
            </View>
          </View>
        </Card>

        <Text style={{ ...typography.caption, color: colors.textSubtle }}>SECURITY & ABOUT</Text>
        <Card tone="muted">
          <Text style={{ ...typography.body, color: colors.textMuted }}>Gather & Savor keeps check-in actions online-confirmed and protects event data with your assigned access.</Text>
        </Card>

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
