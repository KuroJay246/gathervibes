import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { Card, EmptyState, Metric, Screen, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToTasks } from '@/services/tasks'

export default function TasksScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToTasks(activeEvent.eventId, setTasks, () => {})
  }, [activeEvent?.eventId])

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'Completed' && task.status !== 'Cancelled'), [tasks])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section eyebrow="Assigned Tasks" title="Tasks" description="Read-only event-scoped task visibility for the selected working event.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Open" value={openTasks.length} />
          <Metric label="Completed" value={tasks.filter((task) => task.status === 'Completed').length} />
          <Metric label="Blocked" value={tasks.filter((task) => task.status === 'Blocked').length} />
        </View>

        {tasks.length === 0 ? (
          <EmptyState title="No tasks recorded" description="This event does not have visible tasks yet." />
        ) : (
          tasks.map((task) => (
            <Card key={task.taskId}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2023' }}>{task.title || 'Untitled task'}</Text>
              <Text style={{ color: '#5c554f' }}>{task.status || 'Not Started'}{task.dueDate ? ` • Due ${task.dueDate}` : ''}</Text>
              {task.notes ? <Text style={{ color: '#4f4842', lineHeight: 20 }}>{task.notes}</Text> : null}
              {task.blockerReason ? <Text style={{ color: '#8d3f28', lineHeight: 20 }}>Blocker: {task.blockerReason}</Text> : null}
            </Card>
          ))
        )}
      </Section>
    </Screen>
  )
}
