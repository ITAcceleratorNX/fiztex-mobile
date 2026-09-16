import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { surveyAdminApi } from '@shared/api/surveyAdminApi';

/**
 * Подписчики «в разделе опросов что-то изменилось»: публикация меняет и список, и карточку,
 * а сохранение вопросов — счётчик в обоих. Своего кэша в приложении нет, поэтому экраны
 * перечитывают себя по сигналу — тот же приём, что у ключей и техники.
 */
const listeners = new Set();

function publishSurveysChanged() {
  for (const listener of listeners) listener();
}

function messageOf(error, fallback) {
  return error?.message || fallback;
}

export function useAdminSurveys() {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const page = await surveyAdminApi.list(token, { page: 0, size: 100, status: status || undefined });
      setState({ loading: false, error: null, rows: page?.content ?? [] });
    } catch (error) {
      setState((prev) => ({
        loading: false,
        error: messageOf(error, 'Не удалось загрузить опросы.'),
        rows: silent ? prev.rows : [],
      }));
    }
  }, [token, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const listener = () => load(true);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { ...state, status, setStatus, refresh, refreshing, reload: load };
}

export function useAdminSurvey(surveyId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, survey: null });

  const load = useCallback(async (silent = false) => {
    if (!token || surveyId == null) return;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const survey = await surveyAdminApi.get(token, surveyId);
      setState({ loading: false, error: null, survey });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить опрос.'), survey: null });
    }
  }, [token, surveyId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const listener = () => load(true);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [load]);

  return { ...state, reload: load };
}

export function useSurveyQuestions(surveyId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, questions: null });

  const load = useCallback(async () => {
    if (!token || surveyId == null) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const questions = await surveyAdminApi.questions(token, surveyId);
      setState({ loading: false, error: null, questions: questions ?? [] });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить вопросы.'), questions: null });
    }
  }, [token, surveyId]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

/** Классы для аудитории. У психолога свой источник: `/admin/classes` ему закрыт. */
export function useSurveyAudienceClasses() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await surveyAdminApi.audienceClasses(token);
      setState({ loading: false, error: null, rows: rows ?? [] });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить классы.'), rows: [] });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function useSurveyStats(surveyId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, stats: null, respondents: [] });

  const load = useCallback(async (silent = false) => {
    if (!token || surveyId == null) return;
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Два запроса рядом: сводка и «кто ответил» отвечают на разные вопросы, но на экране
      // живут вместе, и показывать половину смысла нет.
      const [stats, respondents] = await Promise.all([
        surveyAdminApi.stats(token, surveyId),
        surveyAdminApi.respondents(token, surveyId).catch(() => []),
      ]);
      setState({ loading: false, error: null, stats, respondents: respondents ?? [] });
    } catch (error) {
      setState({
        loading: false,
        error: messageOf(error, 'Не удалось загрузить результаты.'),
        stats: null,
        respondents: [],
      });
    }
  }, [token, surveyId]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function useRespondentAnswers(surveyId, recipientId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, respondent: null });

  const load = useCallback(async () => {
    if (!token || surveyId == null || recipientId == null) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const respondent = await surveyAdminApi.respondentAnswers(token, surveyId, recipientId);
      setState({ loading: false, error: null, respondent });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить ответы.'), respondent: null });
    }
  }, [token, surveyId, recipientId]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function useSurveyCommands() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (operation) => {
    if (!token) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await operation(token);
      publishSurveysChanged();
      return result;
    } catch (nextError) {
      setError(nextError);
      return null;
    } finally {
      setBusy(false);
    }
  }, [token]);

  return useMemo(() => ({
    busy,
    error,
    errorText: error ? messageOf(error, 'Не удалось выполнить действие.') : null,
    clearError: () => setError(null),
    create: (body) => run((value) => surveyAdminApi.create(value, body)),
    update: (surveyId, body) => run((value) => surveyAdminApi.update(value, surveyId, body)),
    saveQuestions: (surveyId, questions) => run((value) => surveyAdminApi.saveQuestions(value, surveyId, questions)),
    setAudience: (surveyId, classIds) => run((value) => surveyAdminApi.setAudience(value, surveyId, classIds)),
    publish: (surveyId) => run((value) => surveyAdminApi.publish(value, surveyId)),
    end: (surveyId) => run((value) => surveyAdminApi.end(value, surveyId)),
  }), [busy, error, run]);
}
