import { useEffect, useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Linking, Text, View } from 'react-native'

import { AppIcon, EmptyState, Field, IconButton, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'
import { subscribeToContacts, subscribeToEventContactLinks, subscribeToOrganizations } from '@/services/contacts'

export default function ContactsScreen() {
  const { authInitialized, isAuthorized } = useAuth()
  const { activeEvent, ready } = useActiveEvent()
  const [contacts, setContacts] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [links, setLinks] = useState([])
  const [query, setQuery] = useState('')

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
  const visibleLinks = useMemo(() => links.filter((link) => {
    const contact = contactsById.get(link.contactId)
    const organization = organizationsById.get(link.organizationId)
    const haystack = [contact?.displayName, contact?.email, contact?.phone, organization?.name, link.roleForEvent, link.relationshipType].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  }), [contactsById, organizationsById, links, query])

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />

  return (
    <Screen scroll back>
      <Section
        eyebrow="Event Contacts"
        title="Contacts"
        description="People and organizations linked to this event."
      >
        <Field label="Search event contacts" value={query} onChangeText={setQuery} placeholder="Name, organization, role" autoCapitalize="none" rightIcon={<AppIcon name="search-outline" color={colors.textSubtle} accessibilityLabel="Search" />} />
        {links.length === 0 ? (
          <EmptyState title="No event-linked contacts" description="No contacts or organizations are linked to the selected event yet." />
        ) : visibleLinks.length === 0 ? (
          <EmptyState title="No matching contacts" description="Try a different name, organization, or event role." />
        ) : (
          visibleLinks.map((link) => {
            const contact = contactsById.get(link.contactId)
            const organization = organizationsById.get(link.organizationId)
            return (
              <View key={link.linkId} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', minWidth: 0 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><AppIcon name="person-outline" size={21} color={colors.primary} accessibilityLabel="Contact" /></View>
                  <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
                    <Text style={{ ...typography.section, color: colors.text }}>{contact?.displayName || organization?.name || 'Relationship'}</Text>
                    <Text style={{ ...typography.body, color: colors.textMuted }}>{link.roleForEvent || link.relationshipType || 'Event relationship'}</Text>
                    {organization?.name && contact?.displayName ? <Text style={{ ...typography.caption, color: colors.textSubtle }}>{organization.name}</Text> : null}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  {contact?.phone ? <IconButton name="call-outline" label={`Call ${contact.displayName || 'contact'}`} onPress={() => Linking.openURL(`tel:${contact.phone}`)} /> : null}
                  {contact?.email ? <IconButton name="mail-outline" label={`Email ${contact.displayName || 'contact'}`} onPress={() => Linking.openURL(`mailto:${contact.email}`)} /> : null}
                </View>
              </View>
            )
          })
        )}
      </Section>
    </Screen>
  )
}
