import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, getProfile } from '@/services/api';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    getProfile(token)
      .then((result) => setProfile(result))
      .catch(async (caughtError) => {
        if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load profile.');
      })
      .finally(() => setLoading(false));
  }, [token]);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>MY PROFILE</Text>
      <View style={styles.card}>
        {loading ? <ActivityIndicator color="#245bb2" /> : error ? <Text style={styles.error}>{error}</Text> : <>
          <Text style={styles.text}>Name: {profile?.name || '—'}</Text>
          <Text style={styles.text}>Email: {profile?.email || '—'}</Text>
          <Text style={styles.text}>Role: {profile?.role || '—'}</Text>
        </>}
      </View>
      <Text style={styles.text}>Session Status: {token ? 'Authenticated' : 'Not Available'}</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={logout}><Text style={styles.buttonText}>LOGOUT</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: '#f2f5fa' },
  title: { color: '#17324d', fontSize: 24, fontWeight: '700' },
  card: { backgroundColor: '#ffffff', padding: 20, gap: 16, borderRadius: 12 },
  text: { color: '#536579', fontSize: 16 },
  error: { color: '#b42318' },
  note: { color: '#536579', fontSize: 12 },
  button: { backgroundColor: '#245bb2', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
});
