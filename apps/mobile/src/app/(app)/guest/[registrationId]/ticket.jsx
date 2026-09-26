import { useEffect, useState } from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Pill, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { loadRegistrationDetail } from '@/services/registrations'

function guestName(registration) {
  return registration?.fullName || registration?.buyerName || 'Guest'
}

function display(value, fallback = 'Not available') {
  return value === undefined || value === null || value === '' ? fallback : String(value)
}

export default function TicketDetailScreen() {
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
    }).then((result) => {
      if (!cancelled) setRegistration(result)
    }).catch((nextError) => {
      if (!cancelled) setError(nextError?.message || 'Ticket details could not be loaded.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [activeEvent?.eventId, registrationId])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  if (loading) return <Screen><Section eyebrow="Ticket" title="Loading details"><EmptyState title="Loading ticket details" description="Fetching the selected event record." /></Section></Screen>
  if (error) return <Screen><Section eyebrow="Ticket" title="Ticket details"><Banner tone="danger">{error}</Banner></Section></Screen>
  if (!registration) return <Screen><Section eyebrow="Ticket" title="Ticket details"><EmptyState title="Ticket not found" description="This ticket is not available in the selected event." /></Section></Screen>

  return (
    <Screen scroll>
      <Section eyebrow="Ticket Detail" title={display(registration.ticketCode, 'Unassigned ticket')} description={activeEvent.eventName || 'Selected event'}>
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="qr-code-outline" size={25} color={colors.primary} accessibilityLabel="Ticket" /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{guestName(registration)}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>{activeEvent.eventName || activeEvent.eventId}</Text>
            </View>
            <Pill tone={registration.checkedIn ? 'warning' : 'success'}>{registration.checkedIn ? 'Checked In' : 'Ready'}</Pill>
          </View>
        </Card>
        <Text style={{ ...typography.caption, color: colors.textSubtle }}>STATUS</Text>
        <Card tone="muted">
          <View style={{ gap: 8 }}>
            <Text style={{ ...typography.body, color: colors.text }}>Ticket: {display(registration.ticketStatus, 'Status unavailable')}</Text>
            <Text style={{ ...typography.body, color: colors.textMuted }}>Check-in: {registration.checkedIn ? 'Complete' : 'Not checked in'}</Text>
            {registration.checkInTime ? <Text style={{ ...typography.body, color: colors.textMuted }}>Checked in at: {display(registration.checkInTime)}</Text> : null}
            <Text style={{ ...typography.body, color: colors.textMuted }}>Registration: {display(registration.registrationStatus, 'Active')}</Text>
          </View>
        </Card>
        <Banner tone="info">Check-in remains authoritative in Scanner and Registration Lookup.</Banner>
      </Section>
    </Screen>
  )
}
