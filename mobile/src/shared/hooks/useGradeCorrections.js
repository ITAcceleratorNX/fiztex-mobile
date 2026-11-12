import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { gradeCorrectionsApi } from '@shared/api/gradeCorrectionsApi';
import { useGradeResource } from './useGradeResource';

/**
 * Открытые исправления работы ученика (или выбранного ребёнка у родителя).
 *
 * Как и посещаемость в карточке урока, это свой запрос, и его сбой экран не ломает: ошибка
 * гасится в пустой список — блок исправления просто не появляется.
 *
 * Перечитывается при возврате на экран и в приложение, как и остальные оценки ученика
 * (`useGradeResource`): итоговая оценка учителя закрывает исправление, и блок «Требуется
 * исправление» не должен висеть на открытой карточке после того, как оценку уже поставили.
 *
 * @param {{ childId?: number|null, lessonId?: number|null, enabled?: boolean }} options
 */
export function useMyGradeCorrections({ childId = null, lessonId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const load = useCallback(
    () => gradeCorrectionsApi.my(token, { childStudentProfileId: childId, lessonId })
      .then((list) => (Array.isArray(list) ? list : []))
      .catch(() => []),
    [token, childId, lessonId],
  );
  const resource = useGradeResource(load, Boolean(token && enabled));
  return { loading: resource.loading, corrections: resource.data || [], reload: resource.reload };
}

/**
 * Исправления урока для учителя: список, «До следующего урока» и команды. Каждая команда
 * перечитывает список и сообщает текстом сервера, если отказал — экран не рисует ложного успеха.
 * Право отмечать исправление — то же, что право ставить оценки (`canManageGrades` листа).
 *
 * @returns {{ corrections: object[], nextDate: string|null, noNext: boolean, busy: boolean,
 *   reload: Function, create: Function, update: Function, complete: Function }}
 */
export function useLessonCorrections(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();
  const [corrections, setCorrections] = useState([]);
  const [nextDate, setNextDate] = useState(null);
  const [noNext, setNoNext] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !lessonId || !enabled) return;
    try {
      const list = await gradeCorrectionsApi.byLesson(token, lessonId);
      setCorrections(Array.isArray(list) ? list : []);
    } catch {
      // Сбой списка экран не ломает: исправлений просто не видно, лист оценок работает.
      setCorrections([]);
    }
  }, [token, lessonId, enabled]);

  useEffect(() => { reload(); }, [reload]);

  /** Дату «До следующего урока» называет сервер по расписанию; запрашивается, когда открывают форму. */
  const loadNext = useCallback(async () => {
    if (!token || !lessonId) return;
    try {
      const view = await gradeCorrectionsApi.nextLesson(token, lessonId);
      setNextDate(view?.lessonDate ?? null);
      setNoNext(!view?.lessonDate);
    } catch {
      setNextDate(null);
      setNoNext(false);
    }
  }, [token, lessonId]);

  /** @returns {Promise<null|string>} `null` — получилось; строка — что показать учителю */
  const run = useCallback(async (action, fallback) => {
    setBusy(true);
    try {
      await action();
      await reload();
      return null;
    } catch (e) {
      return e?.message || fallback;
    } finally {
      setBusy(false);
    }
  }, [reload]);

  return {
    corrections, nextDate, noNext, busy, reload, loadNext,
    create: (input) => run(() => gradeCorrectionsApi.create(token, lessonId, input), 'Не удалось сохранить исправление'),
    update: (id, body) => run(() => gradeCorrectionsApi.update(token, id, body), 'Не удалось сохранить исправление'),
    complete: (id, value) => run(() => gradeCorrectionsApi.complete(token, id, value), 'Не удалось выставить итоговую оценку'),
  };
}
