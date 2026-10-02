import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@/constants/portal';
import { ActionButton, PortalHeader, Screen, StatePanel } from '@/components/Portal';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { token, authLoading, authError, restoreSession, logout } = useAuth();
  if (authLoading) return <View style={styles.loading}><ActivityIndicator color={palette.green} /></View>;
  if (authError) {
    return <>
      <PortalHeader />
      <Screen>
        <StatePanel
          title={authError.action === 'logout' ? 'Finish signing out' : 'Unable to restore your session'}
          message={authError.message}
          onRetry={authError.action === 'logout' ? logout : restoreSession}
        />
        {authError.action === 'restore' && <ActionButton title="Sign out instead" icon="log-out-outline" secondary onPress={logout} />}
      </Screen>
    </>;
  }
  return (
    <Stack screenOptions={{ headerTintColor: palette.green, headerStyle: { backgroundColor: palette.surface }, headerShadowVisible: false, contentStyle: { backgroundColor: palette.background } }}>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="sign-in" options={{ title: 'Sign In', headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="student/[id]" options={{ title: 'Student Details' }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background } });
