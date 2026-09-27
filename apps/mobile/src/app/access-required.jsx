import { Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import { Banner, PrimaryButton, Screen, Section, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'

export default function AccessRequiredScreen() {
  const { authState, authError, isAuthorized, loading, retryAccess, signOut } = useAuth()

  if (isAuthorized) return <Redirect href="/" />

  const denied = authState === 'access-denied' || authError === 'auth/unapproved-account'
  return (
    <Screen scroll contentStyle={{ justifyContent: 'center' }}>
      <Section
        eyebrow={denied ? 'Access denied' : 'Access required'}
        title={denied ? 'This workspace is private.' : 'Your access needs review.'}
        description={denied ? 'This Google account is not approved for Gather & Savor staff access.' : 'Your identity was confirmed, but staff access could not be verified right now.'}
      >
        <Banner tone={denied ? 'danger' : 'warning'}>
          {denied ? 'Sign in with the approved staff account or contact the workspace owner.' : 'Check your connection and try the access check again.'}
        </Banner>
        <View style={{ gap: spacing.sm }}>
          {!denied ? <PrimaryButton label={loading ? 'Checking access…' : 'Retry access check'} onPress={() => void retryAccess()} disabled={loading} /> : null}
          <SecondaryButton label="Sign out" onPress={() => void signOut()} disabled={loading} />
        </View>
        <Text style={{ ...typography.caption, color: colors.textSubtle }}>No event data was changed.</Text>
      </Section>
    </Screen>
  )
}
