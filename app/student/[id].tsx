import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { type Student } from '@/components/StudentCard';
import { ActionButton, Avatar, DetailRow, PageTitle, Screen, StatePanel } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { ApiError, getStudent } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function StudentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { token, logout } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudent = useCallback(async () => {
    const studentId = Array.isArray(id) ? id[0] : id;
    if (!studentId || !token) { setError('A valid student ID is required.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try { setStudent(await getStudent(studentId, token)); }
    catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load this student.');
    } finally { setLoading(false); }
  }, [id, token, logout]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  return <Screen>
    <PageTitle eyebrow="STUDENT DIRECTORY / DETAILS" title="A little more about them." subtitle="Student information, all in one place." />
    {loading ? <StatePanel loading title="Loading student details…" />
      : error ? <StatePanel title="Couldn’t load this student" message={error} onRetry={loadStudent} />
      : !student ? <StatePanel title="No record available" message="Return to the directory to find another student." />
      : <View style={[ui.card, styles.record, width >= 760 && { flexDirection: 'row' }]}>
        <View style={[styles.identity, width >= 760 && { width: 280 }]}>
          <Avatar name={student.name} large />
          <Text style={[ui.title, styles.name]}>{student.name || 'Name not available'}</Text>
          <Text style={styles.studentId}>STUDENT #{student.id ?? id}</Text>
          <Text style={styles.course}>{student.course || 'Course not provided'}</Text>
        </View>
        <View style={[ui.grow, styles.details]}>
          <Text accessibilityRole="header" style={ui.heading}>Student information</Text>
          <View style={ui.divider} />
          <DetailRow icon="id-card-outline" label="Student ID" value={student.id ?? id} />
          <DetailRow icon="person-outline" label="Full name" value={student.name} />
          <DetailRow icon="mail-outline" label="Email address" value={student.email} />
          <DetailRow icon="school-outline" label="Course / program" value={student.course} />
        </View>
      </View>}
    <View style={{ alignSelf: 'flex-start' }}><ActionButton title="Back to students" icon="arrow-back" secondary onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/students')} /></View>
  </Screen>;
}

const styles = StyleSheet.create({
  record: { padding: 0, overflow: 'hidden', gap: 0 },
  identity: { padding: 32, backgroundColor: palette.mint, alignItems: 'center', gap: 20 },
  name: { fontSize: 25, textAlign: 'center' },
  studentId: { color: palette.green, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  course: { color: palette.green, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  details: { padding: 28, gap: 16 },
});
