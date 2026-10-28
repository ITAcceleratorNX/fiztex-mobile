import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { gradeDynamicsApi } from '@shared/api/gradeDynamicsApi';

/**
 * Ответ виден только в том контексте (аккаунт, ребёнок, предмет, период), который его
 * запросил: при смене ребёнка или периода прежние числа не остаются на экране ни на кадр,
 * а опоздавший ответ прошлого выбора отбрасывается (FRONTEND §2, §6).
 */
function useDynamicsResource(kind, childId, period, subjectId = null) {
  const { token } = useAuth();
  const focused = useIsFocused();
  const context = useMemo(() => ({ token, kind, childId, period, subjectId }), [token, kind, childId, period, subjectId]);
  const active = useRef(context);
  active.current = context;
  const mounted = useRef(true);
  const [state, setState] = useState(null);
  const ready = token && childId != null && (kind === 'overview' || subjectId != null);

  const reload = useCallback((silent = false) => {
    if (!mounted.current || active.current !== context || !ready) return Promise.resolve(null);
    setState((old) => ({ context, data: old?.context === context ? old.data : null, loading: !silent, error: null, forbidden: false }));
    const call = kind === 'overview'
      ? gradeDynamicsApi.overview(token, { childId, period })
      : gradeDynamicsApi.subject(token, { childId, subjectId, period });
    return call.then((data) => {
      if (mounted.current && active.current === context) setState({ context, data, loading: false, error: null, forbidden: false });
      return data;
    }).catch((e) => {
      if (mounted.current && active.current === context) {
        setState({ context, data: null, loading: false, forbidden: e?.status === 403,
          error: e?.status === 403 ? 'Нет доступа к данным этого ребёнка' : 'Не удалось загрузить динамику' });
      }
      return null;
    });
  }, [context, ready, kind, token, childId, period, subjectId]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (focused) void reload(); }, [focused, reload]);
  // Как у оценок (`useGradeResource`): вернулись в приложение — числа перечитываются тихо,
  // иначе показатель жил бы прежней оценкой, пока экран не откроют заново.
  useEffect(() => {
    if (!focused) return undefined;
    let activeBefore = AppState.currentState === 'active';
    const subscription = AppState.addEventListener('change', (next) => {
      const activeNow = next === 'active';
      if (activeNow && !activeBefore) void reload(true);
      activeBefore = activeNow;
    });
    return () => subscription.remove();
  }, [focused, reload]);

  const current = state?.context === context ? state : { data: null, loading: Boolean(ready), error: null, forbidden: false };
  return { ...current, reload };
}

export function useChildGradeDynamics(childId, period) {
  return useDynamicsResource('overview', childId, period);
}

export function useChildSubjectDynamics(childId, subjectId, period) {
  return useDynamicsResource('subject', childId, period, subjectId);
}
