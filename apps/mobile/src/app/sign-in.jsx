import { useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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
    <Screen contentStyle={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.brandMark}>
          <Text accessibilityLabel="Gather and Savor" style={styles.brandAmpersand}>&amp;</Text>
        </View>

        <View pointerEvents="none" accessibilityElementsHidden style={styles.heroIllustration}>
          <View style={[styles.motifNode, styles.motifCalendar]}><Ionicons name="calendar-outline" size={28} color="#F8ECEF" /></View>
          <View style={[styles.motifLine, styles.motifLineHorizontal]} />
          <View style={[styles.motifNode, styles.motifTicket]}><Ionicons name="ticket-outline" size={26} color="#F8ECEF" /></View>
          <View style={[styles.motifLine, styles.motifLineVertical]} />
          <View style={[styles.motifNode, styles.motifScan]}><Ionicons name="scan-outline" size={30} color="#F8ECEF" /></View>
          <View style={[styles.motifDot, styles.motifDotTimeline]} />
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.brandEyebrow}>Gather &amp; Savor</Text>
          <Text style={styles.heroTitle}>Event operations, in one place.</Text>
        </View>
      </View>

      <View style={styles.authPanel}>
        <View style={styles.authCopy}>
          <Text style={styles.authTitle}>Welcome to Event Hub</Text>
          <Text style={styles.authBody}>Sign in with your approved Gather &amp; Savor account.</Text>
        </View>
        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
        <GoogleSignInButton loading={loading} onPress={handleSignIn} testID="google-sign-in-button" accessibilityLabel="Continue with Google" />
        <View style={styles.trustRow}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} />
          <Text style={styles.trustText}>Private workspace for authorized staff.</Text>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  hero: {
    flex: 0.92,
    minHeight: 330,
    maxHeight: 430,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.primary,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandAmpersand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.primary,
  },
  heroIllustration: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  motifNode: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderWidth: 1,
    borderColor: '#F8ECEF',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motifCalendar: { top: '24%', right: '18%' },
  motifTicket: { top: '46%', right: '35%' },
  motifScan: { top: '67%', right: '14%' },
  motifLine: {
    position: 'absolute',
    backgroundColor: '#F8ECEF',
  },
  motifLineHorizontal: { width: 70, height: 1, top: '39%', right: '31%', transform: [{ rotate: '-24deg' }] },
  motifLineVertical: { width: 1, height: 64, top: '58%', right: '29%', transform: [{ rotate: '22deg' }] },
  motifDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#F8ECEF' },
  motifDotTimeline: { top: '39%', right: '13%' },
  heroCopy: { gap: spacing.sm },
  brandEyebrow: { ...typography.caption, letterSpacing: 1.1, textTransform: 'uppercase', color: '#FAEDF1' },
  heroTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.surface, maxWidth: 330 },
  authPanel: {
    flex: 1.08,
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: 32,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  authCopy: { gap: spacing.sm },
  authTitle: { ...typography.display, color: colors.text },
  authBody: { ...typography.body, color: colors.textMuted, maxWidth: 340 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  trustText: { ...typography.caption, color: colors.textMuted },
})
