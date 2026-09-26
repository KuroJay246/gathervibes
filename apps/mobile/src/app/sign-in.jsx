import { useMemo, useState } from 'react'
import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'

import { Banner, Card, PrimaryButton, Screen, SecondaryButton, Section } from '@/components/ui'
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
  const router = useRouter()
  const { authInitialized, defaultRoute, isAuthorized, loading, signInWithGoogle, authError } = useAuth()
  const [localError, setLocalError] = useState('')

  const errorMessage = useMemo(() => {
    if (!authError && !isAuthorized) return ''
    return localError || authMessage(authError)
  }, [authError, isAuthorized, localError])

  if (authInitialized && isAuthorized) return <Redirect href={defaultRoute === '/scanner' ? '/scanner' : '/home'} />

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
      <Section
        eyebrow="Gather & Savor"
        title="Secure staff access"
        description="Private event operations for approved team members."
      >
        <Card>
          <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}>
            <View style={{ width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Text accessibilityLabel="Google" style={{ ...typography.title, color: colors.primary }}>G</Text>
            </View>
            <Text style={{ ...typography.body, color: colors.textMuted, textAlign: 'center' }}>
              Sign in with your approved Google account to continue.
            </Text>
          </View>
          {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
          <PrimaryButton
            label={loading ? 'Opening Google…' : 'Continue with Google'}
            onPress={handleSignIn}
            disabled={loading}
            testID="google-sign-in-button"
            accessibilityLabel="Continue with Google"
          />
        </Card>

        <Banner tone="info">
          Private access for approved team members.
        </Banner>

        <SecondaryButton label="Back to Start" onPress={() => router.replace('/')} testID="sign-in-back-button" accessibilityLabel="sign-in-back-button" />
      </Section>
    </Screen>
  )
}
