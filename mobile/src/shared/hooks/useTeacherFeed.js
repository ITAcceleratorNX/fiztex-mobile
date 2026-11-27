import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { monthlyFeedbackApi } from '@shared/api/monthlyFeedbackApi';
import { monthKey } from '@shared/api/monthlyFeedbackMap';
import { feedItems } from '@shared/api/teacherFeedMap';
import { useChildAiReports, useSeenAiReports } from './useAiReports';
import { useChildParentComments } from './useParentComments';

/** Месяцы с опубликованными отзывами (P1) выбранного ребёнка — как и остальное, ответ живёт с парой «аккаунт + ребёнок». */
function useFeedbackMonths(childId) {
  const { token } = useAuth();
  const focused = useIsFocused();
  const context = useMemo(() => ({ token, childId }), [token, childId]);
  const active = useRef(context);
  active.current = context;
  const [state, setState] = useState(null);
  const reload = useCallback((silent = false) => {
    if (!token || childId == null) return Promise.resolve(null);
    if (!silent) setState((old) => ({ context, rows: old?.context === context ? old.rows : null, loading: true, error: null }));
    return monthlyFeedbackApi.months(token, childId).then((rows) => {
      if (active.current === context) setState({ context, rows: Array.isArray(rows) ? rows : [], loading: false, error: null });
    }).catch(() => {
      if (active.current === context) {
        setState((old) => ({ context, rows: old?.context === context ? old.rows : null, loading: false, error: 'Не удалось загрузить отзывы' }));
      }
    });
  }, [context, token, childId]);
  useEffect(() => { if (focused) void reload(); }, [focused, reload]);
  const current = state?.context === context ? state : { rows: null, loading: Boolean(token && childId != null), error: null };
  return { ...current, reload };
}

/**
 * Лента «От учителей» выбранного ребёнка: три источника, каждый своим запросом. Упавший источник
 * не прячет остальные — лента показывает, что есть, и называет, чего не удалось загрузить.
 */
export function useTeacherFeed(childId) {
  const reports = useChildAiReports(childId);
  const months = useFeedbackMonths(childId);
  const comments = useChildParentComments(childId);
  const { seen, markSeenKey } = useSeenAiReports();

  const items = useMemo(() => feedItems({
    reports: reports.items,
    months: months.rows || [],
    comments: comments.data?.comments || [],
    seen,
    currentMonth: monthKey(),
  }), [reports.items, months.rows, comments.data, seen]);

  const loading = (reports.loading && !reports.loaded) || (months.loading && !months.rows) || (comments.loading && !comments.data);
  const failed = [
    reports.error && 'сводки',
    months.error && 'отзывы за месяц',
    comments.error && 'комментарии',
  ].filter(Boolean);

  const reloadReports = reports.reload;
  const reloadMonths = months.reload;
  const reloadComments = comments.reload;
  const reload = useCallback(
    (silent = true) => Promise.all([reloadReports(silent), reloadMonths(silent), reloadComments(silent)]),
    [reloadReports, reloadMonths, reloadComments],
  );

  return {
    items,
    loading,
    error: failed.length ? `Не удалось загрузить: ${failed.join(', ')}` : null,
    hasMoreComments: Boolean(comments.data?.hasMore),
    reload,
    markSeenKey,
  };
}
