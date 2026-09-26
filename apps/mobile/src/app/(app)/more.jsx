import { Redirect, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { AppIcon, Card, Screen, Section } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { useActiveEvent } from '@/providers/useActiveEvent'

export default function MoreScreen() {
  const router = useRouter()
  const { isAuthorized, access } = useAuth()
  const { activeEvent, ready } = useActiveEvent()

  if (!ready) return null
  if (!isAuthorized) return <Redirect href="/sign-in" />
  if (!activeEvent?.eventId) return <Redirect href="/events" />
  if (access?.role === 'scanner' && !access?.protectedOwner && !access?.isAdmin) return <Redirect href="/scanner" />

  const destinations = [
    ['time-outline', 'Run of Show', 'Event-day timeline', '/run-of-show'],
    ['briefcase-outline', 'Operations', 'Commitments and readiness', '/operations'],
    ['people-outline', 'Event Contacts', 'People and organizations', '/contacts'],
    ['bar-chart-outline', 'Reports', 'Compact event summaries', '/reports'],
    ['settings-outline', 'Settings', 'Account and app preferences', '/settings'],
    ['document-text-outline', 'Operational Notes', 'Read-only event notes', '/notes'],
  ]

  return (
    <Screen scroll>
      <Section eyebrow="Workspace" title="More" description="Planning and administration for the selected event.">
        <Card tone="muted">
          <Text style={{ ...typography.caption, color: colors.textSubtle }}>WORKING EVENT</Text>
          <Text accessibilityRole="header" style={{ ...typography.section, color: colors.text }}>{activeEvent.eventName || 'Working event'}</Text>
        </Card>
        <View style={{ gap: 1 }}>
          {destinations.map(([icon, label, description, route]) => (
            <Pressable
              key={route}
              onPress={() => router.push(route)}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, backgroundColor: pressed ? colors.surfaceMuted : 'transparent', borderBottomWidth: 1, borderBottomColor: colors.border })}
            >
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name={icon} size={21} color={colors.primary} accessibilityLabel={label} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...typography.label, color: colors.text }}>{label}</Text>
                <Text style={{ ...typography.caption, color: colors.textMuted }}>{description}</Text>
              </View>
              <AppIcon name="chevron-forward-outline" size={19} color={colors.textSubtle} accessibilityLabel={`Open ${label}`} />
            </Pressable>
          ))}
        </View>
      </Section>
    </Screen>
  )
}
