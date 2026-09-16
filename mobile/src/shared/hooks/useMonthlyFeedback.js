import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { monthlyFeedbackApi } from '@shared/api/monthlyFeedbackApi';
import {
  ANALYSIS_POLL_LIMIT_MS,
  ANALYSIS_POLL_MS,
  analysisPhase,
  analysisRequestError,
  defaultFeedbackMonth,
  feedbackMonths,
  monthKey,
  needsFullAnalysis,
  stepMonth,
} from '@shared/api/monthlyFeedbackMap';
import { uuid } from '@shared/uuid';

const LOAD_ERROR = 'Не удалось загрузить обратную связь';

/**
 * Блок «Обратная связь за месяц» выбранного ребёнка: месяцы (P1), отзывы месяца (P2) и анализ
 * (P3/P4) одним хуком — у главной родителя одно обновление на всё.
 *
 * <p>Каждая загрузка помечается поколением. Родитель листает месяцы и переключает детей
 * быстрее, чем отвечает сервер, и опоздавший ответ прошлого месяца иначе лёг бы поверх
 * текущего — с чужим анализом в придачу. По той же метке гаснет опрос идущего анализа.
 *
 * <p>Опрос — не дольше трёх минут (контракт P3). Если анализ идёт дольше, экран не зависает
 * в опросе навсегда: обновление главной спросит состояние заново.
 */
export function useChildMonthlyFeedback(childId) {
  const { token } = useAuth();
  const current = monthKey();

  const [monthsState, setMonthsState] = useState({ loading: true, rows: null });
  const [picked, setPicked] = useState(null);
  const [monthState, setMonthState] = useState({ loading: false, error: null, view: null });
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [starting, setStarting] = useState(false);

  const generation = useRef(0);
  const pollTimer = useRef(null);
  const pollDeadline = useRef(0);
  const idempotencyKey = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
    pollDeadline.current = 0;
  }, []);

  useEffect(() => {
    setPicked(null);
    idempotencyKey.current = null;
  }, [childId]);

  useEffect(
    () => () => {
      generation.current += 1;
      stopPolling();
    },
    [stopPolling],
  );

  const loadMonths = useCallback(
    async (silent = false) => {
      if (!token || childId == null) {
        setMonthsState({ loading: false, rows: null });
        return;
      }
      if (!silent) setMonthsState({ loading: true, rows: null });
      try {
        const rows = await monthlyFeedbackApi.months(token, childId);
        setMonthsState({ loading: false, rows: Array.isArray(rows) ? rows : [] });
      } catch {
        // Без списка месяцев блок всё равно работает на текущем месяце: стрелки просто
        // не узнают о прошлых.
        setMonthsState({ loading: false, rows: null });
      }
    },
    [token, childId],
  );

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  const months = feedbackMonths(monthsState.rows, current);
  const month = picked ?? (monthsState.loading ? null : defaultFeedbackMonth(monthsState.rows, current));

  /** Поставить анализ на экран и, если он ещё идёт, спросить снова через `pollAfterMs`. */
  const showAnalysis = useCallback(
    (next, ownGeneration, context) => {
      if (ownGeneration !== generation.current) return;
      setAnalysis(next);
      if (analysisPhase(next) !== 'running') {
        stopPolling();
        return;
      }
      if (!pollDeadline.current) pollDeadline.current = Date.now() + ANALYSIS_POLL_LIMIT_MS;
      if (Date.now() > pollDeadline.current) return;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      pollTimer.current = setTimeout(async () => {
        pollTimer.current = null;
        if (ownGeneration !== generation.current) return;
        try {
          const polled = await monthlyFeedbackApi.analysis(context.token, context.childId, context.month);
          showAnalysis(polled, ownGeneration, context);
        } catch {
          // Моргнувшая сеть не отменяет анализ: спросим на следующем шаге.
          showAnalysis(next, ownGeneration, context);
        }
      }, next?.pollAfterMs || ANALYSIS_POLL_MS);
    },
    [stopPolling],
  );

  const loadMonth = useCallback(
    async (silent = false) => {
      if (!token || childId == null || !month) return;
      generation.current += 1;
      const own = generation.current;
      const context = { token, childId, month };
      stopPolling();
      if (!silent) {
        setMonthState({ loading: true, error: null, view: null });
        setAnalysis(null);
        setAnalysisError(null);
      }

      let view;
      try {
        view = await monthlyFeedbackApi.month(token, childId, month);
      } catch {
        // Тихое обновление (потянули главную) не стирает уже показанные отзывы из-за сбоя сети.
        if (own === generation.current) {
          setMonthState((prev) =>
            silent ? { ...prev, loading: false } : { loading: false, error: LOAD_ERROR, view: null },
          );
        }
        return;
      }
      if (own !== generation.current) return;
      setMonthState({ loading: false, error: null, view });

      if (!needsFullAnalysis(view?.analysis)) {
        setAnalysis(view?.analysis ?? null);
        return;
      }
      try {
        showAnalysis(await monthlyFeedbackApi.analysis(token, childId, month), own, context);
      } catch {
        // Отзывы уже на экране; без полного анализа остаётся его краткое состояние.
        if (own === generation.current) setAnalysis(view.analysis);
      }
    },
    [token, childId, month, stopPolling, showAnalysis],
  );

  useEffect(() => {
    idempotencyKey.current = null;
    loadMonth();
  }, [loadMonth]);

  const requestAnalysis = useCallback(async () => {
    if (!token || childId == null || !month || starting) return;
    // Новый ключ на нажатие; тот же — только если прошлое нажатие не дошло до сервера.
    if (!idempotencyKey.current) idempotencyKey.current = uuid();
    const own = generation.current;
    setStarting(true);
    setAnalysisError(null);
    try {
      const next = await monthlyFeedbackApi.requestAnalysis(token, childId, month, idempotencyKey.current);
      idempotencyKey.current = null;
      pollDeadline.current = 0;
      showAnalysis(next, own, { token, childId, month });
    } catch (e) {
      if (e?.status !== 0) idempotencyKey.current = null;
      if (own === generation.current) setAnalysisError(analysisRequestError(e));
    } finally {
      setStarting(false);
    }
  }, [token, childId, month, starting, showAnalysis]);

  const reload = useCallback(
    () => Promise.all([loadMonths(true), loadMonth(true)]),
    [loadMonths, loadMonth],
  );

  const older = month ? stepMonth(months, month, true) : null;
  const newer = month ? stepMonth(months, month, false) : null;
  // Ответ показывается только про этот месяц и этого ребёнка: между сменой и запуском загрузки
  // проходит кадр, и в нём прежний ответ встал бы под новой подписью месяца.
  const view =
    monthState.view?.month === month && monthState.view?.childId === childId ? monthState.view : null;
  const loading = month == null || (view == null && !monthState.error);

  return {
    month,
    loading,
    error: loading ? null : monthState.error,
    view,
    older,
    newer,
    goOlder: () => older && setPicked(older),
    goNewer: () => newer && setPicked(newer),
    analysis,
    analysisError,
    analysisStarting: starting,
    requestAnalysis,
    reload,
    retry: () => loadMonth(),
  };
}
