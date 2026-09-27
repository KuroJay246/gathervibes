import { useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { Text, View } from 'react-native'

import { Banner, Card, PrimaryButton, Screen, Section } from '@/components/ui'
import { colors, radii, spacing, typography } from '@/design/tokens'
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
    <Screen scroll contentStyle={{ gap: 16 }}>
      <Section eyebrow="Gather & Savor" title="Event Hub" description="Your private workspace for running events.">
        <View style={{ paddingTop: spacing.sm, gap: spacing.sm }}>
          <Text style={{ ...typography.body, color: colors.textMuted }}>Keep guests, check-in and event-day operations moving from one calm workspace.</Text>
        </View>
        <Card>
          <View style={{ gap: spacing.md }}>
            <View style={{ width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text accessibilityLabel="Gather and Savor" style={{ ...typography.title, color: colors.primary }}>G</Text>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text style={{ ...typography.section, color: colors.text }}>Secure staff access</Text>
              <Text style={{ ...typography.body, color: colors.textMuted }}>Sign in with your approved Google account.</Text>
            </View>
          </View>
          {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
          <PrimaryButton
            label={loading ? 'Opening Google…' : 'Continue with Google'}
            onPress={handleSignIn}
            disabled={loading}
            testID="google-sign-in-button"
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
          />
          <Text style={{ ...typography.caption, color: colors.textSubtle, textAlign: 'center' }}>Authorized Gather & Savor staff only.</Text>
        </Card>
      </Section>
    </Screen>
  )
}
