import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import StudentCard, { type Student } from '@/components/StudentCard';
import { PageTitle, Screen, StatePanel } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { ApiError, getStudents } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { getCourses, selectStudents, type NameOrder } from '@/utils/student-directory';

export default function StudentsScreen() {
  const { token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const columns = width >= 760 ? 2 : 1;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState<string | null>(null);
  const [order, setOrder] = useState<NameOrder>('asc');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const requestId = useRef(0);

  const loadStudents = useCallback(async (refresh = false) => {
    if (!token) return;
    const current = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    setRefreshError('');
    try {
      const result = await getStudents(token);
      if (current === requestId.current) setStudents(result);
    } catch (caughtError) {
      if (current !== requestId.current) return;
      if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to load students.';
      if (refresh) setRefreshError(message);
      else setError(message);
    } finally {
      if (current === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, [token, logout]);

  useEffect(() => {
    void loadStudents();
    return () => { requestId.current += 1; };
  }, [loadStudents]);

  const courses = useMemo(() => getCourses(students), [students]);
  const courseOptions = course && !courses.includes(course) ? [course, ...courses] : courses;
  const filteredStudents = useMemo(() => selectStudents(students, search, course, order), [students, search, course, order]);
  const filtered = !!search.trim() || course !== null;
  const resetFilters = () => { setSearch(''); setCourse(null); };

  return <Screen scroll={false}>
    <FlatList
      key={columns}
      numColumns={columns}
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 16 }}
      columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
      keyboardShouldPersistTaps="handled"
      refreshing={refreshing}
      onRefresh={Platform.OS !== 'web' && !loading ? () => { void loadStudents(true); } : undefined}
      data={loading || error ? [] : filteredStudents}
      keyExtractor={(item, index) => String(item.id ?? index)}
      renderItem={({ item }) => <View style={{ width: columns === 2 ? '49%' : '100%', flexShrink: 1 }}><StudentCard student={item} /></View>}
      ListHeaderComponent={<View style={styles.listHeader}>
        <PageTitle eyebrow="THE CAMPUS COMMUNITY" title="Student directory" subtitle="Find familiar faces. Get to know your community." />
        <View style={styles.searchWrap}><Ionicons name="search-outline" size={21} color={palette.muted} /><TextInput style={styles.input} accessibilityLabel="Search students" placeholder="Search name, email, or course" placeholderTextColor={palette.muted} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clear}><Ionicons name="close-circle" size={20} color={palette.muted} /></Pressable> : null}</View>
        <View style={{ gap: 10 }}>
          <Text style={styles.resultText}>Filter by course</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <FilterChip label="All courses" selected={course === null} onPress={() => setCourse(null)} />
            {courseOptions.map(item => <FilterChip key={item} label={item} selected={course === item} onPress={() => setCourse(item)} />)}
          </ScrollView>
        </View>
        <View style={styles.results}>
          <View style={ui.row}><Text style={styles.resultText}>Name</Text><FilterChip label="A–Z" selected={order === 'asc'} onPress={() => setOrder('asc')} /><FilterChip label="Z–A" selected={order === 'desc'} onPress={() => setOrder('desc')} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh students" accessibilityState={{ disabled: loading || refreshing, busy: refreshing }} disabled={loading || refreshing} onPress={() => { void loadStudents(true); }} style={({ pressed }) => [styles.refresh, (pressed || loading || refreshing) && ui.pressed]}>
            {refreshing ? <ActivityIndicator size="small" color={palette.green} /> : <Ionicons name="refresh-outline" size={18} color={palette.green} />}<Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
        </View>
        {refreshError ? <View style={styles.refreshError} accessibilityLiveRegion="polite"><Text style={styles.errorText}>Couldn’t refresh. Showing the last loaded records. {refreshError}</Text><Pressable accessibilityRole="button" onPress={() => { void loadStudents(true); }} disabled={refreshing} style={styles.refresh}><Text style={styles.refreshText}>Retry refresh</Text></Pressable></View> : null}
        {!loading && !error && <View style={styles.results}><Text style={styles.resultText}>{filteredStudents.length} of {students.length} {students.length === 1 ? 'student' : 'students'}</Text>{filtered ? <Pressable accessibilityRole="button" onPress={resetFilters} style={styles.refresh}><Text style={styles.refreshText}>Clear filters</Text></Pressable> : <Text style={styles.resultsHint}>OUR COMMUNITY</Text>}</View>}
      </View>}
      ListEmptyComponent={loading ? <StatePanel loading title="Loading your community…" /> : error ? <StatePanel title="Couldn’t load students" message={error} onRetry={() => { void loadStudents(); }} /> : <StatePanel title={filtered ? 'No matches just yet' : 'No students yet'} message={filtered ? 'Try another search or clear the course filter.' : 'Student records will appear here when they are available.'} />}
    />
  </Screen>;
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && ui.pressed]}><Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  listHeader: { gap: 24, marginBottom: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, borderWidth: 1, borderColor: palette.border, borderRadius: 14, backgroundColor: palette.surface, gap: 12 },
  input: { flex: 1, minWidth: 0, paddingVertical: 18, paddingRight: 12, fontSize: 14, color: palette.ink },
  clear: { minWidth: 48, minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  results: { ...ui.row, justifyContent: 'space-between', flexWrap: 'wrap' },
  resultText: { color: palette.ink, fontSize: 13, fontWeight: '600' },
  resultsHint: { color: palette.muted, fontSize: 9, letterSpacing: 1.5 },
  chips: { gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, paddingHorizontal: 14, paddingVertical: 10 },
  selectedChip: { backgroundColor: palette.green, borderColor: palette.green },
  chipText: { fontSize: 12, color: palette.muted, fontWeight: '600' },
  selectedChipText: { color: '#FFFFFF' },
  refresh: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  refreshText: { fontSize: 12, fontWeight: '700', color: palette.green },
  refreshError: { backgroundColor: palette.dangerSoft, padding: 14, borderRadius: 12, gap: 4 },
  errorText: { color: palette.danger, fontSize: 13, lineHeight: 20 },
});
