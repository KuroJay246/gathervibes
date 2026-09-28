import { useMemo, useState } from 'react'
import { Redirect } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
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
    'auth/access-check-network': 'You are signed in, but we could not reach the staff access check. Try again when your connection is stable.',
    'auth/access-check-app-check': 'You are signed in, but the staff access check could not be completed on this device. Try again.',
    'auth/access-check-failed': 'You are signed in, but we could not confirm your staff access right now. Try again.',
    'auth/unapproved-account': 'This account is not approved for the private Gather & Savor workspace.',
  }

  return messages[code] || 'Sign-in failed.'
}

export default function SignInScreen() {
  const { height } = useWindowDimensions()
  const { authInitialized, authState, defaultRoute, isAuthorized, loading, signInWithGoogle, authError, user } = useAuth()
  const [localError, setLocalError] = useState('')

  const errorMessage = useMemo(() => {
    if (!authError && !isAuthorized) return ''
    return localError || authMessage(authError)
  }, [authError, isAuthorized, localError])
  const heroHeight = Math.min(Math.max(height * 0.38, 300), 390)

  if (authInitialized && isAuthorized) return <Redirect href={defaultRoute === '/scanner' ? '/scanner' : '/home'} />
  if (authInitialized && (authState === 'access-denied' || authState === 'access-required')) return <Redirect href="/access-required" />

  if (user && authState === 'checking-access') {
    return (
      <Screen contentStyle={styles.checkingScreen}>
        <View style={styles.checkingMark}><Text style={styles.checkingAmpersand}>&amp;</Text></View>
        <ActivityIndicator size="small" color={colors.primary} accessibilityLabel="Checking your staff access" />
        <Text accessibilityRole="header" style={styles.checkingTitle}>Checking your staff access</Text>
        <Text style={styles.checkingBody}>Your Google sign-in is complete. We are confirming this workspace.</Text>
      </Screen>
    )
  }

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
      <View style={[styles.hero, { height: heroHeight }]}>
        <View style={styles.brandMark}>
          <Text accessibilityLabel="Gather and Savor" style={styles.brandAmpersand}>&amp;</Text>
        </View>

        <View pointerEvents="none" accessibilityElementsHidden style={styles.workflow}>
          <View style={[styles.workflowCard, styles.guestCard]}>
            <View style={styles.iconCircle}><Ionicons name="people-outline" size={20} color={colors.primary} /></View>
            <View style={styles.fakeLines}><View style={[styles.fakeLine, { width: 70 }]} /><View style={[styles.fakeLineSoft, { width: 48 }]} /></View>
            <View style={styles.readyDot} />
          </View>
          <View style={[styles.connector, styles.connectorOne]} />
          <View style={[styles.workflowCard, styles.scanCard]}>
            <Ionicons name="scan-outline" size={34} color={colors.surface} />
            <Text style={styles.workflowLabel}>SCAN</Text>
          </View>
          <View style={[styles.connector, styles.connectorTwo]} />
          <View style={[styles.workflowCard, styles.timelineCard]}>
            <View style={styles.timelineRail}><View style={styles.timelineDot} /><View style={styles.timelineLine} /><View style={styles.timelineDot} /></View>
            <View style={styles.fakeLines}><View style={[styles.fakeLightLine, { width: 56 }]} /><View style={[styles.fakeLightLine, { width: 42 }]} /></View>
          </View>
        </View>

        <View style={styles.heroCopy}>
          <Text style={styles.brandEyebrow}>Gather &amp; Savor</Text>
          <Text style={styles.heroTitle}>Event operations, in one place.</Text>
        </View>
      </View>

      <View style={styles.authPanel}>
        <View style={styles.authCopy}>
          <Text accessibilityRole="header" style={styles.authTitle}>Welcome back</Text>
          <Text style={styles.authBody}>Sign in with your approved Gather &amp; Savor account. Then continue to your staff workspace.</Text>
        </View>
        {errorMessage ? <Banner tone="danger">{errorMessage}</Banner> : null}
        <GoogleSignInButton loading={loading} onPress={handleSignIn} testID="google-sign-in-button" accessibilityLabel="Continue with Google" />
        <View style={styles.trustRow}>
          <View style={styles.trustIcon}><Ionicons name="lock-closed-outline" size={16} color={colors.primary} /></View>
          <View style={styles.trustCopy}>
            <Text style={styles.trustTitle}>Approved staff workspace</Text>
            <Text style={styles.trustText}>Use the Google account approved for Gather &amp; Savor.</Text>
          </View>
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
    minHeight: 330,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.primary,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  brandAmpersand: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.primary,
  },
  workflow: { height: 210, marginTop: spacing.lg, position: 'relative', opacity: 1, zIndex: 1 },
  workflowCard: { position: 'absolute', width: 138, minHeight: 76, borderRadius: 18, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guestCard: { left: 20, top: 12, backgroundColor: '#FFF8FA', transform: [{ rotate: '-4deg' }] },
  scanCard: { right: 18, top: 58, backgroundColor: colors.primaryPressed, justifyContent: 'center', transform: [{ rotate: '4deg' }] },
  timelineCard: { left: 82, top: 116, backgroundColor: colors.primaryPressed, transform: [{ rotate: '-1deg' }] },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fakeLines: { gap: 7 },
  fakeLine: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  fakeLineSoft: { height: 6, borderRadius: 4, backgroundColor: '#D8B7C1' },
  fakeLightLine: { height: 6, borderRadius: 4, backgroundColor: '#E9C9D2' },
  readyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginLeft: 'auto' },
  connector: { position: 'absolute', height: 1, width: 46, backgroundColor: 'rgba(255,255,255,0.55)' },
  connectorOne: { top: 55, left: '43%', transform: [{ rotate: '-18deg' }] },
  connectorTwo: { top: 115, right: '40%', transform: [{ rotate: '18deg' }] },
  workflowLabel: { ...typography.caption, color: colors.surface, letterSpacing: 1 },
  timelineRail: { alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F8ECEF' },
  timelineLine: { width: 1, height: 25, backgroundColor: '#E9C9D2' },
  heroCopy: { marginTop: 'auto', gap: spacing.sm, zIndex: 2 },
  brandEyebrow: { ...typography.caption, letterSpacing: 1.1, textTransform: 'uppercase', color: '#FAEDF1' },
  heroTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700', color: colors.surface, maxWidth: 330 },
  authPanel: {
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: 32,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  authCopy: { gap: spacing.sm },
  authTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.text },
  authBody: { ...typography.body, color: colors.textMuted, maxWidth: 340 },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: 2, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  trustIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  trustCopy: { flex: 1, gap: 2 },
  trustTitle: { ...typography.label, color: colors.text },
  trustText: { ...typography.caption, color: colors.textMuted },
  checkingScreen: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  checkingMark: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkingAmpersand: { fontSize: 36, lineHeight: 42, fontWeight: '700', color: colors.surface },
  checkingTitle: { ...typography.title, color: colors.text, textAlign: 'center' },
  checkingBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 320 },
})
