import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import StudentCard, { type Student } from '@/components/StudentCard';
import { ApiError, getStudents } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function StudentsScreen() {
  const { token, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStudents = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setStudents(await getStudents(token));
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load students.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadStudents();
  }, [token]);

  const filteredStudents = students.filter((student) => String(student.name || '').toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Students</Text>
      <TextInput style={styles.input} accessibilityLabel="Search students" placeholder="Search by name" value={search} onChangeText={setSearch} />
      {loading ? (
        <View style={styles.state}><ActivityIndicator color="#245bb2" /><Text style={styles.text}>Loading students…</Text></View>
      ) : error ? (
        <View style={styles.state} accessibilityLiveRegion="polite"><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={loadStudents}><Text style={styles.link}>Try Again</Text></Pressable></View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={({ item }) => <StudentCard student={item} />}
          ListEmptyComponent={<View style={styles.state}><Text style={styles.text}>No students found.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f2f5fa' },
  title: { fontSize: 28, fontWeight: '700', color: '#17324d', marginBottom: 20 },
  input: { padding: 14, borderWidth: 1, borderColor: '#c6d2e1', borderRadius: 8, backgroundColor: '#ffffff', color: '#17324d', marginBottom: 20 },
  state: { padding: 24, gap: 12, alignItems: 'center' },
  text: { color: '#536579' },
  note: { color: '#536579', fontSize: 12 },
  error: { color: '#b42318' },
  link: { color: '#245bb2', padding: 12 },
});
