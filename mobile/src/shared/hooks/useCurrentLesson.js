import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { lessonApi } from '@shared/api/lessonApi';
import { mapCurrentLesson } from '@shared/api/currentLessonMap';

/**
 * Как часто перепроверяем, какой урок сейчас текущий.
 *
 * <p>Минута — не «почаще на всякий случай», а шаг, с которым меняется сам ответ: урок
 * начинается и заканчивается с точностью до минуты, и подпись «Идёт: Алгебра» обязана
 * смениться на следующем звонке, а не через четверть часа (ТЗ §4). Запрос дешёвый — одна
 * строка, — а идёт он только пока приложение на экране.
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
  const [state, setState] = useState({ loading: true, error: null, data: null });
  // Держим последний запрос, чтобы ответ на отменённый (сменили ребёнка) не перезаписал
  // свежий: у кнопки один слот, и «залипший» чужой урок увёл бы не туда.
  const requestId = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!token || !enabled) {
      setState({ loading: false, error: null, data: null });
      return null;
    }
    const id = ++requestId.current;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const raw = await lessonApi.current(token, childId);
      const data = mapCurrentLesson(raw);
      if (id === requestId.current) setState({ loading: false, error: null, data });
      return data;
    } catch (e) {
      // Сбой связи не выдаём за отсутствие занятий (ТЗ §5): прежний урок остаётся на
      // кнопке, а сообщение об ошибке — отдельным состоянием.
      if (id === requestId.current) {
        setState((prev) => ({
          loading: false,
          error: e?.message || 'Не удалось определить текущий урок',
          data: prev.data,
        }));
      }
      return null;
    }
  }, [token, childId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // Тикер и возврат из фона — два способа узнать, что время ушло вперёд. Второй нужен
  // отдельно: пока приложение свёрнуто, таймеры не идут, и вернувшийся через час
  // учитель иначе увидел бы урок, который давно кончился.
  useEffect(() => {
    if (!token || !enabled) return undefined;
    const timer = setInterval(() => load({ silent: true }), REFRESH_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') load({ silent: true });
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [load, token, enabled]);

  return { ...state, reload: load };
}
