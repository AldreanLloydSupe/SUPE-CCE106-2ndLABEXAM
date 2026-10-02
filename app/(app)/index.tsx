import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Avatar, PageTitle, Screen, StatusPill, type IconName } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardScreen() {
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Student';
  return <Screen>
    <PageTitle eyebrow="YOUR CAMPUS COMPANION" title={`Welcome back, ${firstName}.`} subtitle="A little less searching. A little more getting things done." />
    <View style={[styles.hero, wide && { flexDirection: 'row', padding: 36 }]}>
      <View style={[ui.grow, { gap: 16 }]}>
        <Text style={styles.heroEyebrow}>STUDENT SERVICE PORTAL</Text>
        <Text style={[styles.heroTitle, wide && { fontSize: 38 }]}>Your campus.{'\n'}All in one place.</Text>
        <Text style={styles.heroBody}>Find your fellow students, explore their programs, and keep your profile close at hand.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(app)/students')} style={({ pressed }) => [styles.heroButton, pressed && ui.pressed]}>
          <Text style={styles.heroButtonText}>Explore student directory</Text><Ionicons name="arrow-forward" size={18} color={palette.greenDark} />
        </Pressable>
      </View>
      {wide && <View style={styles.heroArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.orbit}><View style={styles.artTile}><Ionicons name="school-outline" size={62} color={palette.lime} /></View></View><View style={styles.artLabel}><Ionicons name="leaf-outline" size={15} color={palette.green} /><Text style={styles.artLabelText}>Room to learn. Space to grow.</Text></View></View>}
    </View>
    <View style={ui.section}>
      <View style={styles.sectionHeading}><Text accessibilityRole="header" style={ui.heading}>What would you like to do?</Text><Text style={styles.small}>QUICK ACCESS</Text></View>
      <View style={[styles.actions, wide && { flexDirection: 'row' }]}>
        <QuickAction icon="people-outline" title="Student directory" description="Browse students and find the details you need." label="View students" onPress={() => router.push('/(app)/students')} />
        <QuickAction icon="person-outline" title="Your profile" description="Your account information, in one simple view." label="Open profile" onPress={() => router.push('/(app)/profile')} />
      </View>
    </View>
    <View style={[ui.card, styles.account, wide && { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={[ui.row, ui.grow]}><Avatar name={user?.name} /><View style={ui.grow}><Text style={ui.heading}>{user?.name || 'Your account'}</Text><Text style={ui.body}>{user?.email || 'Student portal account'}</Text></View></View>
      <StatusPill label={token ? 'Session active' : 'Signed out'} />
    </View>
    <Text style={styles.footer}>STUDENT SERVICES · CCE106</Text>
  </Screen>;
}

function QuickAction({ icon, title, description, label, onPress }: { icon: IconName; title: string; description: string; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [ui.card, { flex: 1 }, pressed && ui.pressed]}>
    <View style={styles.actionIcon}><Ionicons name={icon} size={25} color={palette.green} /></View>
    <Text style={ui.heading}>{title}</Text><Text style={ui.body}>{description}</Text>
    <View style={[ui.row, { marginTop: 8, justifyContent: 'space-between' }]}><Text style={styles.actionLabel}>{label}</Text><Ionicons name="arrow-forward" size={20} color={palette.green} /></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: palette.greenDark, borderRadius: 24, padding: 26, gap: 28, overflow: 'hidden' },
  heroEyebrow: { color: palette.lime, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  heroTitle: { color: '#FFFFFF', fontSize: 32, lineHeight: 43, fontWeight: '700', letterSpacing: -1.2 },
  heroBody: { color: '#CDDDD1', fontSize: 15, lineHeight: 24, maxWidth: 440 },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.lime, padding: 15, borderRadius: 12, marginTop: 8 },
  heroButtonText: { color: palette.greenDark, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  heroArt: { width: 280, alignItems: 'center', justifyContent: 'center', gap: 20 },
  orbit: { width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: '#527360', alignItems: 'center', justifyContent: 'center' },
  artTile: { width: 125, height: 125, borderRadius: 32, backgroundColor: '#2B5542', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  artLabel: { backgroundColor: palette.mint, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  artLabelText: { color: palette.green, fontSize: 11, fontWeight: '600' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  small: { color: palette.muted, fontSize: 10, letterSpacing: 1.5 },
  actions: { gap: 18 },
  actionIcon: { width: 52, height: 52, backgroundColor: palette.mint, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  actionLabel: { color: palette.green, fontSize: 14, fontWeight: '700' },
  account: { gap: 20 },
  footer: { color: palette.muted, fontSize: 10, letterSpacing: 2, textAlign: 'center', paddingTop: 4 },
});
