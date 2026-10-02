import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Student } from '@/types/api';

export type { Student } from '@/types/api';

export default function StudentCard({ student }: { student: Student }) {
  const handleViewDetails = () => {
    if (student.id === undefined || student.id === null) return;
    router.push({ pathname: '/student/[id]', params: { id: String(student.id) } });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{student.name || 'Name not available'}</Text>
      <Text style={styles.text}>{student.email || 'Email not available'}</Text>
      {student.course ? <Text style={styles.text}>{student.course}</Text> : null}
      <Pressable accessibilityRole="button" style={styles.button} onPress={handleViewDetails}>
        <Text style={styles.buttonText}>View Details</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 12, backgroundColor: '#ffffff', marginBottom: 12, gap: 8 },
  name: { color: '#17324d', fontSize: 18, fontWeight: '600' },
  text: { color: '#536579' },
  button: { paddingVertical: 12, alignSelf: 'flex-start' },
  buttonText: { color: '#245bb2', fontWeight: '600' },
});
