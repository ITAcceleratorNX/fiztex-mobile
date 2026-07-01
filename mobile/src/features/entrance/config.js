import { Platform } from 'react-native';

// Android emulator → host machine; iOS simulator → localhost
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080');
