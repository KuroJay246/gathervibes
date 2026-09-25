import { useEffect, useMemo, useState } from 'react'
import { AppState } from 'react-native'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useNetworkState } from 'expo-network'

import { AppIcon, Banner, Card, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { completeCheckIn, recordDuplicateCheckInAttempt } from '@/services/checkin'
import { findRegistrationByTicketCode, subscribeToRegistrations } from '@/services/registrations'
import { canCompleteCheckIn } from '@gsv/contracts/ticketUtils'
import { parseQrTicketCode } from '@gsv/contracts/qrTicketUtils'

export default function ScannerScreen() {
  const networkState = useNetworkState()
  const { authInitialized, isAuthorized, user } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [permission, requestPermission] = useCameraPermissions()
  const [registrations, setRegistrations] = useState([])
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [scanEnabled, setScanEnabled] = useState(true)
  const [appState, setAppState] = useState(AppState.currentState)
  const online = networkState.isInternetReachable ?? networkState.isConnected

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState)
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (permission?.granted) return
    if (permission === null || permission?.canAskAgain) {
      void requestPermission()
    }
  }, [permission, requestPermission])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToRegistrations(activeEvent.eventId, setRegistrations, (nextError) => setError(nextError?.message || 'Registrations could not be loaded.'))
  }, [activeEvent?.eventId])

  const checkInState = useMemo(() => selectedRegistration ? canCompleteCheckIn(selectedRegistration) : { allowed: false, reason: '' }, [selectedRegistration])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  function resetSelection(nextMessage = 'Ready for the next guest.') {
    setSelectedRegistration(null)
    setScanEnabled(true)
    setMessage(nextMessage)
    setError('')
  }

  function handleBarcodeScanned({ data }) {
    if (appState !== 'active' || !scanEnabled) return
    const parsed = parseQrTicketCode(data)
    if (parsed.error) {
      setError(parsed.error)
      setScanEnabled(false)
      return
    }

    const registration = findRegistrationByTicketCode(registrations, parsed.ticketCode)
    if (!registration) {
      setError('This QR code does not match a registration for the selected event.')
      setScanEnabled(false)
      return
    }

    setSelectedRegistration(registration)
    setScanEnabled(false)
    setError('')
    setMessage(`${registration.fullName || 'Guest'} loaded from QR scan.`)
  }

  async function handleCheckIn() {
    if (!selectedRegistration || !checkInState.allowed) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await completeCheckIn(selectedRegistration, user, { networkConnected: online !== false })
      resetSelection(`${selectedRegistration.fullName || 'Guest'} checked in successfully.`)
    } catch (nextError) {
      setError(nextError?.message || 'Check-in failed. No local success state was applied.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate() {
    if (!selectedRegistration) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await recordDuplicateCheckInAttempt(selectedRegistration, user, { networkConnected: online !== false })
      setMessage('Duplicate attempt recorded. Check-in remains blocked.')
    } catch (nextError) {
      setError(nextError?.message || 'Duplicate attempt could not be recorded.')
    } finally {
      setSaving(false)
    }
  }

  const permissionDenied = permission && !permission.granted

  return (
    <Screen scroll>
      <Section
        eyebrow="QR Scanner"
        title="Scanner Mode"
        description="Scan a ticket, confirm the guest, and move to the next check-in without leaving this flow."
      >
        {!online ? <Banner tone="warning">The camera can still scan offline, but final check-in stays blocked until the device has a live connection.</Banner> : null}
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {message ? <Banner tone="success">{message}</Banner> : null}

        {permissionDenied ? (
          <Card tone="muted">
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>Camera access denied</Text>
            <Text style={{ color: '#5c554f', lineHeight: 20 }}>
              The app still supports manual entry. Re-enable camera access in system settings when you want QR scanning back.
            </Text>
            <SecondaryButton label="Retry Permission" onPress={() => void requestPermission()} testID="scanner-retry-permission-button" accessibilityLabel="scanner-retry-permission-button" />
          </Card>
        ) : (
          <Card>
            <View style={{ overflow: 'hidden', borderRadius: 8, minHeight: 320 }}>
              <CameraView
                style={{ minHeight: 320 }}
                facing="back"
                active={appState === 'active' && scanEnabled}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={handleBarcodeScanned}
              />
            </View>
          </Card>
        )}

        {selectedRegistration ? (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="person-outline" size={22} color={colors.primary} accessibilityLabel="Scanned guest" />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={{ ...typography.section, color: colors.text }}>{selectedRegistration.fullName || selectedRegistration.buyerName || 'Guest'}</Text>
                <Text style={{ ...typography.body, color: colors.textMuted }}>{selectedRegistration.ticketCode || 'No ticket code'}</Text>
              </View>
              <Pill tone={selectedRegistration.checkedIn ? 'warning' : 'success'}>{selectedRegistration.checkedIn ? 'Checked In' : 'Ready'}</Pill>
            </View>
            {selectedRegistration.checkedIn ? (
              <SecondaryButton label="Record Duplicate Attempt" onPress={handleDuplicate} disabled={saving} testID="scanner-duplicate-button" accessibilityLabel="scanner-duplicate-button" />
            ) : (
              <PrimaryButton label="Authoritative Check-In" onPress={handleCheckIn} disabled={saving || !checkInState.allowed} testID="scanner-checkin-button" accessibilityLabel="scanner-checkin-button" />
            )}
            {!selectedRegistration.checkedIn && !checkInState.allowed ? <Banner tone="warning">{checkInState.reason}</Banner> : null}
            <SecondaryButton label="Scan Next Guest" onPress={() => resetSelection()} disabled={saving} testID="scanner-next-button" accessibilityLabel="scanner-next-button" />
          </Card>
        ) : (
          <Card tone="muted">
            <Text style={{ color: '#5c554f', lineHeight: 20 }}>
              Keep the QR code inside the camera frame. This app only trusts the shared ticket format and still confirms the final state from Firestore before reporting success.
            </Text>
          </Card>
        )}
      </Section>
    </Screen>
  )
}
