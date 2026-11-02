/**
 * Общее для всех multipart-запросов приложения.
 *
 * Вынесено из `homeworkApi`, когда те же две вещи понадобились сервисным заявкам:
 * правило «как отдать файл из React Native» одно на приложение, и вторая его копия
 * разъехалась бы с первой ровно тогда, когда правило поменяется.
 */
import { Platform } from 'react-native';
import { isDemoToken } from '../demo/session';

/**
 * Вложение в форме multipart. React Native ждёт `{uri, name, type}` — не Blob: файл
 * не читается в память, а отдаётся ссылкой на локальный путь, и фотография на 8 МБ
 * не превращается в 8 МБ в куче JS.
 */
export function asUpload(picked) {
  return {
    uri: picked.uri,
    name: picked.name || picked.fileName || fallbackName(picked),
    type: picked.type || picked.mimeType || 'application/octet-stream',
  };
}

function fallbackName(picked) {
  const ext = (picked.mimeType || picked.type || '').split('/')[1];
  return `upload.${ext || 'bin'}`;
}

/**
 * Положить вложение в форму. Все multipart-запросы приложения добавляют файлы только так.
 *
 * Объект `{uri, name, type}` понимает только нативный `FormData` React Native. Браузер
 * (Expo Web) его не знает и приводит к строке: в запрос уходит поле `[object Object]`,
 * а сервер видит работу без единой фотографии — «Работа пустая», если текста нет, и
 * молча потерянные снимки, если он есть. В вебе поэтому уходит сам `File` из пикера
 * (`asset.file`), а если пикер дал только `data:`-ссылку — `Blob`, собранный из неё.
 */
export function appendUpload(form, field, picked) {
  const upload = asUpload(picked);
  const blob = Platform.OS === 'web' ? webBlob(picked, upload.type) : null;
  if (blob) form.append(field, blob, upload.name);
  else form.append(field, upload);
}

function webBlob(picked, type) {
  if (typeof Blob === 'undefined') return null;
  if (picked.file instanceof Blob) return picked.file;
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(picked.uri || '');
  if (!match) return null;
  const [, mime, base64, payload] = match;
  const raw = base64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return new Blob([bytes], { type: mime || type });
}

/**
 * Заголовок для `<Image source={{uri, headers}}>`: содержимое файла отдаётся закрытым
 * эндпоинтом, и картинка обязана представиться сама — ходит за ней нативный загрузчик,
 * мимо нашего `request`.
 */
export function authHeaders(token) {
  return token && !isDemoToken(token) ? { Authorization: `Bearer ${token}` } : undefined;
}
