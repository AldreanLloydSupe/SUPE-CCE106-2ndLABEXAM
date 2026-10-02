import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ApiError, getProfile } from '@/services/api';
import type { User } from '@/types/api';

const TOKEN_KEY = 'student-service-access-token';
const RESTORE_TIMEOUT_MS = 15000;
const STORAGE_ERROR = 'Unable to access secure sign-in storage. Unlock your device and try again.';
const LOGOUT_ERROR = 'Your saved sign-in could not be removed. Retry before closing the app; otherwise your session may return when you reopen it.';

type AuthError = { action: 'restore' | 'logout'; message: string };

type AuthContextValue = {
  token: string | null;
  user: User | null;
  authLoading: boolean;
  authError: AuthError | null;
  login: (accessToken: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const operation = useRef(0);
  const restoreRequest = useRef<AbortController | null>(null);
  const storageQueue = useRef<Promise<unknown>>(Promise.resolve());

  // Keep writes ordered so an earlier login cannot save a token after logout.
  const withStorage = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const pending = storageQueue.current.then(async () => {
      if (!await SecureStore.isAvailableAsync()) throw new Error(STORAGE_ERROR);
      return task();
    });
    storageQueue.current = pending.catch(() => undefined);
    return pending;
  }, []);

  const beginOperation = useCallback(() => {
    restoreRequest.current?.abort();
    restoreRequest.current = null;
    operation.current += 1;
    return operation.current;
  }, []);

  const clearSavedToken = useCallback((current: number) => withStorage(async () => {
    if (current !== operation.current) return;
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // If deletion fails, replacing the token with an empty value also prevents restoration.
      await SecureStore.setItemAsync(TOKEN_KEY, '');
    }
  }), [withStorage]);

  const login = useCallback(async (accessToken: string, userData: User) => {
    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new Error('The sign-in response did not contain a valid access token.');
    }
    const current = beginOperation();
    setAuthError(null);
    try {
      if (Platform.OS !== 'web') {
        try {
          await withStorage(async () => {
            if (current === operation.current) await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
          });
        } catch {
          throw new Error('Unable to save your sign-in securely. Unlock your device and try again.');
        }
      }
      if (current !== operation.current) throw new Error('Sign-in was cancelled. Please try again.');
      setToken(accessToken);
      setUser(userData);
    } finally {
      if (current === operation.current) setAuthLoading(false);
    }
  }, [beginOperation, withStorage]);

  const logout = useCallback(async () => {
    const current = beginOperation();
    setAuthLoading(true);
    setAuthError(null);
    // Protected routes close immediately, even if device storage is unavailable.
    setToken(null);
    setUser(null);
    try {
      if (Platform.OS !== 'web') await clearSavedToken(current);
    } catch {
      if (current === operation.current) setAuthError({ action: 'logout', message: LOGOUT_ERROR });
    } finally {
      if (current === operation.current) setAuthLoading(false);
    }
  }, [beginOperation, clearSavedToken]);

  const restoreSession = useCallback(async () => {
    // Web sessions are memory-only; never call native storage or discard an active web session.
    if (Platform.OS === 'web') {
      setAuthLoading(false);
      return;
    }
    const current = beginOperation();
    setAuthLoading(true);
    setAuthError(null);
    setToken(null);
    setUser(null);
    let checkingProfile = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    restoreRequest.current = controller;
    try {
      const savedToken = await withStorage(async () => {
        if (current !== operation.current) return null;
        return SecureStore.getItemAsync(TOKEN_KEY);
      });
      if (current !== operation.current || !savedToken) return;
      checkingProfile = true;
      timeout = setTimeout(() => controller.abort(), RESTORE_TIMEOUT_MS);
      const profile = await getProfile(savedToken, controller.signal);
      if (current !== operation.current) return;
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
        throw new Error('Invalid profile response.');
      }
      setToken(savedToken);
      setUser(profile);
    } catch (error) {
      if (current !== operation.current) return;
      if (error instanceof ApiError && error.status === 401) {
        try {
          await clearSavedToken(current);
        } catch {
          if (current === operation.current) setAuthError({ action: 'logout', message: LOGOUT_ERROR });
        }
      } else {
        // Network/server/storage failures do not prove that a saved token is invalid.
        setAuthError({
          action: 'restore',
          message: checkingProfile
            ? 'We could not verify your saved session. Check your connection and try again. Your saved sign-in has been kept.'
            : STORAGE_ERROR,
        });
      }
    } finally {
      if (timeout) clearTimeout(timeout);
      if (current === operation.current) {
        restoreRequest.current = null;
        setAuthLoading(false);
      }
    }
  }, [beginOperation, clearSavedToken, withStorage]);

  useEffect(() => {
    void restoreSession();
    return () => {
      // Also covers React Strict Mode's effect cleanup and a provider unmount.
      beginOperation();
    };
  }, [beginOperation, restoreSession]);

  const value = useMemo(() => ({
    token, user, authLoading, authError, login, logout, restoreSession,
  }), [token, user, authLoading, authError, login, logout, restoreSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
