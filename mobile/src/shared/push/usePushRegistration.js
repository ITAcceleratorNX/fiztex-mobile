import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@features/auth/AuthContext';
import { currentPermissionGranted, registerThisDevice } from './registration';

/**
 * Держит регистрацию телефона актуальной, пока есть сессия:
 * - после входа и на старте с сессией — регистрация (с вопросом о разрешении, если его ещё не задавали);
 * - сменился push-токен — регистрация заново;
 * - вернулись в приложение, а разрешение за это время выдали или отозвали в настройках — регистрация или
 *   отвязка. Без изменения разрешения возвращение в приложение запросов не шлёт.
 */
export function usePushRegistration() {
  const { isAuthenticated, token } = useAuth();
  const lastPermission = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated || !token) return undefined;
    let active = true;

    const register = async (askPermission) => {
      await registerThisDevice(token, { askPermission });
      if (active) lastPermission.current = await currentPermissionGranted();
    };
    register(true);

    const tokenSubscription = Notifications.addPushTokenListener(() => {
      if (active) register(false);
    });
    const appStateSubscription = AppState.addEventListener('change', async (state) => {
      if (!active || state !== 'active') return;
      const granted = await currentPermissionGranted();
      if (active && lastPermission.current !== null && granted !== lastPermission.current) register(false);
    });

    return () => {
      active = false;
      tokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, token]);
}
