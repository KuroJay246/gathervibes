import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Metric, Pill, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToRunOfShow } from '@/services/runOfShow'
import { groupRunOfShowItems } from '@/lib/runOfShowModel'

function statusTone(status) {
  if (status === 'Completed') return 'success'
  if (status === 'Delayed' || status === 'Cancelled') return 'danger'
  if (status === 'In Progress') return 'warning'
  return 'neutral'
}

function TimelineCard({ item }) {
  return (
    <Card tone="muted">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <AppIcon name="time-outline" size={21} color={colors.primary} accessibilityLabel="Timeline item" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ ...typography.section, color: colors.text }}>{item.title}</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>{item.startTime}{item.endTime ? `–${item.endTime}` : ''} · {item.category}</Text>
          {item.location ? <Text style={{ ...typography.caption, color: colors.textSubtle }}>{item.location}</Text> : null}
        </View>
        <Pill tone={statusTone(item.status)}>{item.status}</Pill>
      </View>
      {item.description ? <Text style={{ ...typography.body, color: colors.textMuted }}>{item.description}</Text> : null}
      {item.responsibleLabel ? <Text style={{ ...typography.caption, color: colors.textSubtle }}>Owner: {item.responsibleLabel}</Text> : null}
      {item.arrivalStatus && item.arrivalStatus !== 'Expected' ? <Text style={{ ...typography.caption, color: item.arrivalStatus === 'Delayed' ? colors.danger : colors.success }}>Arrival: {item.arrivalStatus}</Text> : null}
    </Card>
  )
}

export default function RunOfShowScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToRunOfShow(activeEvent.eventId, (nextItems) => { setItems(nextItems); setLoading(false) }, (nextError) => { setError(nextError?.message || 'Run of Show could not be loaded.'); setLoading(false) })
  }, [activeEvent?.eventId])

  const groups = useMemo(() => groupRunOfShowItems(items), [items])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section eyebrow="Event-day timeline" title="Run of Show" description="See what is happening now, what comes next, and which event-day dependencies need attention.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Total" value={items.length} />
          <Metric label="Current" value={groups.current.length} />
          <Metric label="Delayed" value={groups.delayed.length} />
          <Metric label="Completed" value={groups.completed.length} />
        </View>

        {loading ? <Banner>Loading event-day timeline…</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {items.length === 0 ? <EmptyState title="No timeline items" description="The selected event does not have a Run of Show yet." /> : null}
        {groups.current.length > 0 ? <Section eyebrow="Now" title="In progress"><View style={{ gap: 12 }}>{groups.current.map((item) => <TimelineCard key={item.itemId} item={item} />)}</View></Section> : null}
        {groups.next.length > 0 ? <Section eyebrow="Next" title="Next up"><View style={{ gap: 12 }}>{groups.next.map((item) => <TimelineCard key={item.itemId} item={item} />)}</View></Section> : null}
        {groups.upcoming.length > 0 ? <Section eyebrow="Upcoming" title="Later in the sequence"><View style={{ gap: 12 }}>{groups.upcoming.map((item) => <TimelineCard key={item.itemId} item={item} />)}</View></Section> : null}
        {groups.delayed.length > 0 ? <Section eyebrow="Attention" title="Delayed"><View style={{ gap: 12 }}>{groups.delayed.map((item) => <TimelineCard key={item.itemId} item={item} />)}</View></Section> : null}
        {groups.completed.length > 0 ? <Section eyebrow="Completed" title="Recently completed"><View style={{ gap: 12, opacity: 0.78 }}>{groups.completed.map((item) => <TimelineCard key={item.itemId} item={item} />)}</View></Section> : null}
      </Section>
    </Screen>
  )
}
