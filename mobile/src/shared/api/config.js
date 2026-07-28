import { Platform } from 'react-native';
import Constants from 'expo-constants';

const PORT = 8080;

// Resolution order:
//   1. EXPO_PUBLIC_API_URL
//   2. Metro LAN host (real device via Expo Go)
//   3. Emulator/simulator fallbacks
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
  console.log('[fiztex] API:', API_BASE_URL);
}
