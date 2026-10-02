import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import type { Student } from '@/types/api';

export type { Student } from '@/types/api';

export default function StudentCard({ student }: { student: Student }) {
  const hasId = student.id !== undefined && student.id !== null;
  const handleViewDetails = () => {
    if (!hasId) return;
    router.push({ pathname: '/student/[id]', params: { id: String(student.id) } });
  };

  return <Pressable accessibilityRole="button" accessibilityLabel={`View details for ${student.name || 'student'}`} accessibilityState={{ disabled: !hasId }} disabled={!hasId} onPress={handleViewDetails}
    style={({ pressed }) => [ui.card, styles.card, pressed && styles.pressed]}>
    <View style={ui.row}><Avatar name={student.name} /><View style={ui.grow}><Text style={styles.name}>{student.name || 'Name not available'}</Text><Text style={styles.studentId}>STUDENT {student.id != null ? `#${student.id}` : ''}</Text></View><Ionicons name="arrow-forward" size={20} color={palette.green} /></View>
    <View style={ui.divider} />
    <View style={ui.row}><Ionicons name="mail-outline" size={17} color={palette.muted} /><Text style={[styles.email, ui.grow]}>{student.email || 'Email not available'}</Text></View>
    <View style={styles.course}><Ionicons name="school-outline" size={16} color={palette.green} /><Text style={styles.courseText}>{student.course || 'Course not provided'}</Text></View>
    <Text style={styles.link}>{hasId ? 'View student details' : 'Details unavailable'}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 18, padding: 22 },
  pressed: { borderColor: palette.green, backgroundColor: '#F1F6EF' },
  name: { color: palette.ink, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  studentId: { color: palette.muted, fontSize: 10, letterSpacing: 1.2, marginTop: 4 },
  email: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  course: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, backgroundColor: palette.mint, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9 },
  courseText: { color: palette.green, fontSize: 11, lineHeight: 18, flexShrink: 1 },
  link: { color: palette.green, fontSize: 12, fontWeight: '700', marginTop: 'auto' },
});
