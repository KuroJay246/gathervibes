import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { Banner, Card, EmptyState, Field, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { completeCheckIn, recordDuplicateCheckInAttempt, undoCheckIn } from '@/services/checkin'
import { searchRegistrations, subscribeToRegistrations } from '@/services/registrations'
import { canCompleteCheckIn, checkInWarnings } from '@gsv/contracts/ticketUtils'
import { formatPaymentLabel } from '@gsv/contracts/paymentStatus'
import { isApprovedAdmin } from '@gsv/contracts/accessRoles'

function registrationName(registration) {
  return registration?.fullName || registration?.buyerName || 'Guest'
}

export default function LookupScreen() {
  const networkState = useNetworkState()
  const { authInitialized, isAuthorized, user, access } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [queryText, setQueryText] = useState('')
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToRegistrations(activeEvent.eventId, setRegistrations, (error) => setActionError(error?.message || 'Registrations could not be loaded.'))
  }, [activeEvent?.eventId])

  const matches = useMemo(() => searchRegistrations(registrations, queryText, 20), [registrations, queryText])
  const canUndo = isApprovedAdmin(access)
  const online = networkState.isInternetReachable ?? networkState.isConnected

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  async function handleCheckIn(registration) {
    const checkInState = canCompleteCheckIn(registration)
    if (!registration || !checkInState.allowed) return
    setSaving(true)
    setActionError('')
    setMessage('')
    try {
      await completeCheckIn(registration, user, { networkConnected: online !== false })
      setMessage(`${registrationName(registration)} checked in successfully.`)
      setQueryText('')
    } catch (error) {
      setActionError(error?.message || 'Check-in failed. No local success state was applied.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate(registration) {
    if (!registration) return
    setSaving(true)
    setActionError('')
    setMessage('')
    try {
      await recordDuplicateCheckInAttempt(registration, user, { networkConnected: online !== false })
      setMessage('Duplicate attempt recorded. Check-in remains blocked.')
    } catch (error) {
      setActionError(error?.message || 'Duplicate attempt could not be recorded.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUndo(registration) {
    if (!registration || !canUndo) return
    setSaving(true)
    setActionError('')
    setMessage('')
    try {
      await undoCheckIn(registration, user, { networkConnected: online !== false })
      setMessage(`Undo Check-In saved for ${registrationName(registration)}.`)
    } catch (error) {
      setActionError(error?.message || 'Undo Check-In failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen scroll>
      <Section
        eyebrow="Guest Search"
        title="Registration Lookup"
        description="Search by guest name, buyer, email, phone, or ticket code within the selected event."
      >
        {online ? null : <Banner tone="warning">Lookup remains usable offline only while the current registration list is cached. Check-in stays blocked.</Banner>}

        <Card>
          <Field
            label="Search"
            value={queryText}
            onChangeText={setQueryText}
            placeholder="Search guest, buyer, or ticket code"
            autoCapitalize="none"
            testID="lookup-search-input"
            accessibilityLabel="lookup-search-input"
          />
        </Card>

        {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
        {message ? <Banner tone="success">{message}</Banner> : null}

        {!queryText.trim() ? (
          <EmptyState title="Start typing" description="This screen shows up to 20 event-scoped matches from the local event-day registration list." />
        ) : (
          <View style={{ gap: 12 }}>
            {matches.map((registration) => (
              <Card key={registration.registrationId}>
                {(() => {
                  const warnings = checkInWarnings(registration)
                  const checkInState = canCompleteCheckIn(registration)
                  return (
                    <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>{registrationName(registration)}</Text>
                    <Text style={{ color: '#5c554f' }}>{registration.ticketCode || 'No ticket code'} • {formatPaymentLabel(registration.paymentStatus)}</Text>
                  </View>
                  <Pill tone={registration.checkedIn ? 'warning' : 'success'}>{registration.checkedIn ? 'Checked In' : 'Ready'}</Pill>
                </View>
                {warnings.length ? (
                  <View style={{ gap: 6 }}>
                    {warnings.map((warning) => <Banner key={warning} tone={/ticket/i.test(warning) ? 'danger' : 'warning'}>{warning}</Banner>)}
                  </View>
                ) : null}
                <View style={{ gap: 10 }}>
                  {registration.checkedIn ? (
                    <SecondaryButton label="Record Duplicate Attempt" onPress={() => handleDuplicate(registration)} disabled={saving} />
                  ) : (
                    <PrimaryButton label="Authoritative Check-In" onPress={() => handleCheckIn(registration)} disabled={saving || !checkInState.allowed} />
                  )}
                  {canUndo && registration.checkedIn ? (
                    <SecondaryButton label="Admin Undo Check-In" onPress={() => handleUndo(registration)} disabled={saving} />
                  ) : null}
                </View>
                {!registration.checkedIn && !checkInState.allowed ? <Banner tone="warning">{checkInState.reason}</Banner> : null}
                    </>
                  )
                })()}
              </Card>
            ))}
            {matches.length === 0 ? <EmptyState title="No matches" description="Nothing in the selected event matched this search." /> : null}
          </View>
        )}
      </Section>
    </Screen>
  )
}
