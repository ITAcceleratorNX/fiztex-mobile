import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { lessonApi } from '@shared/api/lessonApi';
import { mapCurrentLesson } from '@shared/api/currentLessonMap';
import { useForegroundPolling } from './useForegroundPolling';

/**
 * Как часто перепроверяем, какой урок сейчас текущий.
 *
 * <p>Минута — не «почаще на всякий случай», а шаг, с которым меняется сам ответ: урок
 * начинается и заканчивается с точностью до минуты. Опрос идёт только в активном
 * приложении; нажатие перепроверяет урок отдельно, если запрос ещё не идёт.
 */
const REFRESH_MS = 60_000;

/**
 * Текущий (или ближайший) урок для кнопки в нижней панели.
 *
 * <p>Возвращает уже разобранный ответ: подпись, признак «идёт сейчас», id урока и слова
 * пустого состояния. Что именно считать текущим уроком, решает бэк — здесь только показ
 * и обновление по времени.
 *
 * @param {{childId?: number|null, enabled?: boolean}} options
 *   `childId` — контекст ребёнка у родителя; при его смене урок пересчитывается.
 */
export function useCurrentLesson({ childId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const context = useMemo(() => ({ token, childId, enabled }), [token, childId, enabled]);
  const currentContext = useRef(context);
  const [state, setState] = useState({ context: null, loading: true, error: null, data: null });
  const inFlight = useRef(null);

  const load = useCallback(({ silent = false } = {}) => {
    if (!token || !enabled || currentContext.current !== context) return Promise.resolve(null);
    // Нажатие, возврат из фона и таймер могут совпасть — разделяют один запрос.
    if (inFlight.current?.context === context) return inFlight.current.promise;
    const pending = { context, promise: null };
    inFlight.current = pending;
    if (!silent) setState((prev) => ({
      context, loading: true, error: null,
      data: prev.context === context ? prev.data : null,
    }));
    pending.promise = (async () => {
      try {
        const raw = await lessonApi.current(token, childId);
        if (currentContext.current !== context || inFlight.current !== pending) return null;
        const data = mapCurrentLesson(raw);
        setState({ context, loading: false, error: null, data });
        return data;
      } catch (e) {
        if (currentContext.current === context && inFlight.current === pending) {
          setState((prev) => ({
            context, loading: false,
            error: e?.message || 'Не удалось определить текущий урок',
            data: prev.context === context ? prev.data : null,
          }));
        }
        return null;
      } finally {
        if (inFlight.current === pending) inFlight.current = null;
      }
    })();
    return pending.promise;
  }, [context, token, childId, enabled]);

  useLayoutEffect(() => {
    currentContext.current = context;
    return () => {
      if (currentContext.current === context) currentContext.current = null;
      if (inFlight.current?.context === context) inFlight.current = null;
    };
  }, [context]);

  // Тикер и возврат из фона — два способа узнать, что время ушло вперёд. Второй нужен
  // отдельно: пока приложение свёрнуто, таймеры не идут, и вернувшийся через час
  // учитель иначе увидел бы урок, который давно кончился.
  const poll = useCallback(() => load({ silent: true }), [load]);
  useForegroundPolling(poll, { enabled: Boolean(token && enabled), intervalMs: REFRESH_MS });

  const current = state.context === context && token && enabled
    ? state
    : { loading: Boolean(token && enabled), error: null, data: null };
  return { loading: current.loading, error: current.error, data: current.data, reload: load };
}
