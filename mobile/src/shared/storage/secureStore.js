/**
 * Защищённое хранилище — Keychain / Keystore через `expo-secure-store`.
 *
 * Экраны импортируют его отсюда, а не из пакета напрямую: у пакета нет веб-реализации
 * (`setValueWithKeyAsync is not a function`), и Expo web падал на входе. Веб-замена лежит
 * рядом (`secureStore.web.js`), Metro подставляет её сам по платформе.
 */
export { getItemAsync, setItemAsync, deleteItemAsync } from 'expo-secure-store';
