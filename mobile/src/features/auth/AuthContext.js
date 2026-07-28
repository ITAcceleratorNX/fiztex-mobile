import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@shared/api/authApi';
import { onSessionExpired } from '@shared/api/client';
import {
  getBiometricsEnabled,
  setBiometricsEnabled,
  getBiometricAvailability,
  authenticateWithBiometrics,
  biometricLabel,
} from './biometrics';

const TOKEN_KEY = 'fiztex.auth.token';
const PROFILE_KEY = 'fiztex.auth.profile';

const MOBILE_ROLES = new Set(['STUDENT', 'PARENT', 'TEACHER']);

const AuthContext = createContext(null);

async function readProfile() {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [token, setTokenState] = useState(null);
  const [profile, setProfileState] = useState(null);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [biometricMeta, setBiometricMeta] = useState({
    available: false,
    label: 'биометрию',
    types: [],
  });

  const clearLocal = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(PROFILE_KEY);
    await setBiometricsEnabled(false);
    setTokenState(null);
    setProfileState(null);
    setBiometricsEnabledState(false);
    setUnlocked(false);
  }, []);

  const persistSession = useCallback(async (loginResponse) => {
    const role = loginResponse.role;
    if (!MOBILE_ROLES.has(role)) {
      const err = new Error('Этот аккаунт предназначен для веб-админки, не для мобильного приложения.');
      err.status = 403;
      throw err;
    }
    const nextProfile = { role, fullName: loginResponse.fullName || '' };
    await SecureStore.setItemAsync(TOKEN_KEY, loginResponse.token);
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(nextProfile));
    setTokenState(loginResponse.token);
    setProfileState(nextProfile);
    setUnlocked(true);
    return nextProfile;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedToken, storedProfile, bioOn, availability] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          readProfile(),
          getBiometricsEnabled(),
          getBiometricAvailability(),
        ]);
        if (cancelled) return;
        setBiometricMeta({
          available: availability.available,
          label: biometricLabel(availability.types),
          types: availability.types,
        });
        setBiometricsEnabledState(bioOn);
        if (storedToken && storedProfile) {
          setTokenState(storedToken);
          setProfileState(storedProfile);
          // Require Face ID unlock when biometrics are on; otherwise auto-enter.
          setUnlocked(!bioOn);
        } else {
          setUnlocked(false);
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      clearLocal();
    });
  }, [clearLocal]);

  const signInWithResponse = useCallback(
    async (loginResponse) => persistSession(loginResponse),
    [persistSession],
  );

  const signOut = useCallback(async () => {
    const current = token;
    await clearLocal();
    if (current) authApi.logout(current);
  }, [clearLocal, token]);

  const unlockWithBiometrics = useCallback(async () => {
    if (!token || !profile) {
      return { success: false, error: 'no_session' };
    }
    const result = await authenticateWithBiometrics({
      promptMessage: `Вход в Fiztex (${biometricMeta.label})`,
    });
    if (result.success) {
      setUnlocked(true);
      return { success: true };
    }
    return { success: false, error: result.error || 'failed' };
  }, [token, profile, biometricMeta.label]);

  const enableBiometrics = useCallback(async () => {
    const availability = await getBiometricAvailability();
    setBiometricMeta({
      available: availability.available,
      label: biometricLabel(availability.types),
      types: availability.types,
    });
    if (!availability.available) {
      return { success: false, error: 'unavailable' };
    }
    const result = await authenticateWithBiometrics({
      promptMessage: `Включить ${biometricLabel(availability.types)} для входа`,
    });
    if (!result.success) return { success: false, error: result.error || 'failed' };
    await setBiometricsEnabled(true);
    setBiometricsEnabledState(true);
    return { success: true };
  }, []);

  const disableBiometrics = useCallback(async () => {
    await setBiometricsEnabled(false);
    setBiometricsEnabledState(false);
    return { success: true };
  }, []);

  const refreshBiometricMeta = useCallback(async () => {
    const availability = await getBiometricAvailability();
    setBiometricMeta({
      available: availability.available,
      label: biometricLabel(availability.types),
      types: availability.types,
    });
    return availability;
  }, []);

  const value = useMemo(
    () => ({
      bootstrapping,
      token,
      profile,
      role: profile?.role || null,
      fullName: profile?.fullName || '',
      isAuthenticated: Boolean(token && profile && unlocked),
      needsBiometricUnlock: Boolean(token && profile && biometricsEnabled && !unlocked),
      biometricsEnabled,
      biometricMeta,
      signInWithResponse,
      signOut,
      unlockWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      refreshBiometricMeta,
    }),
    [
      bootstrapping,
      token,
      profile,
      unlocked,
      biometricsEnabled,
      biometricMeta,
      signInWithResponse,
      signOut,
      unlockWithBiometrics,
      enableBiometrics,
      disableBiometrics,
      refreshBiometricMeta,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
