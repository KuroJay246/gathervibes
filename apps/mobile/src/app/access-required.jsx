import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Redirect } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

import { PrimaryButton, SecondaryButton } from '@/components/ui'
import { colors, spacing, typography } from '@/design/tokens'
import { useAuth } from '@/providers/useAuth'

export default function AccessRequiredScreen() {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const { authState, authError, isAuthorized, loading, retryAccess, signOut } = useAuth()

  if (isAuthorized) return <Redirect href="/" />

  const denied = authState === 'access-denied' || authError === 'auth/unapproved-account'
  const temporaryNetwork = authError === 'auth/access-check-network'
  const temporaryAppCheck = authError === 'auth/access-check-app-check'
  const temporary = !denied
  const title = denied ? 'This account does not have access' : temporaryNetwork ? "You're offline" : temporaryAppCheck ? 'We could not verify this device' : 'We could not verify your access'
  const body = denied
    ? "You're signed in with a Google account that is not approved for this workspace."
    : temporaryNetwork
      ? 'Reconnect to verify your staff access.'
      : temporaryAppCheck
        ? 'You are signed in, but device verification could not complete the staff access check.'
        : "You're signed in, but we could not confirm your staff access right now."
  const actionLabel = temporaryNetwork ? 'Try again' : 'Try again'
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: width < 360 ? 16 : 24, paddingTop: height < 700 ? 24 : 48, paddingBottom: Math.max(insets.bottom + 24, 32) }]}>
        <View style={styles.inner}>
          <View style={styles.brandMark}><Text style={styles.brandAmpersand}>&amp;</Text></View>
          <View style={styles.accessArt} accessibilityElementsHidden>
            <View style={styles.accessArtRing}><Ionicons name={denied ? 'shield-outline' : 'shield-checkmark-outline'} size={42} color={colors.primary} /></View>
            {!denied ? <View style={styles.accessBadge}><Ionicons name="alert" size={14} color={colors.warning} /></View> : null}
          </View>
          <Text style={styles.eyebrow}>{denied ? 'Access denied' : 'Access check'}</Text>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <View style={[styles.statusSurface, denied ? styles.statusDenied : styles.statusWarning]}>
            <Ionicons name={denied ? 'lock-closed-outline' : 'time-outline'} size={19} color={denied ? colors.danger : colors.warning} />
            <Text style={styles.statusText}>{denied ? 'Use the approved staff account to continue.' : 'No event data was changed.'}</Text>
          </View>
          <View style={styles.actions}>
            {temporary ? <PrimaryButton label={loading ? 'Checking access…' : actionLabel} accessibilityLabel="Retry access check" onPress={() => void retryAccess()} disabled={loading} /> : null}
            <SecondaryButton label={denied ? 'Use another account' : 'Sign out'} onPress={() => void signOut()} disabled={loading} />
          </View>
          <Text style={styles.footer}>Secure Gather &amp; Savor staff workspace</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  inner: { width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1, justifyContent: 'center', gap: spacing.md },
  brandMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  brandAmpersand: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: colors.surface },
  accessArt: { height: 126, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  accessArtRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  accessBadge: { position: 'absolute', right: '29%', bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.caption, letterSpacing: 1.1, textTransform: 'uppercase', color: colors.primary, textAlign: 'center' },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center', maxWidth: 360, alignSelf: 'center' },
  statusSurface: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, marginTop: spacing.sm },
  statusWarning: { backgroundColor: colors.warningSoft },
  statusDenied: { backgroundColor: colors.dangerSoft },
  statusText: { ...typography.caption, color: colors.text, flex: 1 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  footer: { ...typography.caption, color: colors.textSubtle, textAlign: 'center', marginTop: spacing.sm },
})
