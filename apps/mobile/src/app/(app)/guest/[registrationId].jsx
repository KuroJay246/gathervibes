import { useEffect, useState } from 'react'
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Pill, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { loadRegistrationDetail } from '@/services/registrations'
import { formatPaymentLabel } from '@gsv/contracts/paymentStatus'

function guestName(registration) {
  return registration?.fullName || registration?.buyerName || 'Guest'
}

function valueOrFallback(value, fallback = 'Not provided') {
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export default function GuestDetailScreen() {
  const router = useRouter()
  const { registrationId } = useLocalSearchParams()
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registration, setRegistration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!activeEvent?.eventId || !registrationId) return undefined
    Promise.resolve().then(() => {
      if (cancelled) return null
      setLoading(true)
      setError('')
      return loadRegistrationDetail(activeEvent.eventId, registrationId)
    })
      .then((result) => {
        if (!cancelled) setRegistration(result)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError?.message || 'Guest details could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [activeEvent?.eventId, registrationId])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  if (loading) return <Screen><Section eyebrow="Guest" title="Loading details"><EmptyState title="Loading guest details" description="Fetching the selected event record." /></Section></Screen>
  if (error) return <Screen><Section eyebrow="Guest" title="Guest details"><Banner tone="danger">{error}</Banner></Section></Screen>
  if (!registration) return <Screen><Section eyebrow="Guest" title="Guest details"><EmptyState title="Guest not found" description="This guest is not available in the selected event." /></Section></Screen>

  return (
    <Screen scroll>
      <Section eyebrow="Guest Detail" title={guestName(registration)} description={activeEvent.eventName || 'Selected event'}>
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="person-outline" size={25} color={colors.primary} accessibilityLabel="Guest" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{guestName(registration)}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{valueOrFallback(registration.email || registration.phone)}</Text>
            </View>
            <Pill tone={registration.checkedIn ? 'warning' : 'success'}>{registration.checkedIn ? 'Checked In' : 'Ready'}</Pill>
          </View>
        </Card>

        <Text style={{ ...typography.caption, color: colors.textSubtle }}>TICKET</Text>
        <Card tone="muted">
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><AppIcon name="qr-code-outline" size={21} color={colors.primary} accessibilityLabel="Ticket" /><Text style={{ ...typography.label, color: colors.text }}>Ticket status</Text></View>
            <Text style={{ ...typography.body, color: colors.text }}>{valueOrFallback(registration.ticketCode, 'No ticket assigned')}</Text>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>{valueOrFallback(registration.ticketStatus, 'Status unavailable')}</Text>
            <SecondaryButton label="View ticket details" onPress={() => router.push(`/guest/${registration.registrationId}/ticket`)} accessibilityLabel="View ticket details" />
          </View>
        </Card>

        <Text style={{ ...typography.caption, color: colors.textSubtle }}>REGISTRATION</Text>
        <Card tone="muted">
          <View style={{ gap: 8 }}>
            <Text style={{ ...typography.body, color: colors.text }}>Payment: {formatPaymentLabel(registration.paymentStatus)}</Text>
            <Text style={{ ...typography.body, color: colors.textMuted }}>Registration status: {valueOrFallback(registration.registrationStatus, 'Active')}</Text>
            <Text style={{ ...typography.body, color: colors.textMuted }}>Event: {activeEvent.eventName || activeEvent.eventId}</Text>
          </View>
        </Card>

        {registration.checkedIn ? (
          <Banner tone="success">Checked in{registration.checkedInAt ? ` at ${valueOrFallback(registration.checkedInAt)}` : ''}. This record is read-only here.</Banner>
        ) : <Banner tone="info">Check-in is completed from Scanner or Registration Lookup.</Banner>}
      </Section>
    </Screen>
  )
}
