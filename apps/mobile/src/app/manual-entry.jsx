import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { Banner, Card, Field, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { completeCheckIn, recordDuplicateCheckInAttempt } from '@/services/checkin'
import { findRegistrationByTicketCode, subscribeToRegistrations } from '@/services/registrations'
import { canCompleteCheckIn } from '@gsv/contracts/ticketUtils'
import { parseQrTicketCode } from '@gsv/contracts/qrTicketUtils'

export default function ManualEntryScreen() {
  const networkState = useNetworkState()
  const { authInitialized, isAuthorized, user } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [ticketInput, setTicketInput] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToRegistrations(activeEvent.eventId, setRegistrations, (nextError) => setError(nextError?.message || 'Registrations could not be loaded.'))
  }, [activeEvent?.eventId])

  const parsed = useMemo(() => parseQrTicketCode(ticketInput), [ticketInput])
  const registration = useMemo(() => findRegistrationByTicketCode(registrations, parsed.ticketCode), [parsed.ticketCode, registrations])
  const canCheckInState = registration ? canCompleteCheckIn(registration) : { allowed: false, reason: '' }
  const online = networkState.isInternetReachable ?? networkState.isConnected

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  async function handleCheckIn() {
    if (!registration || !canCheckInState.allowed) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await completeCheckIn(registration, user, { networkConnected: online !== false })
      setMessage(`${registration.fullName || 'Guest'} checked in successfully.`)
      setTicketInput('')
    } catch (nextError) {
      setError(nextError?.message || 'Check-in failed. No local success state was applied.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    if (!registration) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await recordDuplicateCheckInAttempt(registration, user, { networkConnected: online !== false })
      setMessage('Duplicate attempt recorded. No new check-in was saved.')
    } catch (nextError) {
      setError(nextError?.message || 'Duplicate attempt could not be recorded.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen scroll>
      <Section
        eyebrow="Manual Entry"
        title="Manual Ticket Code"
        description="Use the same ticket code contract as the QR payload: GSV:TICKET:{ticketCode}."
      >
        <Card>
          <Field label="Ticket code" value={ticketInput} onChangeText={setTicketInput} placeholder="GSV-ABC123 or GSV:TICKET:GSV-ABC123" autoCapitalize="characters" />
          {parsed.error && ticketInput.trim() ? <Banner tone="warning">{parsed.error}</Banner> : null}
        </Card>

        {error ? <Banner tone="danger">{error}</Banner> : null}
        {message ? <Banner tone="success">{message}</Banner> : null}

        {registration ? (
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>{registration.fullName || registration.buyerName || 'Guest'}</Text>
            <Text style={{ color: '#5c554f' }}>{registration.ticketCode || parsed.ticketCode}</Text>
            {registration.checkedIn ? (
              <SecondaryButton label="Record Duplicate Attempt" onPress={handleDuplicate} disabled={saving} />
            ) : (
              <PrimaryButton label="Authoritative Check-In" onPress={handleCheckIn} disabled={saving || !canCheckInState.allowed} />
            )}
            {!registration.checkedIn && !canCheckInState.allowed ? <Banner tone="warning">{canCheckInState.reason}</Banner> : null}
          </Card>
        ) : ticketInput.trim() && !parsed.error ? (
          <Banner tone="danger">No event-scoped registration matched that ticket code.</Banner>
        ) : null}
      </Section>
    </Screen>
  )
}
