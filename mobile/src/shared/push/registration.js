import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { notificationDevicesApi } from '@shared/api/notificationDevicesApi';
import { ensureAndroidChannels } from './channels';
import { getInstallationId } from './installationId';

/** Эта установка когда-то регистрировалась: отвязывать при выходе или отказе в разрешении есть что. */
const REGISTERED_KEY = 'fiztex.push.registered';

/**
 * Как показывать уведомление, пришедшее, пока приложение открыто: так же, как в фоне. Иначе новость
 * «урок отменён» пропала бы молча у того, кто как раз смотрит расписание.
 */
export function configurePushPresentation() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Проект EAS: без него Expo не выдаст push-токен. Появляется в app.json после `eas init`. */
export function resolveProjectId(constants) {
  return constants?.expoConfig?.extra?.eas?.projectId ?? constants?.easConfig?.projectId ?? null;
}

/**
 * Разрешена ли регистрация на эмуляторе. Android-эмулятор с сервисами Google (образ `google_apis_playstore`)
 * получает пуши по-настоящему — это единственный способ проверить конвейер целиком, не имея телефона.
 * Симулятор iOS так не умеет, поэтому лазейка только для Android.
 *
 * В релизной сборке `__DEV__` — false, так что на проде поведение прежнее. Переменная нужна, чтобы
 * проверить пуши на эмуляторе и в собранном APK (профиль `preview`), где `__DEV__` уже выключен.
 */
export function emulatorPushAllowed(platform = Platform.OS) {
  if (platform !== 'android') return false;
  return __DEV__ || process.env.EXPO_PUBLIC_PUSH_ON_EMULATOR === '1';
}

/**
 * Что делать при регистрации — без побочных эффектов, чтобы проверять скриптом.
 *
 * @param {{ platform: string, isDevice: boolean, allowEmulator?: boolean, projectId: string|null, permissionGranted: boolean|null }} state
 * @returns {{ action: 'register'|'unregister'|'skip', reason?: string }}
 */
export function registrationPlan({ platform, isDevice, allowEmulator = false, projectId, permissionGranted }) {
  if (platform !== 'ios' && platform !== 'android') return { action: 'skip', reason: 'unsupported-platform' };
  // Симулятор push-токена Expo не получает — и это не ошибка, о которой стоит шуметь.
  if (!isDevice && !allowEmulator) return { action: 'skip', reason: 'not-a-device' };
  if (!projectId) return { action: 'skip', reason: 'no-eas-project' };
  // Уведомления запрещены — телефон отвязывается: иначе бэк слал бы пуши, которые никто не увидит.
  if (!permissionGranted) return { action: 'unregister', reason: 'permission-denied' };
  return { action: 'register' };
}

/** Разрешение есть, в том числе «тихое» на iOS (provisional): уведомления попадают в центр уведомлений. */
export function isPermissionGranted(permissions) {
  if (!permissions) return false;
  if (permissions.granted || permissions.status === 'granted') return true;
  const iosStatus = permissions.ios?.status;
  return iosStatus === Notifications.IosAuthorizationStatus?.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus?.EPHEMERAL;
}

async function readPermission(ask) {
  const current = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(current) || !ask || current.canAskAgain === false) return isPermissionGranted(current);
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return isPermissionGranted(requested);
}

function deviceLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale?.slice(0, 16) || null;
  } catch {
    return null;
  }
}

/**
 * Зарегистрировать этот телефон для push за аккаунтом токена. Вызывается после входа и на каждом старте
 * с сессией: токен Expo может смениться, а бэк переносит регистрацию той же установки сам.
 *
 * Никогда не бросает: уведомления — не то, из-за чего можно не пустить в приложение.
 *
 * @param {{ askPermission?: boolean }} options спрашивать ли разрешение, если его ещё не давали
 * @returns {Promise<{ action: string, reason?: string, error?: unknown }>}
 */
export async function registerThisDevice(authToken, { askPermission = true } = {}) {
  try {
    if (Platform.OS === 'web') return { action: 'skip', reason: 'unsupported-platform' };
    await ensureAndroidChannels();
    const projectId = resolveProjectId(Constants);
    const allowEmulator = emulatorPushAllowed();
    // Условие то же, что в плане: иначе разрешение не спросится, permissionGranted останется null,
    // и план стал бы `unregister` вместо `register`.
    const eligible = (Device.isDevice || allowEmulator) && Boolean(projectId);
    const permissionGranted = eligible ? await readPermission(askPermission) : null;
    const plan = registrationPlan({
      platform: Platform.OS,
      isDevice: Device.isDevice,
      allowEmulator,
      projectId,
      permissionGranted,
    });

    if (plan.action === 'skip') {
      if (__DEV__ && plan.reason === 'no-eas-project') {
        // eslint-disable-next-line no-console
        console.warn('[push] Нет extra.eas.projectId в app.json — выполните `eas init`. Регистрация пропущена.');
      }
      return plan;
    }
    if (plan.action === 'unregister') {
      await unregisterThisDevice(authToken);
      return plan;
    }

    const [installationId, pushToken] = await Promise.all([
      getInstallationId(),
      Notifications.getExpoPushTokenAsync({ projectId }),
    ]);
    await notificationDevicesApi.register(authToken, installationId, {
      token: pushToken.data,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      appVersion: (Application.nativeApplicationVersion || Constants.expoConfig?.version || '').slice(0, 32) || null,
      locale: deviceLocale(),
    });
    await SecureStore.setItemAsync(REGISTERED_KEY, '1');
    return plan;
  } catch (error) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[push] Регистрация телефона не удалась:', error?.message || error);
    }
    return { action: 'failed', error };
  }
}

/**
 * Отвязать телефон перед выходом — пока токен ещё действует. Не дольше трёх секунд и без ошибок: выход не
 * должен зависеть от сети, а бэк при выходе всё равно выключит установки аккаунта.
 */
export async function unregisterThisDevice(authToken) {
  try {
    if (Platform.OS === 'web' || !authToken) return;
    if ((await SecureStore.getItemAsync(REGISTERED_KEY)) !== '1') return;
    await SecureStore.deleteItemAsync(REGISTERED_KEY);
    const installationId = await getInstallationId();
    await notificationDevicesApi.unregister(authToken, installationId);
  } catch {
    /* выход важнее отвязки */
  }
}

/** Разрешение, как его видит система сейчас, — чтобы заметить, что его выдали или отозвали в настройках. */
export async function currentPermissionGranted() {
  if (Platform.OS === 'web') return false;
  try {
    return isPermissionGranted(await Notifications.getPermissionsAsync());
  } catch {
    return false;
  }
}
