import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Выбор вложений к работе (ТЗ HOMEWORK-003 §3).
 *
 * Лимиты здесь не проверяются намеренно: их считает бэк (`HomeworkAttachmentPolicy`), и
 * вторая копия правил на клиенте разъехалась бы с первой ровно тогда, когда её поменяют.
 * Клиент отвечает за выбор файла и за понятный отказ, если система не дала доступ.
 */

/** Нормализованное вложение: то, что понимает `homeworkApi.submit`. */
function fromImage(asset) {
  return {
    uri: asset.uri,
    name: asset.fileName || `photo-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
    kind: 'photo',
    sizeBytes: asset.fileSize ?? null,
  };
}

function fromDocument(asset) {
  return {
    uri: asset.uri,
    name: asset.name || 'file',
    type: asset.mimeType || 'application/octet-stream',
    kind: 'file',
    sizeBytes: asset.size ?? null,
  };
}

/**
 * Фотографии решения. Разрешение спрашивается только при выборе из галереи — просить
 * его заранее, на открытии задания, значит спрашивать у тех, кто прикреплять ничего
 * не собирался.
 */
export async function pickPhotos() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Нет доступа к фотографиям',
      'Разрешите приложению доступ к галерее в настройках телефона, чтобы прикрепить фото.',
    );
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.85,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).map(fromImage);
}

/** Файлы решения: pdf, документы, что угодно — тип ограничивает бэк, а не выбор. */
export async function pickFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).map(fromDocument);
}

/** «1,2 МБ» — подпись под именем файла; у неизвестного размера её просто нет. */
export function sizeLabel(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} МБ`;
}
