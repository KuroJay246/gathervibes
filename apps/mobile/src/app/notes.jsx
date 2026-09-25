import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, Card, EmptyState, Metric, Pill, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToDocuments } from '@/services/documents'
import { subscribeToOperationsLedger } from '@/services/operations'

export default function NotesScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [documents, setDocuments] = useState([])
  const [operations, setOperations] = useState([])
  const [operationsError, setOperationsError] = useState('')

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    const unsubscribeDocuments = subscribeToDocuments(activeEvent.eventId, setDocuments, () => {})
    const unsubscribeOperations = subscribeToOperationsLedger(activeEvent.eventId, setOperations, (nextError) => setOperationsError(nextError?.message || 'Operations could not be loaded.'))
    return () => { unsubscribeDocuments(); unsubscribeOperations() }
  }, [activeEvent?.eventId])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Operations"
        title="Event operations"
        description="A compact read-only view of the selected event's commitments, ledger context, and operational references."
      >
        {operationsError ? <Banner tone="danger">{operationsError}</Banner> : null}
        <Card tone="muted">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><AppIcon name="receipt-outline" size={20} color={colors.primary} accessibilityLabel="Operations" /><Text style={{ ...typography.section, color: colors.text }}>Ledger snapshot</Text></View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Metric label="Entries" value={operations.length} />
            <Metric label="Open" value={operations.filter((entry) => ['expected', 'pending'].includes(entry.status)).length} />
            <Metric label="Paid / received" value={operations.filter((entry) => ['paid', 'received'].includes(entry.status)).length} />
          </View>
          {operations.slice(0, 4).map((entry) => <View key={entry.ledgerEntryId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}><AppIcon name={entry.status === 'pending' || entry.status === 'expected' ? 'time-outline' : 'checkmark-circle-outline'} size={18} color={entry.status === 'pending' || entry.status === 'expected' ? colors.warning : colors.success} accessibilityLabel="Ledger status" /><Text style={{ ...typography.body, color: colors.text, flex: 1 }}>{entry.label || 'Ledger entry'}</Text><Pill tone={entry.status === 'pending' || entry.status === 'expected' ? 'warning' : 'success'}>{entry.status || 'unknown'}</Pill></View>)}
          {operations.length === 0 ? <Text style={{ ...typography.body, color: colors.textMuted }}>No operations ledger entries are visible for this event.</Text> : null}
        </Card>

        <Section eyebrow="References" title="Notes and documents">
        {documents.length === 0 ? (
          <EmptyState title="No document references" description="The selected event does not have visible document references yet." />
        ) : (
          documents.map((documentRecord) => (
            <Card key={documentRecord.documentId}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2023' }}>{documentRecord.title || 'Untitled document'}</Text>
              <Text style={{ color: '#5c554f' }}>{documentRecord.status || 'Unknown status'}{documentRecord.category ? ` • ${documentRecord.category}` : ''}</Text>
              {documentRecord.description ? <Text style={{ color: '#4f4842', lineHeight: 20 }}>{documentRecord.description}</Text> : null}
              {documentRecord.notes ? <Text style={{ color: '#4f4842', lineHeight: 20 }}>{documentRecord.notes}</Text> : null}
              {documentRecord.url ? <Text style={{ color: '#7c3144', lineHeight: 20 }}>{documentRecord.url}</Text> : null}
            </Card>
          ))
        )}
        </Section>
      </Section>
    </Screen>
  )
}
