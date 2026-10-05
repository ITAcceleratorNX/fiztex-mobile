/**
 * Веб-замена `expo-secure-store` — только для Expo web (проверка в браузере).
 *
 * В браузере защищённого хранилища нет, поэтому значения лежат в `localStorage`: для
 * разработческой сборки этого достаточно, а на телефоне используется настоящий Keychain /
 * Keystore (`secureStore.js`). Обращения обёрнуты в try/catch — приватный режим и
 * запрещённое хранилище не должны ронять вход.
 */
const PREFIX = 'fiztex.secure.';

export async function getItemAsync(key) {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Хранилище недоступно — сессия проживёт до перезагрузки вкладки.
  }
}

export async function deleteItemAsync(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Нечего удалять.
  }
}
