import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { AppIcon, Banner, EmptyState, Field, LoadingView, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { createManagedEvent, subscribeToManagedEvents, updateManagedEvent } from '@/services/events'

function eventDateLabel(value) {
  const date = value?.toDate?.() || value
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? String(value || 'Date not recorded') : parsed.toLocaleDateString()
}

function EventForm({ initialEvent, onCancel, onSaved }) {
  const [values, setValues] = useState({ eventName: initialEvent?.eventName || '', eventDate: typeof initialEvent?.eventDate === 'string' ? initialEvent.eventDate : '', location: initialEvent?.location || '', venueName: initialEvent?.venueName || '', status: initialEvent?.status || 'planning', eventDescription: initialEvent?.eventDescription || '', notes: initialEvent?.notes || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (key) => (value) => setValues((current) => ({ ...current, [key]: value }))
  async function save() {
    setSaving(true); setError('')
    try { if (initialEvent) await updateManagedEvent(initialEvent.eventId, values); else await createManagedEvent(values); onSaved() } catch (nextError) { setError(nextError?.message || 'Event could not be saved.') } finally { setSaving(false) }
  }
  return (
    <Screen scroll back>
      <Section eyebrow={initialEvent ? 'Event management' : 'New event'} title={initialEvent ? 'Edit event' : 'Create event'} description="Use the same event fields and status meanings as Event Hub.">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Field label="Event name" value={values.eventName} onChangeText={set('eventName')} placeholder="Event name" />
        <Field label="Date" value={values.eventDate} onChangeText={set('eventDate')} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Location" value={values.location} onChangeText={set('location')} placeholder="Location" />
        <Field label="Venue" value={values.venueName} onChangeText={set('venueName')} placeholder="Venue name" />
        <Field label="Status" value={values.status} onChangeText={set('status')} placeholder="planning" autoCapitalize="none" />
        <Field label="Description" value={values.eventDescription} onChangeText={set('eventDescription')} placeholder="Optional description" />
        <Field label="Notes" value={values.notes} onChangeText={set('notes')} placeholder="Optional notes" />
        <View style={{ gap: spacing.sm }}><PrimaryButton label={saving ? 'Saving…' : initialEvent ? 'Save changes' : 'Create event'} onPress={save} disabled={saving} /><SecondaryButton label="Cancel" onPress={onCancel} disabled={saving} /></View>
      </Section>
    </Screen>
  )
}

export default function EventsManagementScreen() {
  const { authInitialized, isAuthorized, access } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [events, setEvents] = useState([]); const [error, setError] = useState(''); const [selected, setSelected] = useState(null); const [creating, setCreating] = useState(false)
  const canManage = Boolean(access?.protectedOwner || access?.isAdmin || access?.role === 'owner' || access?.role === 'admin')
  useEffect(() => { if (!canManage) return undefined; return subscribeToManagedEvents(setEvents, (nextError) => setError(nextError?.message || 'Events could not be loaded.')) }, [canManage])
  const sorted = useMemo(() => [...events].sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || ''))), [events])
  if (!authInitialized || !ready) return <LoadingView label="Loading events" />
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!canManage) return <Screen back><Section eyebrow="Events" title="Access restricted"><EmptyState title="Organizer access required" description="This workspace is available to authorized owners and organizers." /></Section></Screen>
  if (creating || selected) return <EventForm initialEvent={selected} onCancel={() => { setCreating(false); setSelected(null) }} onSaved={() => { setCreating(false); setSelected(null) }} />
  return <Screen scroll back><Section eyebrow="Event management" title="Events" description="Create, review, and update event records. Event selection remains a separate workflow.">
    {error ? <Banner tone="danger">{error}</Banner> : null}
    <PrimaryButton label="Create event" onPress={() => setCreating(true)} />
    {sorted.length === 0 ? <EmptyState title="No events found" description="Create the first event or check the current account access." /> : <View style={{ gap: spacing.sm }}>{sorted.map((event) => <Pressable key={event.eventId} onPress={() => setSelected(event)} accessibilityRole="button" accessibilityLabel={`Edit ${event.eventName || event.eventId}`} style={({ pressed }) => [{ padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.78 : 1 }]}><View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="calendar-outline" size={20} color={colors.primary} accessibilityLabel="Event" /></View><View style={{ flex: 1, gap: 3 }}><Text style={{ ...typography.section, color: colors.text }}>{event.eventName || event.eventId}</Text><Text style={{ ...typography.body, color: colors.textMuted }}>{eventDateLabel(event.eventDate)}{event.location ? ` · ${event.location}` : ''}</Text></View>{activeEvent?.eventId === event.eventId ? <Pill tone="success">Current</Pill> : null}<AppIcon name="chevron-forward-outline" size={20} color={colors.textSubtle} accessibilityLabel="Edit event" /></View></Pressable>)}</View>}
  </Section></Screen>
}
