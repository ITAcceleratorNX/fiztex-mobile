import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { parentCommentsApi } from '@shared/api/parentCommentsApi';

/** A reply is visible only in the account, child/lesson and filter that requested it. */
function useCommentResource(kind, id, subjectId = null, page = 0) {
  const { token } = useAuth();
  const focused = useIsFocused();
  const context = useMemo(() => ({ token, kind, id, subjectId, page }), [token, kind, id, subjectId, page]);
  const active = useRef(context);
  active.current = context;
  const mounted = useRef(true);
  const pending = useRef(null);
  const [state, setState] = useState(null);
  const reload = useCallback((silent = false) => {
    if (!mounted.current || active.current !== context || !token || id == null) return Promise.resolve(null);
    if (pending.current?.context === context) return pending.current.promise;
    setState(old => ({ context, data: old?.context === context ? old.data : null, loading: !silent, error: null }));
    const promise = (kind === 'lesson' ? parentCommentsApi.sheet(token, id) : parentCommentsApi.feed(token, id, subjectId, page))
      .then(data => {
        if (mounted.current && active.current === context) setState({ context, data, loading: false, error: null });
        return data;
      }).catch(() => {
        if (mounted.current && active.current === context) setState(old => ({ context,
          data: old?.context === context ? old.data : null, loading: false, error: 'Не удалось загрузить комментарии' }));
        return null;
      }).finally(() => { if (pending.current?.promise === promise) pending.current = null; });
    pending.current = { context, promise };
    return promise;
  }, [context, token, kind, id, subjectId, page]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => { if (focused) void reload(); }, [focused, reload]);

  const markRead = useCallback(async (comment) => {
    if (!token || !id || active.current !== context) return;
    await parentCommentsApi.markRead(token, id, comment.id, comment.version);
    if (mounted.current && active.current === context) await reload(true);
  }, [context, token, id, reload]);
  const current = state?.context === context ? state : { data: null, loading: Boolean(token && id), error: null };
  return { ...current, reload, markRead };
}
export function useLessonParentComments(lessonId) { return useCommentResource('lesson', lessonId); }
export function useChildParentComments(childId, subjectId = null, page = 0) { return useCommentResource('child', childId, subjectId, page); }
