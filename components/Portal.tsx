import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, ui } from '@/constants/portal';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Brand({ light = false }: { light?: boolean }) {
  return <View style={ui.row}>
    <View style={[styles.brandMark, light && { backgroundColor: palette.lime }]}><Ionicons name="school-outline" size={23} color={light ? palette.greenDark : '#FFFFFF'} /></View>
    <View><Text style={[styles.brandTitle, light && { color: '#FFFFFF' }]}>Student Portal</Text><Text style={[styles.brandSubtitle, light && { color: '#BED1C5' }]}>CCE106 · STUDENT SERVICES</Text></View>
  </View>;
}

export function PortalHeader() {
  const { width } = useWindowDimensions();
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafe}>
    <View style={styles.header}><Brand />{width >= 600 && <View style={styles.headerBadge}><View style={styles.dot} /><Text style={styles.headerBadgeText}>Your campus, connected</Text></View>}</View>
  </SafeAreaView>;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const { width } = useWindowDimensions();
  const content = [styles.content, { padding: width < 600 ? 20 : 36 }];
  return <SafeAreaView edges={['left', 'right']} style={styles.screen}>
    {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled"><View style={content}>{children}</View></ScrollView> : <View style={[content, { flex: 1 }]}>{children}</View>}
  </SafeAreaView>;
}

export function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <View style={{ gap: 8 }}><Text style={ui.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={ui.title}>{title}</Text><Text style={ui.body}>{subtitle}</Text></View>;
}

export function Avatar({ name, large = false }: { name?: string | null; large?: boolean }) {
  const initials = (name || 'Student').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <View style={[styles.avatar, large && styles.avatarLarge]}><Text style={[styles.initials, large && { fontSize: 28 }]}>{initials}</Text></View>;
}

export function ActionButton({ title, onPress, icon = 'arrow-forward', secondary = false, danger = false, loading = false }: {
  title: string; onPress: () => void; icon?: IconName; secondary?: boolean; danger?: boolean; loading?: boolean;
}) {
  const color = danger ? palette.danger : secondary ? palette.green : '#FFFFFF';
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (pressed || loading) && ui.pressed]}>
    {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={18} color={color} />}
    <Text style={[styles.buttonText, { color }]}>{title}</Text>
  </Pressable>;
}

export function StatusPill({ label = 'Signed in' }: { label?: string }) {
  return <View style={styles.pill}><View style={styles.dot} /><Text style={styles.pillText}>{label}</Text></View>;
}

export function StatePanel({ title, message, loading = false, onRetry }: { title: string; message?: string; loading?: boolean; onRetry?: () => void }) {
  return <View style={styles.state} accessibilityLiveRegion="polite">
    {loading ? <ActivityIndicator size="large" color={palette.green} /> : <Ionicons name={onRetry ? 'cloud-offline-outline' : 'search-outline'} size={32} color={palette.muted} />}
    <Text style={ui.heading}>{title}</Text>{message ? <Text style={[ui.body, { textAlign: 'center' }]}>{message}</Text> : null}
    {onRetry ? <ActionButton title="Try again" onPress={onRetry} secondary icon="refresh-outline" /> : null}
  </View>;
}

export function DetailRow({ icon, label, value }: { icon: IconName; label: string; value?: string | number | null }) {
  return <View style={styles.detailRow}><View style={styles.detailIcon}><Ionicons name={icon} size={20} color={palette.green} /></View><View style={ui.grow}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value ?? 'Not provided'}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  scroll: { flexGrow: 1 },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: 28, paddingBottom: 40 },
  headerSafe: { backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border },
  header: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  brandMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { color: palette.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  brandSubtitle: { color: palette.muted, fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBadgeText: { color: palette.muted, fontSize: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.green },
  avatar: { width: 50, height: 50, borderRadius: 17, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 86, height: 86, borderRadius: 26, backgroundColor: palette.lime },
  initials: { fontWeight: '700', fontSize: 17, color: palette.green },
  button: { minHeight: 50, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: palette.green, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondary: { backgroundColor: palette.mint },
  danger: { backgroundColor: palette.dangerSoft },
  buttonText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  pill: { alignSelf: 'flex-start', backgroundColor: palette.mint, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillText: { color: palette.green, fontSize: 12, fontWeight: '600' },
  state: { padding: 32, gap: 16, alignItems: 'center', backgroundColor: palette.surface, borderRadius: 20, borderWidth: 1, borderColor: palette.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  detailIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { color: palette.muted, fontSize: 12, marginBottom: 5 },
  detailValue: { color: palette.ink, fontSize: 15, fontWeight: '500', lineHeight: 22 },
});
