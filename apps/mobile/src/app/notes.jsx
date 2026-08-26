import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text } from 'react-native'

import { Card, EmptyState, Screen, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToDocuments } from '@/services/documents'

export default function NotesScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [documents, setDocuments] = useState([])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToDocuments(activeEvent.eventId, setDocuments, () => {})
  }, [activeEvent?.eventId])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Operational Notes"
        title="Notes and References"
        description="This first mobile cut exposes event-scoped document references, descriptions, notes, dates, and URLs without adding file upload or OCR behavior."
      >
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
    </Screen>
  )
}
