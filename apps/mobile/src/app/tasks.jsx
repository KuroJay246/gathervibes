import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Metric, Pill, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToTasks } from '@/services/tasks'

export default function TasksScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [tasks, setTasks] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToTasks(activeEvent.eventId, (rows) => { setTasks(rows); setLoaded(true) }, (nextError) => { setError(nextError?.message || 'Tasks could not be loaded.'); setLoaded(true) })
  }, [activeEvent?.eventId])

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled'), [tasks])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section eyebrow="Assigned Tasks" title="Keep the event moving" description="Event-scoped work, ordered for quick scanning during setup and event day.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Open" value={openTasks.length} />
          <Metric label="Completed" value={tasks.filter((task) => task.status === 'Completed').length} />
          <Metric label="Blocked" value={tasks.filter((task) => task.status === 'Blocked').length} />
        </View>

        {!loaded ? <Banner>Loading assigned tasks…</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}

        {loaded && tasks.length === 0 ? (
          <EmptyState title="No tasks recorded" description="This event does not have visible tasks yet." />
        ) : (
          tasks.map((task) => (
            <Card key={task.taskId} tone="muted">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="checkmark-circle-outline" size={21} color={colors.primary} accessibilityLabel="Task" />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ ...typography.section, color: colors.text }}>{task.title || 'Untitled task'}</Text>
                  <Text style={{ ...typography.body, color: colors.textMuted }}>{task.dueDate ? `Due ${task.dueDate}` : 'No due date'}</Text>
                </View>
                <Pill tone={task.status === 'Completed' ? 'success' : task.status === 'Blocked' ? 'danger' : 'warning'}>{task.status || 'Not Started'}</Pill>
              </View>
              {task.notes ? <Text style={{ ...typography.body, color: colors.textMuted }}>{task.notes}</Text> : null}
              {task.blockerReason ? <Text style={{ ...typography.body, color: colors.danger }}>Blocked: {task.blockerReason}</Text> : null}
            </Card>
          ))
        )}
      </Section>
    </Screen>
  )
}
