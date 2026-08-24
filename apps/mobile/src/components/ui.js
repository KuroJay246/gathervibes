import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

export function Screen({ children, scroll = false, contentStyle }) {
  const Wrapper = scroll ? ScrollView : View
  return (
    <SafeAreaView style={styles.safeArea}>
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

export function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, autoCapitalize = 'sentences' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#877f78"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  )
}

export function PrimaryButton({ label, onPress, disabled = false }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, disabled ? styles.buttonDisabled : null, pressed && !disabled ? styles.buttonPressed : null]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  )
}

export function SecondaryButton({ label, onPress, disabled = false }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.secondaryButton, disabled ? styles.buttonDisabled : null, pressed && !disabled ? styles.buttonPressed : null]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  )
}

export function LoadingView({ label = 'Loading…' }) {
  return (
    <Screen>
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color="#7c3144" />
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
    backgroundColor: '#f5f1ec',
  },
  surface: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#7c3144',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2023',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5c554f',
  },
  sectionBody: {
    gap: 12,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd4cc',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 10,
  },
  cardMuted: {
    backgroundColor: '#fbf8f4',
  },
  banner: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerInfo: {
    backgroundColor: '#eef3fb',
  },
  bannerWarning: {
    backgroundColor: '#fff3dd',
  },
  bannerDanger: {
    backgroundColor: '#fdeceb',
  },
  bannerSuccess: {
    backgroundColor: '#e8f4ec',
  },
  bannerText: {
    color: '#1f2023',
    fontSize: 13,
    lineHeight: 18,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pillNeutral: {
    backgroundColor: '#ece7e1',
  },
  pillSuccess: {
    backgroundColor: '#dcefe2',
  },
  pillWarning: {
    backgroundColor: '#f9ebc8',
  },
  pillDanger: {
    backgroundColor: '#f6dddd',
  },
  metric: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2d9d1',
    backgroundColor: '#ffffff',
    padding: 12,
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#7a726b',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2023',
  },
  metricDetail: {
    fontSize: 12,
    color: '#5c554f',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f4842',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7cec6',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#1f2023',
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#7c3144',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7cec6',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#2f2a26',
    fontSize: 15,
    fontWeight: '700',
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
    color: '#4f4842',
    fontSize: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2023',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5c554f',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5ddd6',
  },
})
