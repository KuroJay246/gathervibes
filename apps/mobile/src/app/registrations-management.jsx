import { useEffect, useState } from 'react'
import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { Banner, EmptyState, Field, LoadingView, Pill, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { loadRegistrationPage, searchRegistrations } from '@/services/registrations'

function nameOf(registration) { return registration.fullName || registration.buyerName || 'Unnamed guest' }

export default function RegistrationsManagementScreen() {
  const router = useRouter(); const { authInitialized, isAuthorized } = useAuth(); const { activeEvent, ready } = useActiveEvent()
  const [records, setRecords] = useState([]); const [query, setQuery] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true)
  useEffect(() => { let cancelled = false; if (!activeEvent?.eventId) return undefined; Promise.resolve().then(() => { if (!cancelled) setLoading(true); return loadRegistrationPage(activeEvent.eventId, { pageSize: 50 }) }).then((page) => { if (!cancelled) setRecords(page.registrations) }).catch((nextError) => { if (!cancelled) setError(nextError?.message || 'Registrations could not be loaded.') }).finally(() => { if (!cancelled) setLoading(false) }); return () => { cancelled = true } }, [activeEvent?.eventId])
  if (!authInitialized || !ready) return <LoadingView label="Loading registrations" />
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  const filtered = query.trim() ? searchRegistrations(records, query, 50) : records
  return <Screen scroll back><Section eyebrow="Registration management" title="Registrations" description="Review bounded records for the working event. Guests remains optimized for fast event-day lookup.">
    {error ? <Banner tone="danger">{error}</Banner> : null}<Field label="Search records" value={query} onChangeText={setQuery} placeholder="Name, email, phone, or ticket" autoCapitalize="none" />
    {loading ? <EmptyState title="Loading registrations" description="Preparing the working event records." /> : filtered.length === 0 ? <EmptyState title={query ? 'No matching registrations' : 'No registrations yet'} description="No records were found for this event." /> : <View style={{ gap: spacing.sm }}>{filtered.map((registration) => <View key={registration.registrationId} style={{ padding: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}><View style={{ flex: 1 }}><Text style={{ ...typography.section, color: colors.text }}>{nameOf(registration)}</Text><Text style={{ ...typography.caption, color: colors.textMuted }}>{registration.email || registration.phone || 'No contact recorded'}</Text></View><Pill tone={registration.checkedIn ? 'warning' : 'success'}>{registration.checkedIn ? 'Checked in' : 'Registered'}</Pill></View><Text style={{ ...typography.caption, color: colors.textSubtle }}>Ticket: {registration.ticketCode || 'Not assigned'} · Payment: {registration.paymentStatus || 'Unknown'}</Text><SecondaryButton label="View registration" onPress={() => router.push(`/guest/${registration.registrationId}`)} /></View>)}</View>}
  </Section></Screen>
}
