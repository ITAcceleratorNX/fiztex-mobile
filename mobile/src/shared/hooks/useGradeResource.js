import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

export function useGradeResource(load, enabled) {
  const focused = useIsFocused();
  const context = useMemo(() => ({ load, enabled }), [load, enabled]);
  const active = useRef(context);
  active.current = context;
  const mounted = useRef(true);
  const pending = useRef(null);
  const [state, setState] = useState(null);

  const reload = useCallback(({ silent = false } = {}) => {
    if (!mounted.current || active.current !== context || !enabled) return Promise.resolve(null);
    if (pending.current?.context === context) return pending.current.promise;
    setState(old => ({
      context,
      data: old?.context === context ? old.data : null,
      loading: !silent || old?.context !== context || old.data == null,
      error: null,
      forbidden: false,
    }));
    const promise = Promise.resolve().then(load).then(data => {
      if (mounted.current && active.current === context) {
        setState({ context, data, loading: false, error: null, forbidden: false });
      }
      return data;
    }).catch(error => {
      if (mounted.current && active.current === context) {
        const forbidden = error?.status === 403 || error?.status === 404;
        setState(old => ({
          context,
          data: !forbidden && old?.context === context ? old.data : null,
          loading: false,
          error: error?.message || 'Не удалось загрузить оценки',
          forbidden,
        }));
      }
      return null;
    }).finally(() => {
      if (pending.current?.promise === promise) pending.current = null;
    });
    pending.current = { context, promise };
    return promise;
  }, [context, enabled, load]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!focused || !enabled) return undefined;
    if (AppState.currentState === 'active') void reload({ silent: true });
    let activeBefore = AppState.currentState === 'active';
    const subscription = AppState.addEventListener('change', next => {
      const activeNow = next === 'active';
      if (activeNow && !activeBefore) void reload({ silent: true });
      activeBefore = activeNow;
    });
    return () => subscription.remove();
  }, [focused, enabled, reload]);

  const current = enabled && state?.context === context
    ? state
    : { data: null, loading: Boolean(enabled), error: null, forbidden: false };
  return { ...current, reload };
}
