import { useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { contentAssetsApi } from '@shared/api/contentAssetsApi';

/**
 * Политика вставок (CONTENT-EMBED-001) — одна на сессию: форматы и лимиты меняются только
 * с выкладкой сервера, а полей с редактором на экране бывает несколько (вопросы теста).
 *
 * Пока ответа нет и если запрос не удался (в том числе в локальном демо), загрузка считается
 * выключенной: кнопки вставки не показываются, текст правится как обычно. Неудачный ответ
 * не запоминается — следующее открытие редактора спросит ещё раз.
 */
let cached = null;

const DISABLED = { enabled: false };

export function useContentEmbedPolicy(enabled = true) {
  const { token } = useAuth();
  const [policy, setPolicy] = useState(() => (cached?.token === token && cached.value ? cached.value : null));

  useEffect(() => {
    if (!enabled || !token) return undefined;
    let alive = true;
    if (cached?.token !== token) {
      const entry = { token, value: null, promise: null };
      entry.promise = contentAssetsApi.policy(token).then(
        (value) => {
          entry.value = value ?? DISABLED;
          return entry.value;
        },
        () => {
          if (cached === entry) cached = null;
          return DISABLED;
        },
      );
      cached = entry;
    }
    cached.promise.then((value) => {
      if (alive) setPolicy(value);
    });
    return () => {
      alive = false;
    };
  }, [enabled, token]);

  return enabled ? policy : null;
}
