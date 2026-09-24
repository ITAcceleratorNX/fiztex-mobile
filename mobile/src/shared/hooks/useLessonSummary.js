import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { lessonApi } from '@shared/api/lessonApi';

/** Never display a previous child's document or let an older request win a refresh. */
export function useLessonSummary(lessonId, childId = null) {
  const { token } = useAuth();
  const context = useMemo(() => ({ token, lessonId, childId }), [token, lessonId, childId]);
  const sequence = useRef(0);
  const [state, setState] = useState(null);
  const reload = useCallback(async (silent = false) => {
    const requestId = ++sequence.current;
    if (!context.token || !context.lessonId) {
      setState({ context, loading: false, data: null, error: null });
      return;
    }
    setState((old) => ({
      context, loading: !silent,
      data: old?.context === context ? old.data : null, error: null,
    }));
    try {
      const data = await lessonApi.summary(context.token, context.lessonId, context.childId);
      if (sequence.current === requestId) setState({ context, data, loading: false, error: null });
    } catch (error) {
      if (sequence.current === requestId) setState({
        context, data: null, loading: false, error: error?.message || 'Не удалось загрузить конспект',
      });
    }
  }, [context]);

  useFocusEffect(useCallback(() => {
    void reload();
    return () => { sequence.current += 1; };
  }, [reload]));

  const current = state?.context === context ? state : { loading: true, error: null, data: null };
  return { ...current, reload };
}
