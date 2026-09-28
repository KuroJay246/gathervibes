import { Redirect, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import { AppIcon, Card, EmptyState, Field, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

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

function eventTimestamp(event) {
  const value = event.eventDate
  const raw = typeof value?.toDate === 'function' ? value.toDate() : value && typeof value === 'object' && Number.isFinite(value._seconds) ? new Date(value._seconds * 1000) : value
  const timestamp = raw ? new Date(raw).getTime() : Number.NaN
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function eventSearchText(event) {
  return [event.eventName, event.eventId, event.location, event.status].filter(Boolean).join(' ').toLowerCase()
}

export default function EventSelectionScreen() {
  const router = useRouter()
  const { assignedEvents, authInitialized, isAuthorized, signOut, currentRoleLabel } = useAuth()
  const { activeEvent, ready, setActiveEvent } = useActiveEvent()
  const [query, setQuery] = useState('')

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...assignedEvents]
      .filter((event) => !normalizedQuery || eventSearchText(event).includes(normalizedQuery))
      .sort((left, right) => eventTimestamp(left) - eventTimestamp(right))
  }, [assignedEvents, query])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (activeEvent?.eventId) return <Redirect href="/home" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Staff workspace"
        title="Choose an event"
        description="Open an assigned event to enter its event-day workspace."
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="shield-checkmark-outline" size={19} color="#7c3144" accessibilityLabel="Authorized staff" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#69615c' }}>{currentRoleLabel}</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#8a817a' }}>{assignedEvents.length} assigned</Text>
        </View>

        {assignedEvents.length === 0 ? (
          <EmptyState
            title="No assigned events"
            description="This account signed in successfully, but there are no active staff assignments with readable event records."
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Field label="Find an assigned event" value={query} onChangeText={setQuery} placeholder="Search name, date, location" autoCapitalize="none" accessibilityLabel="event-selection-search" rightIcon={<AppIcon name="search-outline" color="#8a817a" accessibilityLabel="Search events" />} />
            <Text style={{ fontSize: 12, color: '#8a817a' }}>{visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'} shown · earliest first</Text>
            {visibleEvents.length === 0 ? (
              <EmptyState title="No matching events" description="Try a different name, location, or status." />
            ) : visibleEvents.map((event) => (
              <Card key={event.eventId}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#f2e4e8', alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="calendar-outline" size={22} color="#7c3144" accessibilityLabel="Event" />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '700', color: '#211f20' }}>{event.eventName || event.eventId}</Text>
                    <Text style={{ fontSize: 14, lineHeight: 19, color: '#69615c' }}>{event.eventDate ? formatMobileEventDate(event.eventDate) : 'Date not recorded'}</Text>
                    {event.location ? <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: '#8a817a' }}>{event.location}</Text> : null}
                  </View>
                  <Pill tone={event.status === 'completed' ? 'neutral' : 'success'}>{event.status || 'scheduled'}</Pill>
                </View>
                <PrimaryButton
                  label="Open event workspace"
                  onPress={async () => {
                    await setActiveEvent(event)
                    router.replace('/home')
                  }}
                  testID={`event-select-open-${event.eventId}`}
                  accessibilityLabel={`Open ${event.eventName || event.eventId}`}
                />
              </Card>
            ))}
          </View>
        )}

        <SecondaryButton label="Sign Out" onPress={() => void signOut()} testID="event-select-sign-out-button" accessibilityLabel="event-select-sign-out-button" />
      </Section>
    </Screen>
  )
}
