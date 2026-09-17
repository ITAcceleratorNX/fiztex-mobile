import * as SecureStore from 'expo-secure-store';

const KEY = 'fiztex.push.installationId';

let cached = null;

/**
 * Постоянный идентификатор установки приложения — ключ регистрации телефона на бэке.
 *
 * Не зависит ни от аккаунта, ни от push-токена: токен Expo может смениться, на телефоне может
 * войти другой человек, а установка остаётся той же — и бэк переносит её, а не заводит вторую.
 * При выходе не стирается. Лежит в SecureStore: на iOS это Keychain, и переустановка приложения
 * возвращает тот же идентификатор.
 */
export function getInstallationId() {
  if (!cached) {
    cached = (async () => {
      const stored = await SecureStore.getItemAsync(KEY);
      if (isUuid(stored)) return stored;
      const created = randomUuid();
      await SecureStore.setItemAsync(KEY, created);
      return created;
    })().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

export function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * UUID v4. `crypto.randomUUID` в Hermes нет, а криптостойкость здесь не нужна: идентификатор
 * не секрет, от него требуется только не совпасть с чужим.
 */
export function randomUuid() {
  const hex = [];
  for (let i = 0; i < 32; i += 1) hex.push(Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
