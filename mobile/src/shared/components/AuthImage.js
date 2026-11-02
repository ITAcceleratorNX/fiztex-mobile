import React, { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';

/**
 * `Image` для закрытого адреса: содержимое отдаётся только с заголовком `Authorization`.
 *
 * На телефоне заголовок понимает сам нативный загрузчик (`source.headers`). В браузере
 * (Expo Web) `Image` превращается в `<img>`, который заголовков не шлёт: сервер отвечал 401,
 * и у учителя на месте фотографий работы были пустые квадраты — ни миниатюры, ни крупного
 * просмотра (QA-02, B2-037). Здесь картинка в вебе забирается запросом с тем же заголовком и
 * показывается как `blob:`-ссылка, которая освобождается при смене адреса и уходе с экрана.
 */
export function AuthImage({ source, ...props }) {
  const uri = source?.uri;
  const headers = source?.headers;
  const needsFetch = Platform.OS === 'web' && Boolean(headers?.Authorization) && /^https?:/.test(uri || '');
  const [blobUri, setBlobUri] = useState(null);

  useEffect(() => {
    if (!needsFetch) return undefined;
    let cancelled = false;
    let created = null;
    setBlobUri(null);
    fetch(uri, { headers })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        created = URL.createObjectURL(blob);
        setBlobUri(created);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
    // Заголовок меняется вместе с токеном — тогда и нужен новый запрос.
  }, [needsFetch, uri, headers?.Authorization]);

  if (!needsFetch) return <Image source={source} {...props} />;
  return <Image source={blobUri ? { uri: blobUri } : undefined} {...props} />;
}
