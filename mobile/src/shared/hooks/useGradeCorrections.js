import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { gradeCorrectionsApi } from '@shared/api/gradeCorrectionsApi';

/**
 * Открытые исправления работы ученика (или выбранного ребёнка у родителя).
 *
 * Как и посещаемость в карточке урока, это свой запрос, и его сбой экран не ломает: ошибка
 * гасится в пустой список — блок исправления просто не появляется.
 *
 * @param {{ childId?: number|null, lessonId?: number|null, enabled?: boolean }} options
 */
export function useMyGradeCorrections({ childId = null, lessonId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(token) && enabled);
  const [corrections, setCorrections] = useState([]);

  const reload = useCallback(async () => {
    if (!token || !enabled) {
      setCorrections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await gradeCorrectionsApi.my(token, { childStudentProfileId: childId, lessonId });
      setCorrections(Array.isArray(list) ? list : []);
    } catch {
      setCorrections([]);
    } finally {
      setLoading(false);
    }
  }, [token, childId, lessonId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, corrections, reload };
}
