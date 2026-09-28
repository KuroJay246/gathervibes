import { Redirect, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'

import { AppIcon, EmptyState, Field, Pill, Screen, Section } from '@/components/ui'
import { colors, radii, spacing, typography } from '@/design/tokens'
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

function eventStatusLabel(status) {
  return String(status || 'scheduled').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function eventOrder(event) {
  const timestamp = eventTimestamp(event)
  const status = String(event.status || '').toLowerCase()
  const isCompleted = status === 'completed' || (Number.isFinite(timestamp) && timestamp < Date.now())
  return { group: isCompleted ? 2 : timestamp <= Date.now() ? 0 : 1, timestamp }
}

function eventSearchText(event) {
  return [event.eventName, event.eventId, event.location, event.status].filter(Boolean).join(' ').toLowerCase()
}

export default function EventSelectionScreen() {
  const router = useRouter()
  const { assignedEvents, authInitialized, isAuthorized, signOut, currentRoleLabel, access } = useAuth()
  const { activeEvent, ready, setActiveEvent } = useActiveEvent()
  const [query, setQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...assignedEvents]
      .filter((event) => !normalizedQuery || eventSearchText(event).includes(normalizedQuery))
      .sort((left, right) => {
        const a = eventOrder(left)
        const b = eventOrder(right)
        return a.group - b.group || a.timestamp - b.timestamp
      })
  }, [assignedEvents, query])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  return (
    <Screen scroll>
      <Section
        eyebrow="Staff workspace"
        title="Choose an event"
        description={access?.protectedOwner ? 'Select an event to enter its workspace.' : 'Select an assigned event to enter its workspace.'}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="shield-checkmark-outline" size={19} color="#7c3144" accessibilityLabel="Authorized staff" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#69615c' }}>{currentRoleLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 13, color: '#8a817a' }}>{assignedEvents.length} {access?.protectedOwner ? 'available' : 'assigned'}</Text>
            <Pressable onPress={() => void signOut()} accessibilityRole="button" accessibilityLabel="Sign out" hitSlop={8}><AppIcon name="log-out-outline" size={20} color="#7c3144" accessibilityLabel="Sign out" /></Pressable>
          </View>
        </View>

        {assignedEvents.length === 0 ? (
          <EmptyState
            title="No assigned events"
            description="This account signed in successfully, but there are no active staff assignments with readable event records."
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" accessibilityLabel="Open event picker" style={({ pressed }) => [{ borderRadius: 14, backgroundColor: '#f2e4e8', overflow: 'hidden' }, pressed ? { opacity: 0.82 } : null]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
                <AppIcon name="albums-outline" size={21} color="#7c3144" accessibilityLabel="Assigned events" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#211f20' }}>Choose an event</Text>
                  <Text style={{ fontSize: 12, color: '#69615c' }}>{assignedEvents.length} {assignedEvents.length === 1 ? 'event' : 'events'} available</Text>
                </View>
                <AppIcon name="chevron-forward-outline" size={21} color="#7c3144" accessibilityLabel="Open event picker" />
              </View>
            </Pressable>
            <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(33,31,32,0.42)' }}>
                <View style={{ maxHeight: '88%', backgroundColor: colors.background, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md }} accessibilityViewIsModal>
                  <View style={{ alignItems: 'center' }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} /></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ gap: 2 }}><Text style={{ ...typography.title, color: colors.text }}>Select an event</Text><Text style={{ ...typography.caption, color: colors.textMuted }}>{visibleEvents.length} shown · active and upcoming first</Text></View>
                    <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Close event picker" hitSlop={8}><AppIcon name="close-outline" size={28} color={colors.text} accessibilityLabel="Close event picker" /></Pressable>
                  </View>
                  <Field label="Search events" value={query} onChangeText={setQuery} placeholder="Name, date, location" autoCapitalize="none" accessibilityLabel="event-selection-search" rightIcon={<AppIcon name="search-outline" color={colors.textSubtle} accessibilityLabel="Search events" />} />
                  {visibleEvents.length === 0 ? <EmptyState title="No matching events" description="Try a different name, location, or status." /> : <FlatList data={visibleEvents} keyExtractor={(event) => event.eventId} ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />} renderItem={({ item: event }) => (
                    <Pressable onPress={async () => { setPickerOpen(false); await setActiveEvent(event); router.replace('/home') }} testID={`event-select-open-${event.eventId}`} accessibilityRole="button" accessibilityLabel={`Open ${event.eventName || event.eventId}`} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }, pressed ? { opacity: 0.82 } : null]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="calendar-outline" size={22} color={colors.primary} accessibilityLabel="Event" /></View>
                        <View style={{ flex: 1, gap: 3 }}><Text style={{ ...typography.section, color: colors.text }}>{event.eventName || event.eventId}</Text><Text style={{ ...typography.body, color: colors.textMuted }}>{event.eventDate ? formatMobileEventDate(event.eventDate) : 'Date not recorded'}</Text>{event.location ? <Text numberOfLines={1} style={{ ...typography.caption, color: colors.textSubtle }}>{event.location}</Text> : null}</View>
                        {activeEvent?.eventId === event.eventId ? <Pill tone="success">Current</Pill> : <Pill tone={event.status === 'completed' ? 'neutral' : 'success'}>{eventStatusLabel(event.status)}</Pill>}
                      </View>
                    </Pressable>
                  )} />}
                </View>
              </View>
            </Modal>
          </View>
        )}

      </Section>
    </Screen>
  )
}
