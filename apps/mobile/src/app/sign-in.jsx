import { useMemo, useState } from 'react'
import { Redirect, useRouter } from 'expo-router'

import { Banner, Card, Field, PrimaryButton, Screen, SecondaryButton, Section } from '@/components/ui'
import { useAuth } from '@/providers/useAuth'

function authMessage(code) {
  const messages = {
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'Could not reach Firebase Auth. Check the connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/access-check-failed': 'Sign-in succeeded, but mobile access could not confirm the Gather & Savor workspace boundary.',
    'auth/unapproved-account': 'This account is not approved for the private Gather & Savor workspace.',
  }

  return messages[code] || 'Sign-in failed.'
}

export default function SignInScreen() {
  const router = useRouter()
  const { authInitialized, defaultRoute, isAuthorized, loading, signIn, authError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const errorMessage = useMemo(() => {
    if (!authError && !isAuthorized) return ''
    return localError || authMessage(authError)
  }, [authError, isAuthorized, localError])

  if (authInitialized && isAuthorized) return <Redirect href={defaultRoute === '/scanner' ? '/scanner' : '/home'} />

  async function handleSignIn() {
    setLocalError('')
    try {
      await signIn(email, password)
    } catch (error) {
      setLocalError(authMessage(error?.code))
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: 16 }}>
      <Section
        eyebrow="Private Staff Tool"
        title="Secure Sign In"
        description="Use the same approved Firebase account that can enter the private Gather & Savor workspace."
      >
        <Card>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="approved.account@example.com"
            autoCapitalize="none"
            testID="sign-in-email-input"
            accessibilityLabel="sign-in-email-input"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            testID="sign-in-password-input"
            accessibilityLabel="sign-in-password-input"
          />
          {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
          <PrimaryButton
            label={loading ? 'Signing In…' : 'Sign In'}
            onPress={handleSignIn}
            disabled={loading || !email.trim() || !password}
            testID="sign-in-submit-button"
            accessibilityLabel="sign-in-submit-button"
          />
        </Card>

        <Banner tone="info">
          Sign in with an approved Gather &amp; Savor account. Access is checked again after authentication.
        </Banner>

        <SecondaryButton label="Back to Start" onPress={() => router.replace('/')} testID="sign-in-back-button" accessibilityLabel="sign-in-back-button" />
      </Section>
    </Screen>
  )
}
