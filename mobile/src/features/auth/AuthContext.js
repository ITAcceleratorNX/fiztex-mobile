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

/**
 * Кого пускает мобильное приложение.
 *
 * Администратор и охрана добавлены ради сервисных заявок (ТЗ SERVICE-FE-002 §16): автор
 * заявки — учитель, администратор и охрана, и любой из них должен уметь завести её с
 * телефона. Учебных разделов у двух последних нет и не появится — их приложение состоит
 * из заявок и профиля.
 *
 * Хозяйственные службы (`CLEANING`, `TECHNICIAN`) добавлены со своими экранами
 * (SERVICE-FE-003): общая очередь службы, взятие заявки в работу, возврат, передача и
 * выполнение. Заявки они и заводят — тем же авторским flow, что все остальные.
 *
 * Из ролей приложения вне списка остаётся только `SUPER_ADMIN`: его раздел —
 * отдельная frontend-задача после отдельного дизайна.
 */
const MOBILE_ROLES = new Set([
  'STUDENT', 'PARENT', 'TEACHER', 'ADMIN', 'SECURITY', 'CLEANING', 'TECHNICIAN',
]);

/**
 * Пускает ли приложение такую роль.
 *
 * Спрашивается на экране входа — до того, как предложить биометрию: отказ, найденный
 * после согласия на Face ID, оставлял бы включённую биометрию у сессии, которая так и
 * не открылась.
 */
export const ROLE_REJECTED =
  'Этот аккаунт не поддерживается мобильным приложением — войдите с компьютера.';

export function isMobileRole(role) {
  return MOBILE_ROLES.has(role);
}

const AuthContext = createContext(null);

/**
 * Момент, до которого токен действителен, — из его же полезной нагрузки.
 *
 * Читается локально и без проверки подписи: доверять этому значению нельзя и не нужно —
 * настоящую проверку делает бэкенд. Здесь оно решает единственный вопрос: стоит ли вообще
 * входить в приложение с этим токеном или сразу показать вход.
 */
function tokenExpiresAt(token) {
  const payload = String(token || '').split('.')[1];
  if (!payload) return null;
  try {
    const json = decodeBase64Url(payload);
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof atob === 'function') return atob(padded);
  return Buffer.from(padded, 'base64').toString('binary');
}

/** Токен без `exp` считаем годным: решать за бэкенд по отсутствию поля — хуже, чем спросить. */
export function isTokenExpired(token) {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt != null && expiresAt <= Date.now();
}

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
      const err = new Error(ROLE_REJECTED);
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
        if (storedToken && storedProfile && !isTokenExpired(storedToken)) {
          setTokenState(storedToken);
          setProfileState(storedProfile);
          // Require Face ID unlock when biometrics are on; otherwise auto-enter.
          setUnlocked(!bioOn);
        } else {
          // Протухший токен выбрасывается здесь, а не в первом же запросе экрана: иначе
          // приложение открывалось внутри, тут же ловило 401 и возвращало на вход —
          // со стороны это выглядит как «вход срабатывает только со второй попытки».
          if (storedToken) await clearLocal();
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
