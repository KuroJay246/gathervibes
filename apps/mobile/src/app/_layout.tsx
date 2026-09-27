// @ts-nocheck
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthProvider } from '@/providers/AuthProvider'
import { useAuth } from '@/providers/useAuth'
import { SelectedEventProvider } from '@/providers/SelectedEventProvider'
import { colors } from '@/design/tokens'

SplashScreen.preventAutoHideAsync().catch(() => {})

function StartupSplashController() {
  const { authInitialized, loading } = useAuth()

  useEffect(() => {
    if (authInitialized && !loading) {
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [authInitialized, loading])

  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StartupSplashController />
          <SelectedEventProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
          </SelectedEventProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
