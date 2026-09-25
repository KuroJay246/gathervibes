import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, controls, radii, spacing, typography } from '@/design/tokens'

export function Screen({ children, scroll = false, contentStyle }) {
  const Wrapper = scroll ? ScrollView : View
  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <Wrapper style={styles.surface} contentContainerStyle={scroll ? [styles.scrollContent, contentStyle] : undefined}>
        {!scroll ? <View style={[styles.content, contentStyle]}>{children}</View> : children}
      </Wrapper>
    </SafeAreaView>
  )
}

export function Section({ eyebrow, title, description, children }) {
  return (
    <View style={styles.section}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {description ? <Text style={styles.sectionDescription}>{description}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export function Card({ children, tone = 'default' }) {
  return <View style={[styles.card, tone === 'muted' ? styles.cardMuted : null]}>{children}</View>
}

export function Banner({ tone = 'info', children }) {
  return <View style={[styles.banner, tone === 'warning' ? styles.bannerWarning : tone === 'danger' ? styles.bannerDanger : tone === 'success' ? styles.bannerSuccess : styles.bannerInfo]}>{typeof children === 'string' ? <Text style={styles.bannerText}>{children}</Text> : children}</View>
}

export function Pill({ tone = 'neutral', children }) {
  return <View style={[styles.pill, tone === 'success' ? styles.pillSuccess : tone === 'warning' ? styles.pillWarning : tone === 'danger' ? styles.pillDanger : styles.pillNeutral]}><Text style={styles.pillText}>{children}</Text></View>
}

export function Metric({ label, value, detail }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  )
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  testID,
  accessibilityLabel,
  rightIcon,
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputShell, focused ? styles.inputShellFocused : null]}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSubtle} secureTextEntry={secureTextEntry} autoCapitalize={autoCapitalize} autoCorrect={false} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input} testID={testID} accessibilityLabel={accessibilityLabel || testID || label} />
        {rightIcon}
      </View>
    </View>
  )
}

export function AppIcon({ name, size = 20, color = colors.textMuted, accessibilityLabel }) {
  return <Ionicons name={name} size={size} color={color} accessibilityLabel={accessibilityLabel} />
}

export function IconButton({ name, onPress, label, color = colors.text }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed ? styles.buttonPressed : null]}><AppIcon name={name} color={color} accessibilityLabel={label} /></Pressable>
}

export function PrimaryButton({ label, onPress, disabled = false, testID, accessibilityLabel }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled ? styles.buttonDisabled : null, pressed && !disabled ? styles.buttonPressed : null]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || testID || label}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  )
}

export function SecondaryButton({ label, onPress, disabled = false, testID, accessibilityLabel }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, disabled ? styles.buttonDisabled : null, pressed && !disabled ? styles.buttonPressed : null]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || testID || label}
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )
}

export function LoadingView({ label = 'Loading…' }) {
  return (
    <Screen>
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </Screen>
  )
}

export function EmptyState({ title, description }) {
  return (
    <Card tone="muted">
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </Card>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  surface: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: 8,
  },
  eyebrow: {
    ...typography.caption,
    letterSpacing: 1,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.title,
    color: colors.text,
  },
  sectionDescription: {
    ...typography.body,
    color: colors.textMuted,
  },
  sectionBody: {
    gap: 12,
  },
  card: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  banner: {
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerInfo: {
    backgroundColor: colors.infoSoft,
  },
  bannerWarning: {
    backgroundColor: colors.warningSoft,
  },
  bannerDanger: {
    backgroundColor: colors.dangerSoft,
  },
  bannerSuccess: {
    backgroundColor: colors.successSoft,
  },
  bannerText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pillNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  pillSuccess: {
    backgroundColor: colors.successSoft,
  },
  pillWarning: {
    backgroundColor: colors.warningSoft,
  },
  pillDanger: {
    backgroundColor: colors.dangerSoft,
  },
  metric: {
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: colors.textSubtle,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  metricDetail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  inputShell: {
    minHeight: controls.field,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellFocused: {
    borderColor: colors.primary,
  },
  input: {
    flex: 1,
    minHeight: controls.field - 2,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: controls.button,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: colors.surface,
    ...typography.label,
  },
  secondaryButton: {
    minHeight: controls.button,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.text,
    ...typography.label,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  loadingView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    ...typography.body,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  iconButton: {
    minWidth: controls.minTouch,
    minHeight: controls.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5ddd6',
  },
})
