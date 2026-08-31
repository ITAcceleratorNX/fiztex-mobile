/**
 * Общее для всех multipart-запросов приложения.
 *
 * Вынесено из `homeworkApi`, когда те же две вещи понадобились сервисным заявкам:
 * правило «как отдать файл из React Native» одно на приложение, и вторая его копия
 * разъехалась бы с первой ровно тогда, когда правило поменяется.
 */

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
 * Заголовок для `<Image source={{uri, headers}}>`: содержимое файла отдаётся закрытым
 * эндпоинтом, и картинка обязана представиться сама — ходит за ней нативный загрузчик,
 * мимо нашего `request`.
 */
export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
