import { useCallback } from 'react';
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
