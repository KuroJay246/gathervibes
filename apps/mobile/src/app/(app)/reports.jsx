import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { Banner, Card, EmptyState, Metric, Screen, Section } from '@/components/ui'
import { colors, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToRegistrations } from '@/services/registrations'
import { subscribeToTasks } from '@/services/tasks'
import { subscribeToOperationsLedger } from '@/services/operations'
import { normalizePaymentStatus } from '@gsv/contracts/paymentStatus'

export default function ReportsScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [tasks, setTasks] = useState([])
  const [operations, setOperations] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    const unsubscribeRegistrations = subscribeToRegistrations(activeEvent.eventId, (rows) => { setRegistrations(rows); setLoaded(true) }, (nextError) => { setError(nextError?.message || 'Reports could not be loaded.'); setLoaded(true) })
    const unsubscribeTasks = subscribeToTasks(activeEvent.eventId, setTasks, () => {})
    const unsubscribeOperations = subscribeToOperationsLedger(activeEvent.eventId, setOperations, () => {})
    return () => {
      unsubscribeRegistrations()
      unsubscribeTasks()
      unsubscribeOperations()
    }
  }, [activeEvent?.eventId])

  const paid = useMemo(() => registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'paid').length, [registrations])
  const pending = useMemo(() => registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'pending').length, [registrations])
  const door = useMemo(() => registrations.filter((registration) => ['door', 'door-list'].includes(normalizePaymentStatus(registration.paymentStatus))).length, [registrations])
  const checkedIn = useMemo(() => registrations.filter((registration) => registration.checkedIn).length, [registrations])
  const attendancePercent = registrations.length ? Math.round((checkedIn / registrations.length) * 100) : 0
  const openTasks = useMemo(() => tasks.filter((task) => !['Completed', 'Cancelled'].includes(task.status)), [tasks])
  const overdueTasks = useMemo(() => openTasks.filter((task) => task.overdue || (task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10))), [openTasks])
  const openOperations = useMemo(() => operations.filter((entry) => !['paid', 'received', 'cancelled'].includes(entry.status)), [operations])
  const attentionOperations = useMemo(() => openOperations.filter((entry) => ['pending', 'expected'].includes(entry.status)), [openOperations])
  const outstandingOperations = useMemo(() => openOperations.reduce((total, entry) => total + Number(entry.amount || 0), 0), [openOperations])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Limited Reports"
        title="Reports"
        description="This mobile report surface stays narrow: registration, payment-status, and check-in totals for the currently selected event only."
      >
        {!loaded ? <Banner>Loading event summary…</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {loaded && !error && registrations.length === 0 ? <EmptyState title="No registration activity" description="The selected event has no visible registration records yet." /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Registrations" value={registrations.length} />
          <Metric label="Checked In" value={checkedIn} />
          <Metric label="Attendance" value={`${attendancePercent}%`} detail={`${Math.max(registrations.length - checkedIn, 0)} remaining`} />
          <Metric label="Paid" value={paid} />
          <Metric label="Pending" value={pending} />
          <Metric label="Door" value={door} />
          <Metric label="Not Checked In" value={Math.max(registrations.length - checkedIn, 0)} />
        </View>
        <Card tone="muted">
          <Text style={{ ...typography.section, color: colors.text }}>Attendance</Text>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }} accessibilityLabel={`Attendance ${attendancePercent} percent`}>
            <View style={{ width: `${attendancePercent}%`, height: '100%', backgroundColor: colors.primary }} />
          </View>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{checkedIn} of {registrations.length} registrations checked in.</Text>
        </Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Open Tasks" value={openTasks.length} detail={`${overdueTasks.length} overdue`} />
          <Metric label="Operations" value={attentionOperations.length} detail={openOperations.length ? `${outstandingOperations.toFixed(2)} outstanding` : 'Clear'} />
        </View>
        <Card tone="muted">
          <Text style={{ ...typography.section, color: colors.text }}>Event-day readout</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{checkedIn} of {registrations.length} registrations checked in. {pending > 0 ? `${pending} payment${pending === 1 ? '' : 's'} still need review.` : 'No pending payments are visible.'}</Text>
        </Card>
      </Section>
    </Screen>
  )
}
