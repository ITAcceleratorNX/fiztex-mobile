import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MAX_PHOTOS, MAX_PHOTO_BYTES } from '@shared/api/serviceRequestsMap';

/**
 * Снимки к заявке (ТЗ SERVICE-FE-002 §7): камера или галерея, предпросмотр, удаление
 * до отправки, до трёх штук.
 *
 * В отличие от вложений к домашней работе, лимиты здесь проверяются и на клиенте.
 * Причина в ТЗ, а не во вкусе: §7 и §14 требуют показать «слишком большой файл»
 * отдельным состоянием, а узнать о нём после отправки — значит заставить человека ждать
 * загрузку десятка мегабайт ради отказа. Числа при этом не выдуманы здесь, а взяты из
 * `serviceRequestsMap`, где записаны те же значения, что у `ServiceRequestPhotoPolicy`.
 */

/**
 * Формат определяется по расширению — так же, как на бэкенде: мобильные камеры
 * регулярно отдают снимок как `application/octet-stream`, и отбор по заявленному типу
 * отклонял бы нормальные фотографии.
 */
const ALLOWED = /\.(jpg|jpeg|png|heic|heif)$/i;

function fromAsset(asset) {
  const name = asset.fileName || `photo-${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    type: asset.mimeType || 'image/jpeg',
    sizeBytes: asset.fileSize ?? null,
  };
}

/**
 * @returns {{photos: Array, error: string|null}} снимки, прошедшие проверку, и текст
 *   отказа для первого не прошедшего — форма показывает его под полосой предпросмотра
 */
function check(picked, alreadyPicked) {
  const room = MAX_PHOTOS - alreadyPicked;
  if (room <= 0) {
    return { photos: [], error: `Можно приложить не больше ${MAX_PHOTOS} фотографий.` };
  }

  const photos = [];
  for (const photo of picked.slice(0, room)) {
    if (!ALLOWED.test(photo.name)) {
      return { photos, error: `Файл ${photo.name} не в поддерживаемом формате: нужны JPG, PNG или HEIC.` };
    }
    if (photo.sizeBytes != null && photo.sizeBytes > MAX_PHOTO_BYTES) {
      return { photos, error: `Фотография ${photo.name} больше 10 МБ — выберите файл поменьше.` };
    }
    photos.push(photo);
  }

  const dropped = picked.length - photos.length;
  return {
    photos,
    error: dropped > 0 ? `Можно приложить не больше ${MAX_PHOTOS} фотографий.` : null,
  };
}

/**
 * Разрешение спрашивается в момент выбора, а не на открытии формы: просить доступ к
 * галерее у того, кто прикладывать ничего не собирался, — просить зря.
 */
export async function pickFromLibrary(alreadyPicked = 0) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Нет доступа к фотографиям',
      'Разрешите приложению доступ к галерее в настройках телефона, чтобы приложить фото.',
    );
    return { photos: [], error: null };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: Math.max(1, MAX_PHOTOS - alreadyPicked),
    quality: 0.85,
  });
  if (result.canceled) return { photos: [], error: null };
  return check((result.assets ?? []).map(fromAsset), alreadyPicked);
}

export async function pickFromCamera(alreadyPicked = 0) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      'Нет доступа к камере',
      'Разрешите приложению доступ к камере в настройках телефона, чтобы снять фото.',
    );
    return { photos: [], error: null };
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
  if (result.canceled) return { photos: [], error: null };
  return check((result.assets ?? []).map(fromAsset), alreadyPicked);
}
