import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function LegacyHomeScreen() {
  const { token } = useAuth();
  return <Redirect href={token ? '/(app)' : '/sign-in'} />;
}
