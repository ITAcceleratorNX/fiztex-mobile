import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT = 8080;

// The IP of the machine running the backend. Resolution order:
//   1. EXPO_PUBLIC_API_URL env var (set it to override everything, e.g. staging).
//   2. The dev-machine LAN IP that Metro is served from (works on a real phone via
//      Expo Go — `localhost` there would point at the phone itself, not your Mac).
//   3. Emulator/simulator fallbacks (Android emulator reaches the host via 10.0.2.2).
function resolveBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

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
  console.log('[fiztex] admissions API:', API_BASE_URL);
}
