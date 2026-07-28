import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const BIO_FLAG_KEY = 'fiztex.auth.biometricsEnabled';

export async function getBiometricsEnabled() {
  const v = await SecureStore.getItemAsync(BIO_FLAG_KEY);
  return v === '1';
}

export async function setBiometricsEnabled(enabled) {
  if (enabled) await SecureStore.setItemAsync(BIO_FLAG_KEY, '1');
  else await SecureStore.deleteItemAsync(BIO_FLAG_KEY);
}

export async function getBiometricAvailability() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
  const types = hasHardware
    ? await LocalAuthentication.supportedAuthenticationTypesAsync()
    : [];
  return { hasHardware, isEnrolled, types, available: hasHardware && isEnrolled };
}

export function biometricLabel(types = []) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'отпечаток';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'биометрию';
}

export async function authenticateWithBiometrics({ promptMessage, cancelLabel } = {}) {
  const { available } = await getBiometricAvailability();
  if (!available) {
    return { success: false, error: 'unavailable' };
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage || 'Вход в Fiztex',
    cancelLabel: cancelLabel || 'Отмена',
    fallbackLabel: 'Использовать пароль',
    disableDeviceFallback: false,
  });
  return result;
}
