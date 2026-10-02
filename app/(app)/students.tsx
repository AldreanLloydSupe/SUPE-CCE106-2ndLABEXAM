import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import StudentCard, { type Student } from '@/components/StudentCard';
import { PageTitle, Screen, StatePanel } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { ApiError, getStudents } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function StudentsScreen() {
  const { token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 2 : 1;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStudents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setStudents(await getStudents(token));
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load students.');
    } finally { setLoading(false); }
  }, [token, logout]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const query = search.trim().toLowerCase();
  const filteredStudents = students.filter(student => [student.name, student.email, student.course].some(value => String(value || '').toLowerCase().includes(query)));

  return <Screen scroll={false}>
    <FlatList
      key={columns}
      numColumns={columns}
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
      columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
      keyboardShouldPersistTaps="handled"
      data={loading || error ? [] : filteredStudents}
      keyExtractor={(item, index) => String(item.id ?? index)}
      renderItem={({ item }) => <View style={{ width: columns === 2 ? '49%' : '100%', flexShrink: 1 }}><StudentCard student={item} /></View>}
      ListHeaderComponent={<View style={styles.listHeader}>
        <PageTitle eyebrow="THE CAMPUS COMMUNITY" title="Student directory" subtitle="Find familiar faces. Get to know your community." />
        <View style={styles.searchWrap}><Ionicons name="search-outline" size={21} color={palette.muted} /><TextInput style={styles.input} accessibilityLabel="Search students" placeholder="Search name, email, or course" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clear}><Ionicons name="close-circle" size={20} color={palette.muted} /></Pressable> : null}</View>
        {!loading && !error && <View style={styles.results}><Text style={styles.resultText}>{filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}{query ? ' found' : ' in the directory'}</Text><Text style={styles.resultsHint}>OUR COMMUNITY</Text></View>}
      </View>}
      ListEmptyComponent={loading ? <StatePanel loading title="Loading your community…" /> : error ? <StatePanel title="Couldn’t load students" message={error} onRetry={loadStudents} /> : <StatePanel title={query ? 'No matches just yet' : 'No students yet'} message={query ? 'Try a different name, email, or course.' : 'Student records will appear here when they are available.'} />}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  listHeader: { gap: 24, marginBottom: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, borderWidth: 1, borderColor: palette.border, borderRadius: 14, backgroundColor: palette.surface, gap: 12 },
  input: { flex: 1, minWidth: 0, paddingVertical: 18, paddingRight: 12, fontSize: 14, color: palette.ink },
  clear: { minWidth: 48, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  results: { ...ui.row, justifyContent: 'space-between', flexWrap: 'wrap' },
  resultText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  resultsHint: { color: palette.muted, fontSize: 9, letterSpacing: 1.5 },
});
