import { useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { Banner, GoogleSignInButton, Screen } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'

function authMessage(code) {
  const messages = {
    'auth/network-request-failed': 'Could not reach Firebase Auth. Check the connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/cancelled-by-user': 'Google sign-in was cancelled. Nothing changed.',
    'auth/google-configuration-missing': 'Google sign-in still needs the Android signing fingerprint registered for this app.',
    'auth/google-token-missing': 'Google sign-in did not return a valid identity token. Try again.',
    'auth/access-check-failed': 'Sign-in succeeded, but mobile access could not confirm the Gather & Savor workspace boundary.',
    'auth/unapproved-account': 'This account is not approved for the private Gather & Savor workspace.',
  }

  return messages[code] || 'Sign-in failed.'
}

export default function SignInScreen() {
  const { authInitialized, authState, defaultRoute, isAuthorized, loading, signInWithGoogle, authError } = useAuth()
  const [localError, setLocalError] = useState('')

  const errorMessage = useMemo(() => {
    if (!authError && !isAuthorized) return ''
    return localError || authMessage(authError)
  }, [authError, isAuthorized, localError])

  if (authInitialized && isAuthorized) return <Redirect href={defaultRoute === '/scanner' ? '/scanner' : '/home'} />
  if (authInitialized && (authState === 'access-denied' || authState === 'access-required')) return <Redirect href="/access-required" />

  async function handleSignIn() {
    setLocalError('')
    try {
      await signInWithGoogle()
    } catch (error) {
      setLocalError(authMessage(error?.code))
    }
  }

  return (
    <Screen contentStyle={{ paddingHorizontal: 0, paddingVertical: 0, gap: 0 }}>
      <View style={{ flex: 0.88, minHeight: 300, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, justifyContent: 'space-between' }}>
        <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text accessibilityLabel="Gather and Savor" style={{ fontSize: 36, lineHeight: 40, fontWeight: '700', color: colors.primary }}>&amp;</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.caption, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.surface }}>Gather &amp; Savor</Text>
          <Text style={{ ...typography.title, color: colors.surface }}>Event operations, in one place.</Text>
        </View>
      </View>
      <View style={{ flex: 1.12, minHeight: 420, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, gap: spacing.lg, justifyContent: 'center' }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.display, color: colors.text }}>Welcome to Event Hub</Text>
          <Text style={{ ...typography.body, color: colors.textMuted }}>Sign in with your approved Gather &amp; Savor account.</Text>
        </View>
        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
        <GoogleSignInButton loading={loading} onPress={handleSignIn} testID="google-sign-in-button" accessibilityLabel="Continue with Google" />
        <Text style={{ ...typography.caption, color: colors.textSubtle }}>Private workspace for authorized staff.</Text>
      </View>
    </Screen>
  )
}
