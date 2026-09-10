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

/**
 * Типы, которые системный выбор файлов вообще предлагает.
 *
 * <p>Это не проверка, а сужение выбора: неподдерживаемый файл нельзя выбрать, поэтому и
 * отказывать за него не приходится. Раньше выбрать можно было что угодно — архив,
 * картинку из «Файлов», — а узнавал об этом ученик только после «Отправить», когда
 * работа уже набрана: сервер отклоняет отправку целиком, и вместе с файлом пропадал
 * набранный текст.
 *
 * <p>Решает всё равно бэк: список повторяет {@code HomeworkAttachmentPolicy.FILE_EXTENSIONS},
 * и при расхождении лишнее просто не покажется в пикере — отказа это не отменяет.
 */
const FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

/** Подпись под кнопками — то же, что примет сервер, словами ученика. */
export const ATTACHMENT_HINT = 'Фото — JPG, PNG или HEIC. Файлы — PDF, Word, Excel, PowerPoint или TXT.';

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

/** Файлы решения: только те форматы, которые примет сервер (см. `FILE_MIME_TYPES`). */
export async function pickFiles() {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: FILE_MIME_TYPES,
  });
  if (result.canceled) return [];
  return (result.assets ?? []).map(fromDocument);
}

// Реэкспорт: `sizeLabel` переехал в `shared/api/files.js`, когда размер файла
// понадобился ещё и материалам урока. Экраны ДЗ импортируют его отсюда с самого
// начала, и править их ради переезда было бы правкой без причины.
export { sizeLabel } from '@shared/api/files';
