import { createContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { getProfile } from '@/services/api';
import type { User } from '@/types/api';

const TOKEN_KEY = 'student-service-access-token';

type AuthContextValue = {
  token: string | null;
  user: User | null;
  authLoading: boolean;
  login: (accessToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // False keeps the unfinished starter usable; no session has been restored yet.
  const [authLoading, setAuthLoading] = useState(true);

  const login = async (accessToken: string, userData: User) => {
    if (Platform.OS !== 'web' && await SecureStore.isAvailableAsync()) await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      if (Platform.OS !== 'web' && await SecureStore.isAvailableAsync()) await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setToken(null);
      setUser(null);
      router.replace('/sign-in');
    }
  };

  const restoreSession = async () => {
    setAuthLoading(true);
    try {
      if (Platform.OS === 'web' || !await SecureStore.isAvailableAsync()) return;
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!savedToken) return;
      const profile = await getProfile(savedToken);
      setToken(savedToken);
      setUser(profile);
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      setToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, authLoading, login, logout, restoreSession }}>
      {children}
    </AuthContext.Provider>
  );
}
