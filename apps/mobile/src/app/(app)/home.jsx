import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect, useRouter, Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { AppIcon, Banner, Card, EmptyState, Metric, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToDocuments } from '@/services/documents'
import { loadRegistrationSummary } from '@/services/registrations'
import { subscribeToTasks } from '@/services/tasks'
import { subscribeToOperationsLedger } from '@/services/operations'
import { subscribeToRunOfShow } from '@/services/runOfShow'
import { groupRunOfShowItems } from '@/lib/runOfShowModel'

function formatMobileEventDate(value) {
  const raw = typeof value?.toDate === 'function'
    ? value.toDate()
    : value && typeof value === 'object' && Number.isFinite(value._seconds)
      ? new Date(value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1e6))
      : value && typeof value === 'object' && Number.isFinite(value.seconds)
        ? new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6))
      : value
  if (!raw) return ''
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const date = raw instanceof Date ? raw : new Date(raw)
  return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString()
}

export default function HomeScreen() {
  const router = useRouter()
  const networkState = useNetworkState()
  const { isAuthorized, authInitialized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registrationSummary, setRegistrationSummary] = useState({ totalRegistrations: 0, checkedIn: 0, attendancePercentage: 0 })
  const [tasks, setTasks] = useState([])
  const [documents, setDocuments] = useState([])
  const [operations, setOperations] = useState([])
  const [runOfShow, setRunOfShow] = useState([])
  const [runOfShowLoaded, setRunOfShowLoaded] = useState(false)
  const [runOfShowError, setRunOfShowError] = useState('')

  useFocusEffect(useCallback(() => {
    let cancelled = false
    if (!activeEvent?.eventId) return undefined
    loadRegistrationSummary(activeEvent.eventId)
      .then((summary) => { if (!cancelled) setRegistrationSummary(summary) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeEvent]))

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    const unsubscribeTasks = subscribeToTasks(activeEvent.eventId, setTasks, () => {})
    const unsubscribeDocuments = subscribeToDocuments(activeEvent.eventId, setDocuments, () => {})
    const unsubscribeOperations = subscribeToOperationsLedger(activeEvent.eventId, setOperations, () => {})
    const unsubscribeRunOfShow = subscribeToRunOfShow(activeEvent.eventId, (rows) => {
      setRunOfShow(rows)
      setRunOfShowLoaded(true)
    }, (error) => {
      setRunOfShowError(error?.message || 'Run of Show could not be loaded.')
      setRunOfShowLoaded(true)
    })
    return () => {
      unsubscribeTasks()
      unsubscribeDocuments()
      unsubscribeOperations()
      unsubscribeRunOfShow()
    }
  }, [activeEvent?.eventId])

  const checkedIn = registrationSummary.checkedIn
  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled').length, [tasks])
  const openOperations = useMemo(() => operations.filter((entry) => !['paid', 'received', 'cancelled'].includes(entry.status)).length, [operations])
  const attentionCount = openTasks + openOperations
  const attendancePercent = registrationSummary.attendancePercentage
  const readinessItems = useMemo(() => {
    let count = 0
    if (openTasks > 0) count += 1
    if (documents.length === 0) count += 1
    if (registrationSummary.totalRegistrations === 0) count += 1
    return count
  }, [documents.length, openTasks, registrationSummary.totalRegistrations])
  const runOfShowGroups = useMemo(() => groupRunOfShowItems(runOfShow), [runOfShow])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  const online = networkState.isInternetReachable ?? networkState.isConnected

  return (
    <Screen scroll>
      <Section eyebrow="Event day" title="At a glance">
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="calendar-outline" size={24} color={colors.primary} accessibilityLabel="Working event" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{activeEvent.eventName || 'Assigned Event'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{activeEvent.eventDate ? formatMobileEventDate(activeEvent.eventDate) : 'Date not recorded'}{activeEvent.location ? ` • ${activeEvent.location}` : ''}</Text>
            </View>
            <Pill tone={online ? 'success' : 'warning'}>{online ? 'Live' : 'Offline'}</Pill>
          </View>
        </Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 }} accessibilityLabel={online ? 'Connected' : 'Offline'}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? colors.success : colors.warning }} />
          <Text style={{ ...typography.caption, color: colors.textMuted }}>{online ? 'Connected' : 'Offline — check-ins are paused'}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Attendance" value={`${attendancePercent}%`} detail={`${checkedIn} of ${registrationSummary.totalRegistrations} checked in`} emphasis />
          <Metric label="Open tasks" value={openTasks} detail={`${tasks.length - openTasks} completed`} />
          <Metric label="Registrations" value={registrationSummary.totalRegistrations} detail={`${checkedIn} checked in`} />
          <Metric label="Documents" value={documents.length} detail="Event register" />
        </View>

        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="alert-circle-outline" size={20} color={attentionCount ? colors.warning : colors.success} accessibilityLabel="Needs attention" />
            <Text style={{ ...typography.section, color: colors.text }}>Needs attention</Text>
            <Pill tone={attentionCount ? 'warning' : 'success'}>{attentionCount ? `${attentionCount} open` : 'Clear'}</Pill>
          </View>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{openTasks} task{openTasks === 1 ? '' : 's'} and {openOperations} operation{openOperations === 1 ? '' : 's'} require attention.</Text>
          <Text style={{ ...typography.caption, color: colors.textSubtle }}>{readinessItems === 0 ? 'Event register is ready.' : `${readinessItems} readiness ${readinessItems === 1 ? 'item' : 'items'} still need review.`}</Text>
          {attentionCount > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {openTasks > 0 ? <SecondaryButton label="Review tasks" onPress={() => router.push('/tasks')} accessibilityLabel="Review open tasks" /> : null}
              {openOperations > 0 ? <SecondaryButton label="Review operations" onPress={() => router.push('/operations')} accessibilityLabel="Review open operations" /> : null}
            </View>
          ) : null}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="flash-outline" size={20} color={colors.primary} accessibilityLabel="Quick actions" />
            <Text style={{ ...typography.section, color: colors.text }}>Quick actions</Text>
          </View>
          <View style={{ gap: 10 }}>
            <PrimaryButton label="Guest search" onPress={() => router.push('/lookup')} testID="home-guest-search-button" accessibilityLabel="home-guest-search-button" />
            <PrimaryButton label="Scan a ticket" onPress={() => router.push('/scanner')} testID="home-qr-scanner-button" accessibilityLabel="home-qr-scanner-button" />
            <SecondaryButton label="Manual Ticket Code" onPress={() => router.push('/manual-entry')} testID="home-manual-ticket-button" accessibilityLabel="home-manual-ticket-button" />
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppIcon name="time-outline" size={20} color={colors.primary} accessibilityLabel="Run of Show" />
            <Text style={{ ...typography.section, color: colors.text }}>Event timeline</Text>
          </View>
          {!runOfShowLoaded ? <Banner>Loading event timeline…</Banner> : null}
          {runOfShowError ? <Banner tone="danger">{runOfShowError}</Banner> : null}
          {runOfShowLoaded && !runOfShowError && runOfShow.length === 0 ? (
            <EmptyState title="No timeline items" description="Add event-day timing in Run of Show when the schedule is ready." />
          ) : null}
          {runOfShowGroups.current[0] ? (
            <View style={{ gap: 3 }}>
              <Text style={{ ...typography.caption, color: colors.primary }}>CURRENT</Text>
              <Text style={{ ...typography.section, color: colors.text }}>{runOfShowGroups.current[0].title || 'Current item'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{runOfShowGroups.current[0].startTime || 'Time not set'}{runOfShowGroups.current[0].location ? ` • ${runOfShowGroups.current[0].location}` : ''}</Text>
            </View>
          ) : null}
          {!runOfShowGroups.current[0] && runOfShowGroups.next[0] ? (
            <View style={{ gap: 3 }}>
              <Text style={{ ...typography.caption, color: colors.textMuted }}>NEXT</Text>
              <Text style={{ ...typography.section, color: colors.text }}>{runOfShowGroups.next[0].title || 'Next item'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{runOfShowGroups.next[0].startTime || 'Time not set'}{runOfShowGroups.next[0].location ? ` • ${runOfShowGroups.next[0].location}` : ''}</Text>
            </View>
          ) : null}
          {runOfShowGroups.current[0] && runOfShowGroups.next[0] ? (
            <View style={{ gap: 3 }}>
              <Text style={{ ...typography.caption, color: colors.textMuted }}>NEXT</Text>
              <Text style={{ ...typography.section, color: colors.text }}>{runOfShowGroups.next[0].title || 'Next item'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{runOfShowGroups.next[0].startTime || 'Time not set'}{runOfShowGroups.next[0].location ? ` • ${runOfShowGroups.next[0].location}` : ''}</Text>
            </View>
          ) : null}
          <SecondaryButton label="Open Run of Show" onPress={() => router.push('/run-of-show')} accessibilityLabel="Open Run of Show" />
        </Card>

        <SecondaryButton
          label="Choose Another Assigned Event"
          onPress={async () => {
            router.push('/events')
          }}
          testID="home-change-event-button"
          accessibilityLabel="home-change-event-button"
        />
      </Section>
    </Screen>
  )
}
