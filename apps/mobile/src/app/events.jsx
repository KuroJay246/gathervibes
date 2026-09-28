import { Redirect, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, Text, View } from 'react-native'

import { AppIcon, Card, EmptyState, Field, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
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
          <Text style={{ fontSize: 13, color: '#8a817a' }}>{assignedEvents.length} {access?.protectedOwner ? 'available' : 'assigned'}</Text>
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
                  <Text style={{ fontSize: 12, color: '#69615c' }}>{assignedEvents.length} {access?.protectedOwner ? 'available' : 'assigned'} · opens a searchable picker</Text>
                </View>
                <AppIcon name="chevron-forward-outline" size={21} color="#7c3144" accessibilityLabel="Open event picker" />
              </View>
            </Pressable>
            <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(33,31,32,0.42)' }}>
                <View style={{ maxHeight: '88%', backgroundColor: colors.background, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, gap: spacing.md }} accessibilityViewIsModal>
                  <View style={{ alignItems: 'center' }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong }} /></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ gap: 2 }}><Text style={{ ...typography.title, color: colors.text }}>Select an event</Text><Text style={{ ...typography.caption, color: colors.textMuted }}>{visibleEvents.length} shown · earliest first</Text></View>
                    <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button" accessibilityLabel="Close event picker" hitSlop={8}><AppIcon name="close-outline" size={28} color={colors.text} accessibilityLabel="Close event picker" /></Pressable>
                  </View>
                  <Field label="Search events" value={query} onChangeText={setQuery} placeholder="Name, date, location" autoCapitalize="none" accessibilityLabel="event-selection-search" rightIcon={<AppIcon name="search-outline" color={colors.textSubtle} accessibilityLabel="Search events" />} />
                  {visibleEvents.length === 0 ? <EmptyState title="No matching events" description="Try a different name, location, or status." /> : <FlatList data={visibleEvents} keyExtractor={(event) => event.eventId} ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />} renderItem={({ item: event }) => (
                    <Pressable onPress={async () => { setPickerOpen(false); await setActiveEvent(event); router.replace('/home') }} testID={`event-select-open-${event.eventId}`} accessibilityRole="button" accessibilityLabel={`Open ${event.eventName || event.eventId}`} style={({ pressed }) => [{ backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs }, pressed ? { opacity: 0.82 } : null]}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="calendar-outline" size={22} color={colors.primary} accessibilityLabel="Event" /></View>
                        <View style={{ flex: 1, gap: 3 }}><Text style={{ ...typography.section, color: colors.text }}>{event.eventName || event.eventId}</Text><Text style={{ ...typography.body, color: colors.textMuted }}>{event.eventDate ? formatMobileEventDate(event.eventDate) : 'Date not recorded'}</Text>{event.location ? <Text numberOfLines={1} style={{ ...typography.caption, color: colors.textSubtle }}>{event.location}</Text> : null}</View>
                        <Pill tone={event.status === 'completed' ? 'neutral' : 'success'}>{event.status || 'scheduled'}</Pill>
                      </View>
                    </Pressable>
                  )} />}
                </View>
              </View>
            </Modal>
          </View>
        )}

        <SecondaryButton label="Sign Out" onPress={() => void signOut()} testID="event-select-sign-out-button" accessibilityLabel="event-select-sign-out-button" />
      </Section>
    </Screen>
  )
}
