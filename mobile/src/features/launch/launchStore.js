import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Отметка «первый запуск уже был». В AsyncStorage, а не в SecureStore: связку ключей iOS не
 * чистит при удалении приложения, и после переустановки анимация не показалась бы снова.
 */
const KEY = 'fiztex.launch.introSeen';

/** Не прочиталось — считаем, что запуск не первый: лучше пропустить анимацию, чем повторять. */
export async function readIntroSeen() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true;
  }
}

export async function rememberIntroSeen() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // Не записалось — в худшем случае анимация покажется ещё раз; входу это не мешает.
  }
}
