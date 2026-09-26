import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { colors } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'
import { isApprovedAdmin } from '@gsv/contracts/accessRoles'

function TabIcon({ name, color }) {
  return <Ionicons name={name} size={22} color={color} />
}

export default function AppLayout() {
  const { access } = useAuth()
  const scannerOnly = access?.role === 'scanner' && !isApprovedAdmin(access)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon name="home-outline" color={color} /> }} />
      <Tabs.Screen name="lookup" options={{ title: 'Guests', tabBarIcon: ({ color }) => <TabIcon name="people-outline" color={color} />, href: scannerOnly ? null : '/lookup' }} />
      <Tabs.Screen name="scanner" options={{ title: 'Scan', tabBarAccessibilityLabel: 'Scan', tabBarButtonTestID: 'tab-scan', tabBarIcon: ({ color }) => <TabIcon name="scan-outline" color={color} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <TabIcon name="checkbox-outline" color={color} />, href: scannerOnly ? null : '/tasks' }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color }) => <TabIcon name="ellipsis-horizontal-circle-outline" color={color} />, href: scannerOnly ? null : '/more' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  )
}
