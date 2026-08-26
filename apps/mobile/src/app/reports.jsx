import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { View } from 'react-native'

import { Metric, Screen, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToRegistrations } from '@/services/registrations'
import { normalizePaymentStatus } from '@gsv/contracts/paymentStatus'

export default function ReportsScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToRegistrations(activeEvent.eventId, setRegistrations, () => {})
  }, [activeEvent?.eventId])

  const paid = useMemo(() => registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'paid').length, [registrations])
  const pending = useMemo(() => registrations.filter((registration) => normalizePaymentStatus(registration.paymentStatus) === 'pending').length, [registrations])
  const door = useMemo(() => registrations.filter((registration) => ['door', 'door-list'].includes(normalizePaymentStatus(registration.paymentStatus))).length, [registrations])
  const checkedIn = useMemo(() => registrations.filter((registration) => registration.checkedIn).length, [registrations])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Limited Reports"
        title="Reports"
        description="This mobile report surface stays narrow: registration, payment-status, and check-in totals for the currently selected event only."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Registrations" value={registrations.length} />
          <Metric label="Checked In" value={checkedIn} />
          <Metric label="Paid" value={paid} />
          <Metric label="Pending" value={pending} />
          <Metric label="Door" value={door} />
          <Metric label="Not Checked In" value={Math.max(registrations.length - checkedIn, 0)} />
        </View>
      </Section>
    </Screen>
  )
}
