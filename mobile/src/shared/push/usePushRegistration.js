import { useEffect } from 'react';
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
  useEffect(() => {
    if (Platform.OS === 'web' || !isAuthenticated || !token) return undefined;
    let active = true;
    let lastPermission = null;
    let lastDeviceToken = null;
    let pending = null;
    let running = false;
    let foreground = AppState.currentState === 'active';
    const sameToken = (deviceToken) => deviceToken && lastDeviceToken
      && deviceToken.type === lastDeviceToken.type && deviceToken.data === lastDeviceToken.data;

    // Один запрос за раз, последний новый токен не теряется. Стартовый native-запрос
    // тоже вызывает listener; после успешной регистрации его повтор пропускается.
    const drain = async () => {
      if (running) return;
      running = true;
      try {
        while (active && pending) {
          const next = pending;
          pending = null;
          if (!next.force && sameToken(next.devicePushToken)) continue;
          const result = await registerThisDevice(token, {
            ...next, isCurrent: () => active,
          });
          if (!active) return;
          if (result.action === 'register') lastDeviceToken = result.devicePushToken;
          lastPermission = await currentPermissionGranted();
        }
      } finally {
        running = false;
      }
    };
    const register = (askPermission, devicePushToken, force = false) => {
      // Пока другая регистрация идёт, даже прежний токен может быть последним
      // событием. Сначала сохранить его, затем сравнить после завершения запроса.
      if (!active || (!force && !running && !pending && sameToken(devicePushToken))) return;
      pending = {
        askPermission: askPermission || pending?.askPermission || false,
        devicePushToken: devicePushToken ?? pending?.devicePushToken,
        force: force || pending?.force || false,
      };
      void drain();
    };

    const tokenSubscription = Notifications.addPushTokenListener((devicePushToken) => {
      register(false, devicePushToken);
    });
    const appStateSubscription = AppState.addEventListener('change', async (state) => {
      const wasForeground = foreground;
      foreground = state === 'active';
      if (!active || !foreground || wasForeground) return;
      const granted = await currentPermissionGranted();
      if (active && lastPermission !== null && granted !== lastPermission) register(false, undefined, true);
    });
    register(true);

    return () => {
      active = false;
      pending = null;
      tokenSubscription.remove();
      appStateSubscription.remove();
    };
  }, [isAuthenticated, token]);
}
