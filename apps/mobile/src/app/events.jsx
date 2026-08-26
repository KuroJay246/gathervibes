import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'

import { Card, EmptyState, Pill, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

export default function EventSelectionScreen() {
  const router = useRouter()
  const { assignedEvents, authInitialized, isAuthorized, signOut, currentRoleLabel } = useAuth()
  const { activeEvent, ready, setActiveEvent } = useActiveEvent()

  if (!authInitialized || !ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (activeEvent?.eventId) return <Redirect href="/home" />

  return (
    <Screen scroll>
      <Section
        eyebrow="Assigned Event"
        title="Event Selection"
        description="This device only opens events confirmed by the same Firestore assignment boundary used by the web scanner and staff routes."
      >
        <Card tone="muted">
          <Text style={{ fontSize: 15, color: '#5c554f' }}>{currentRoleLabel}</Text>
        </Card>

        {assignedEvents.length === 0 ? (
          <EmptyState
            title="No assigned events"
            description="This account signed in successfully, but there are no active staff assignments with readable event records."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {assignedEvents.map((event) => (
              <Card key={event.eventId}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2023' }}>{event.eventName || event.eventId}</Text>
                    <Text style={{ fontSize: 14, color: '#5c554f' }}>{event.eventDate || 'Date not recorded'}{event.location ? ` • ${event.location}` : ''}</Text>
                  </View>
                  <Pill tone="neutral">{event.status || 'scheduled'}</Pill>
                </View>
                <PrimaryButton
                  label="Open Event-Day Home"
                  onPress={async () => {
                    await setActiveEvent(event)
                    router.replace('/home')
                  }}
                  testID={`event-select-open-${event.eventId}`}
                  accessibilityLabel={`event-select-open-${event.eventId}`}
                />
              </Card>
            ))}
          </View>
        )}

        <SecondaryButton label="Sign Out" onPress={() => void signOut()} testID="event-select-sign-out-button" accessibilityLabel="event-select-sign-out-button" />
      </Section>
    </Screen>
  )
}
