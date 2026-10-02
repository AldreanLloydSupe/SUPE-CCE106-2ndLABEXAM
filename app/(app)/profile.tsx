import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ActionButton, Avatar, DetailRow, PageTitle, Screen, StatePanel, StatusPill } from '@/components/Portal';
import { palette, ui } from '@/constants/portal';
import { useAuth } from '@/hooks/useAuth';
import { ApiError, getProfile } from '@/services/api';

export default function ProfileScreen() {
  const { user, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try { setProfile(await getProfile(token)); }
    catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 401) { await logout(); return; }
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load profile.');
    } finally { setLoading(false); }
  }, [token, logout]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return <Screen>
    <PageTitle eyebrow="YOUR PERSONAL SPACE" title="My profile" subtitle="A simple view of your student account." />
    {loading ? <StatePanel loading title="Loading your profile…" /> : error ? <StatePanel title="Couldn’t load your profile" message={error} onRetry={loadProfile} /> :
      <View style={[styles.layout, width >= 760 && { flexDirection: 'row' }]}>
        <View style={[ui.card, styles.identity, width >= 760 && { width: 300 }]}>
          <Avatar name={profile?.name} large />
          <Text style={[ui.heading, { textAlign: 'center' }]}>{profile?.name || 'Student'}</Text>
          <Text style={styles.role}>{profile?.role || 'Student account'}</Text>
          <View style={ui.divider} />
          <View style={{ alignItems: 'center' }}><StatusPill label={token ? 'Session active' : 'Signed out'} /></View>
        </View>
        <View style={[ui.card, ui.grow]}>
          <Text accessibilityRole="header" style={ui.heading}>Account information</Text>
          <Text style={ui.body}>Your details as registered with student services.</Text>
          <View style={ui.divider} />
          <DetailRow icon="person-outline" label="Full name" value={profile?.name} />
          <DetailRow icon="mail-outline" label="Email address" value={profile?.email} />
          <DetailRow icon="id-card-outline" label="Account ID" value={profile?.id} />
          <DetailRow icon="school-outline" label="Role" value={profile?.role} />
        </View>
      </View>}
    <View style={[ui.card, styles.signOut, width >= 760 && { flexDirection: 'row', alignItems: 'center' }]}>
      <View style={[ui.grow, { gap: 6 }]}><Text style={ui.heading}>All done for now?</Text><Text style={ui.body}>Sign out when you finish using a shared device.</Text></View>
      <ActionButton title="Sign out" icon="log-out-outline" danger onPress={logout} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  layout: { gap: 20, alignItems: 'stretch' },
  identity: { alignItems: 'center', paddingVertical: 36, gap: 20 },
  role: { color: palette.green, fontSize: 13, textTransform: 'capitalize', backgroundColor: palette.mint, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  signOut: { gap: 24 },
});
