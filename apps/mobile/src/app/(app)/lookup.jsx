import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'
import { useNetworkState } from 'expo-network'

import { AppIcon, Banner, Card, EmptyState, Field, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { completeCheckIn, recordDuplicateCheckInAttempt, undoCheckIn } from '@/services/checkin'
import { loadRegistrationPage, searchRegistrations } from '@/services/registrations'
import { canCompleteCheckIn, checkInWarnings } from '@gsv/contracts/ticketUtils'
import { formatPaymentLabel } from '@gsv/contracts/paymentStatus'
import { isApprovedAdmin } from '@gsv/contracts/accessRoles'
import { createRequestVersion } from '@gsv/contracts'

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
  const [visibleMatches, setVisibleMatches] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingPage, setLoadingPage] = useState(false)
  const requestVersion = useMemo(() => createRequestVersion(), [])

  useEffect(() => {
    let cancelled = false
    if (!activeEvent?.eventId) return undefined
    Promise.resolve().then(() => {
      if (cancelled) return
      setRegistrations([])
      setCursor(null)
      setHasMore(false)
      setLoadingPage(true)
    })
    loadRegistrationPage(activeEvent.eventId)
      .then((page) => {
        if (cancelled) return
        setRegistrations(page.registrations)
        setCursor(page.cursor)
        setHasMore(page.hasMore)
      })
      .catch((error) => { if (!cancelled) setActionError(error?.message || 'Registrations could not be loaded.') })
      .finally(() => { if (!cancelled) setLoadingPage(false) })
    return () => { cancelled = true }
  }, [activeEvent?.eventId])

  useEffect(() => {
    const requestId = requestVersion.next()
    const searchedMatches = searchRegistrations(registrations, queryText, 100)
    const nextMatches = searchedMatches.filter((registration) => {
      if (statusFilter === 'checked-in') return registration.checkedIn
      if (statusFilter === 'ready') return !registration.checkedIn
      return true
    }).slice(0, 20)
    Promise.resolve().then(() => {
      if (requestVersion.isCurrent(requestId)) setVisibleMatches(nextMatches)
    })
    return undefined
  }, [queryText, registrations, requestVersion, statusFilter])
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

  async function loadMore() {
    if (!activeEvent?.eventId || !cursor || !hasMore || loadingPage) return
    setLoadingPage(true)
    setActionError('')
    try {
      const page = await loadRegistrationPage(activeEvent.eventId, { cursor })
      setRegistrations((current) => [...current, ...page.registrations])
      setCursor(page.cursor)
      setHasMore(page.hasMore)
    } catch (error) {
      setActionError(error?.message || 'More registrations could not be loaded.')
    } finally {
      setLoadingPage(false)
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
          <View style={{ gap: 8 }}>
            <Text style={{ ...typography.caption, color: colors.textMuted }}>Show</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['all', 'All guests'],
                ['ready', 'Ready'],
                ['checked-in', 'Checked in'],
              ].map(([value, label]) => value === statusFilter ? (
                <PrimaryButton key={value} label={label} onPress={() => setStatusFilter(value)} accessibilityLabel={`Show ${label}`} />
              ) : (
                <SecondaryButton key={value} label={label} onPress={() => setStatusFilter(value)} accessibilityLabel={`Show ${label}`} />
              ))}
            </View>
          </View>
        </Card>

        {actionError ? <Banner tone="danger">{actionError}</Banner> : null}
        {message ? <Banner tone="success">{message}</Banner> : null}

        {!queryText.trim() ? (
          <EmptyState title={loadingPage ? 'Loading guests' : 'Start typing'} description="Search the selected event. Results stay bounded and can be loaded in pages." />
        ) : (
          <View style={{ gap: 12 }}>
            {visibleMatches.map((registration) => (
              <Card key={registration.registrationId} tone="muted">
                {(() => {
                  const warnings = checkInWarnings(registration)
                  const checkInState = canCompleteCheckIn(registration)
                  return (
                    <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon name="person-outline" size={20} color={colors.primary} accessibilityLabel="Guest" />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ ...typography.section, color: colors.text }}>{registrationName(registration)}</Text>
                    <Text style={{ ...typography.body, color: colors.textMuted }}>{registration.ticketCode || 'No ticket code'} • {formatPaymentLabel(registration.paymentStatus)}</Text>
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
            {visibleMatches.length === 0 ? <EmptyState title="No matches" description="Nothing in the selected event matched this search." /> : null}
            {hasMore ? <SecondaryButton label={loadingPage ? 'Loading guests…' : 'Load more guests'} onPress={loadMore} disabled={loadingPage} accessibilityLabel="Load more guests" /> : null}
          </View>
        )}
      </Section>
    </Screen>
  )
}
