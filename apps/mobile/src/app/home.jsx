import { useEffect, useMemo, useState } from 'react'
import { useRouter, Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { Banner, Card, Metric, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
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
      <Section
        eyebrow="Event-Day Home"
        title={activeEvent.eventName || 'Assigned Event'}
        description={`${activeEvent.eventDate || 'Date not recorded'}${activeEvent.location ? ` • ${activeEvent.location}` : ''}`}
      >
        {online ? (
          <Banner tone="success">Live connection confirmed. Final check-in success waits for server confirmation before this app reports success.</Banner>
        ) : (
          <Banner tone="warning">Offline mode is visible, but check-ins stay blocked until the connection returns.</Banner>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Registrations" value={registrations.length} detail={`${checkedIn} checked in`} />
          <Metric label="Open Tasks" value={openTasks} detail={`${tasks.length - openTasks} completed or cancelled`} />
          <Metric label="Documents" value={documents.length} detail="Read-only document register" />
          <Metric label="Readiness" value={readinessItems === 0 ? 'Ready' : `${readinessItems} items`} detail="First mobile cut" />
        </View>

        <Card>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>Core event-day actions</Text>
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Guest Search" onPress={() => router.push('/lookup')} />
            <PrimaryButton label="QR Scanner" onPress={() => router.push('/scanner')} />
            <SecondaryButton label="Manual Ticket Code" onPress={() => router.push('/manual-entry')} />
          </View>
        </Card>

        <Card>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>Operations</Text>
          <View style={{ gap: 10 }}>
            <SecondaryButton label="Assigned Tasks" onPress={() => router.push('/tasks')} />
            <SecondaryButton label="Operational Notes" onPress={() => router.push('/notes')} />
            <SecondaryButton label="Event Contacts" onPress={() => router.push('/contacts')} />
            <SecondaryButton label="Limited Reports" onPress={() => router.push('/reports')} />
            <SecondaryButton label="Settings and Sign Out" onPress={() => router.push('/settings')} />
          </View>
        </Card>

        <SecondaryButton
          label="Choose Another Assigned Event"
          onPress={async () => {
            await clearActiveEvent()
            router.replace('/events')
          }}
        />
      </Section>
    </Screen>
  )
}
