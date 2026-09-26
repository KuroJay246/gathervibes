import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Field, Metric, Pill, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToOperationsLedger } from '@/services/operations'

const CLOSED_STATUSES = new Set(['paid', 'received', 'cancelled'])

function money(value) {
  return new Intl.NumberFormat('en-BB', { style: 'currency', currency: 'BBD', maximumFractionDigits: 2 }).format(Number(value || 0))
}

function labelFor(value) {
  return String(value || 'pending').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function OperationsScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToOperationsLedger(activeEvent.eventId, (rows) => {
      setEntries(rows)
      setLoaded(true)
    }, (nextError) => {
      setError(nextError?.message || 'Operations could not be loaded.')
      setLoaded(true)
    })
  }, [activeEvent?.eventId])

  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return entries
    return entries.filter((entry) => [entry.label, entry.category, entry.paidByOrPaidTo, entry.status].filter(Boolean).join(' ').toLowerCase().includes(normalized))
  }, [entries, query])
  const openEntries = useMemo(() => entries.filter((entry) => !CLOSED_STATUSES.has(entry.status)), [entries])
  const outstanding = useMemo(() => openEntries.reduce((total, entry) => total + Number(entry.amount || 0), 0), [openEntries])
  const urgent = useMemo(() => openEntries.filter((entry) => entry.status === 'pending' || entry.status === 'expected'), [openEntries])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section eyebrow="Event Operations" title="What needs attention" description="A compact view of commitments and ledger activity for the selected event. Registration Payments stay separate.">
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <AppIcon name="briefcase-outline" size={23} color={colors.primary} accessibilityLabel="Operations" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...typography.section, color: colors.text }}>{activeEvent.eventName || 'Working Event'}</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>Open items remain visible until their status is settled.</Text>
            </View>
            <Pill tone={urgent.length ? 'warning' : 'success'}>{urgent.length ? `${urgent.length} open` : 'Clear'}</Pill>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <Metric label="Open Items" value={openEntries.length} detail={`${entries.length} total`} />
          <Metric label="Outstanding" value={money(outstanding)} detail="Ledger amount" />
        </View>

        <Field label="Search operations" value={query} onChangeText={setQuery} placeholder="Supplier, commitment, status" autoCapitalize="none" accessibilityLabel="operations-search-input" />
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {!loaded ? <Banner>Loading event operations…</Banner> : null}
        {loaded && !error && entries.length === 0 ? <EmptyState title="No operations recorded" description="Commitments, supplier follow-ups, and ledger activity will appear here when they are added from the organizer workspace." /> : null}
        {loaded && !error && entries.length > 0 && visibleEntries.length === 0 ? <EmptyState title="No matching operations" description="Try a different supplier, label, or status." /> : null}

        <View style={{ gap: 10 }}>
          {visibleEntries.map((entry) => (
            <Card key={entry.ledgerEntryId} tone={CLOSED_STATUSES.has(entry.status) ? 'muted' : 'default'}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name={entry.status === 'pending' ? 'alert-circle-outline' : 'receipt-outline'} size={20} color={entry.status === 'pending' ? colors.warning : colors.primary} accessibilityLabel="Operation status" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text selectable style={{ ...typography.section, color: colors.text }}>{entry.label || 'Operations entry'}</Text>
                  <Text style={{ ...typography.body, color: colors.textMuted }}>{entry.category || 'General'}{entry.paidByOrPaidTo ? ` • ${entry.paidByOrPaidTo}` : ''}</Text>
                </View>
                <Pill tone={CLOSED_STATUSES.has(entry.status) ? 'neutral' : entry.status === 'pending' ? 'warning' : 'success'}>{labelFor(entry.status)}</Pill>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                <Text selectable style={{ ...typography.body, color: colors.textMuted }}>{entry.date || 'Date not recorded'}</Text>
                <Text selectable style={{ ...typography.section, color: colors.text }}>{money(entry.amount)}</Text>
              </View>
              {entry.notes ? <Text selectable style={{ ...typography.caption, color: colors.textSubtle }}>{entry.notes}</Text> : null}
            </Card>
          ))}
        </View>
      </Section>
    </Screen>
  )
}
