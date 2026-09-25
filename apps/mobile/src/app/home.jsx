import { useEffect, useMemo, useState } from 'react'
import { useRouter, Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { AppIcon, Banner, Card, Metric, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToDocuments } from '@/services/documents'
import { subscribeToRegistrations } from '@/services/registrations'
import { subscribeToTasks } from '@/services/tasks'

export default function HomeScreen() {
  const router = useRouter()
  const networkState = useNetworkState()
  const { isAuthorized, authInitialized } = useAuth()
  const { activeEvent, ready, clearActiveEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [tasks, setTasks] = useState([])
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    const unsubscribeRegistrations = subscribeToRegistrations(activeEvent.eventId, setRegistrations, () => {})
    const unsubscribeTasks = subscribeToTasks(activeEvent.eventId, setTasks, () => {})
    const unsubscribeDocuments = subscribeToDocuments(activeEvent.eventId, setDocuments, () => {})
    return () => {
      unsubscribeRegistrations()
      unsubscribeTasks()
      unsubscribeDocuments()
    }
  }, [activeEvent?.eventId])

  const checkedIn = useMemo(() => registrations.filter((registration) => registration.checkedIn).length, [registrations])
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled').length, [tasks])
  const readinessItems = useMemo(() => {
    let count = 0
    if (openTasks > 0) count += 1
    if (documents.length === 0) count += 1
    if (registrations.length === 0) count += 1
    return count
  }, [documents.length, openTasks, registrations.length])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  const online = networkState.isInternetReachable ?? networkState.isConnected

  return (
    <Screen scroll>
      <Section eyebrow="Event-Day Home" title="Operations at a glance" description="A focused view of the selected event and the work that needs attention now.">
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="calendar-outline" size={24} color={colors.primary} accessibilityLabel="Working event" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{activeEvent.eventName || 'Assigned Event'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{activeEvent.eventDate || 'Date not recorded'}{activeEvent.location ? ` • ${activeEvent.location}` : ''}</Text>
            </View>
            <Pill tone={online ? 'success' : 'warning'}>{online ? 'Live' : 'Offline'}</Pill>
          </View>
        </Card>
        {online ? (
          <Banner tone="success">Live connection confirmed. Check-in waits for server confirmation before reporting success.</Banner>
        ) : (
          <Banner tone="warning">Offline mode is visible, but check-ins stay blocked until the connection returns.</Banner>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Registrations" value={registrations.length} detail={`${checkedIn} checked in`} />
          <Metric label="Open Tasks" value={openTasks} detail={`${tasks.length - openTasks} completed or cancelled`} />
          <Metric label="Documents" value={documents.length} detail="Event register" />
          <Metric label="Readiness" value={readinessItems === 0 ? 'Ready' : `${readinessItems} items`} detail="Needs attention" />
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="flash-outline" size={20} color={colors.primary} accessibilityLabel="Quick actions" />
            <Text style={{ ...typography.section, color: colors.text }}>Quick actions</Text>
          </View>
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Guest Search" onPress={() => router.push('/lookup')} testID="home-guest-search-button" accessibilityLabel="home-guest-search-button" />
            <PrimaryButton label="QR Scanner" onPress={() => router.push('/scanner')} testID="home-qr-scanner-button" accessibilityLabel="home-qr-scanner-button" />
            <SecondaryButton label="Manual Ticket Code" onPress={() => router.push('/manual-entry')} testID="home-manual-ticket-button" accessibilityLabel="home-manual-ticket-button" />
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="list-outline" size={20} color={colors.primary} accessibilityLabel="Operations" />
            <Text style={{ ...typography.section, color: colors.text }}>More operations</Text>
          </View>
          <View style={{ gap: 10 }}>
            <SecondaryButton label="Assigned Tasks" onPress={() => router.push('/tasks')} />
            <SecondaryButton label="Operational Notes" onPress={() => router.push('/notes')} />
            <SecondaryButton label="Event Contacts" onPress={() => router.push('/contacts')} />
            <SecondaryButton label="Limited Reports" onPress={() => router.push('/reports')} />
            <SecondaryButton label="Settings and Sign Out" onPress={() => router.push('/settings')} testID="home-settings-button" accessibilityLabel="home-settings-button" />
          </View>
        </Card>

        <SecondaryButton
          label="Choose Another Assigned Event"
          onPress={async () => {
            await clearActiveEvent()
            router.replace('/events')
          }}
          testID="home-change-event-button"
          accessibilityLabel="home-change-event-button"
        />
      </Section>
    </Screen>
  )
}
