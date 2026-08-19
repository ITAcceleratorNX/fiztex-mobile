import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT = 8080;

/**
 * Сервер по умолчанию.
 *
 * Здесь именно origin, без `/api`: путь каждого запроса уже начинается с `/api`
 * (`request('/api/homework/my')`), и хвост в базовом адресе дал бы `/api/api/…`.
 */
const REMOTE_API_URL = 'https://bestsauda.kz';

// Порядок разрешения:
//   1. EXPO_PUBLIC_API_URL — ручное указание, перекрывает всё
//   2. EXPO_PUBLIC_API_LOCAL=1 — локальный бэкенд: LAN-хост Metro (реальное
//      устройство через Expo Go), иначе адрес эмулятора
//   3. REMOTE_API_URL
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (process.env.EXPO_PUBLIC_API_LOCAL === '1') return localBaseUrl();
  return REMOTE_API_URL;
}

function localBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${PORT}`;
  }

  return Platform.OS === 'android' ? `http://10.0.2.2:${PORT}` : `http://localhost:${PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[fiztex] API:', API_BASE_URL);
}
