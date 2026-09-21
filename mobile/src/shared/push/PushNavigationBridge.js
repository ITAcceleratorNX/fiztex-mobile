import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@features/auth/AuthContext';
import { requestChildSelection } from '@shared/state/SelectedChild';
import { navigationArgs, readyToNavigate, resolvePushTarget, responseData } from './routes';

function currentRootRoute(navigationRef) {
  if (!navigationRef.isReady()) return null;
  const state = navigationRef.getRootState();
  return state?.routes?.[state.index ?? 0]?.name ?? null;
}

/**
 * Переход по нажатию на push-уведомление.
 *
 * Нажатие запоминается и исполняется, когда можно: сессия восстановлена (и разблокирована Face ID),
 * навигатор готов и открыт раздел роли. На холодном старте всё это случается позже, чем приходит нажатие.
 * Куда вести, решает `routes.js`; здесь — только ожидание и сам переход.
 *
 * @param {{ navigationRef: object, rootRouteFor: (role: string|null) => string|null }} props
 */
export function PushNavigationBridge({ navigationRef, rootRouteFor }) {
  const { isAuthenticated, role, accountId } = useAuth();
  const [pending, setPending] = useState(null);
  const [rootRoute, setRootRoute] = useState(() => currentRootRoute(navigationRef));
  const handled = useRef(new Set());

  const accept = useCallback((response) => {
    const data = responseData(response, Notifications.DEFAULT_ACTION_IDENTIFIER);
    const id = response?.notification?.request?.identifier;
    if (!data || !id || handled.current.has(id)) return;
    handled.current.add(id);
    setPending({ id, data });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let active = true;
    // Нажатие, которым приложение запустили, — до того, как появился слушатель.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (active && response) accept(response);
      })
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(accept);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [accept]);

  useEffect(() => {
    const update = () => setRootRoute(currentRootRoute(navigationRef));
    update();
    const offReady = navigationRef.addListener('ready', update);
    const offState = navigationRef.addListener('state', update);
    return () => {
      offReady();
      offState();
    };
  }, [navigationRef]);

  useEffect(() => {
    if (!pending) return;
    const expected = rootRouteFor(role);
    const ready = readyToNavigate({
      isAuthenticated,
      navigatorReady: navigationRef.isReady(),
      currentRootRoute: rootRoute,
      rootRoute: expected,
    });
    if (!ready) return;

    setPending(null);
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    const target = resolvePushTarget(pending.data, { role, accountId, rootRoute: expected });
    if (target.type !== 'open') return;
    if (target.childId != null) requestChildSelection(target.childId);
    navigationRef.navigate(...navigationArgs(target));
  }, [pending, isAuthenticated, role, accountId, rootRoute, rootRouteFor, navigationRef]);

  return null;
}
