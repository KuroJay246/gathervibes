import { useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { AppIcon, Banner, GoogleSignInButton, Screen } from '@/components/ui'
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
    <Screen scroll contentStyle={{ gap: spacing.xxl }}>
      <View style={{ gap: spacing.lg, paddingTop: spacing.xxl }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text accessibilityLabel="Gather and Savor" style={{ fontSize: 32, lineHeight: 36, fontWeight: '700', color: colors.surface }}>&amp;</Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ ...typography.caption, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.primary }}>Gather &amp; Savor</Text>
          <Text style={{ ...typography.display, color: colors.text }}>Welcome to Event Hub</Text>
          <Text style={{ ...typography.body, color: colors.textMuted, maxWidth: 420 }}>Run guests, check-in and event-day operations from one place.</Text>
        </View>
      </View>
      <View style={{ gap: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppIcon name="lock-closed-outline" size={18} color={colors.primary} accessibilityLabel="Secure staff access" />
          <Text style={{ ...typography.label, color: colors.text }}>Approved staff access</Text>
        </View>
        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
        <GoogleSignInButton loading={loading} onPress={handleSignIn} testID="google-sign-in-button" accessibilityLabel="Continue with Google" />
        <Text style={{ ...typography.caption, color: colors.textSubtle }}>Use your approved Google account. You can choose another account or add one from the Google sign-in screen.</Text>
      </View>
    </Screen>
  )
}
