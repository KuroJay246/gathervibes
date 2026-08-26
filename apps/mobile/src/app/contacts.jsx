import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text } from 'react-native'

import { Card, EmptyState, Screen, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToContacts, subscribeToEventContactLinks, subscribeToOrganizations } from '@/services/contacts'

export default function ContactsScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [contacts, setContacts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [links, setLinks] = useState([])

  useEffect(() => {
    const unsubscribeContacts = subscribeToContacts(setContacts, () => {})
    const unsubscribeOrganizations = subscribeToOrganizations(setOrganizations, () => {})
    return () => {
      unsubscribeContacts()
      unsubscribeOrganizations()
    }
  }, [])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined
    return subscribeToEventContactLinks(activeEvent.eventId, setLinks, () => {})
  }, [activeEvent?.eventId])

  const contactsById = useMemo(() => new Map(contacts.map((contact) => [contact.contactId, contact])), [contacts])
  const organizationsById = useMemo(() => new Map(organizations.map((organization) => [organization.organizationId, organization])), [organizations])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Event Contacts"
        title="Contacts"
        description="Business contacts and organizations stay separate from login access. This screen shows only the selected event’s linked relationships."
      >
        {links.length === 0 ? (
          <EmptyState title="No event-linked contacts" description="No contacts or organizations are linked to the selected event yet." />
        ) : (
          links.map((link) => {
            const contact = contactsById.get(link.contactId)
            const organization = organizationsById.get(link.organizationId)
            return (
              <Card key={link.linkId}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#1f2023' }}>{contact?.displayName || organization?.name || 'Relationship'}</Text>
                <Text style={{ color: '#5c554f' }}>{link.roleForEvent || link.relationshipType || 'Event relationship'}</Text>
                {organization?.name ? <Text style={{ color: '#4f4842' }}>{organization.name}</Text> : null}
                {contact?.email ? <Text style={{ color: '#4f4842' }}>{contact.email}</Text> : null}
                {contact?.phone ? <Text style={{ color: '#4f4842' }}>{contact.phone}</Text> : null}
                {link.notes ? <Text style={{ color: '#4f4842', lineHeight: 20 }}>{link.notes}</Text> : null}
              </Card>
            )
          })
        )}
      </Section>
    </Screen>
  )
}
