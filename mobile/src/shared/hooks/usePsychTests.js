import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { psychTestsApi } from '@shared/api/psychTestsApi';

function errorKind(e) {
  if (e?.status === 403) return 'forbidden';
  if (e?.status === 404) return 'missing';
  return 'load';
}

/**
 * Назначенные ученику психотесты. Ошибка не роняет главную: хук отдаёт пустой список, и
 * блок на главной просто не появляется — так же, как у опросов.
 */
export function useMyPsychTests() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, tests: [] });

  const load = useCallback(async (silent = false) => {
    if (!token) {
      setState({ loading: false, error: null, tests: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const tests = await psychTestsApi.list(token);
      setState({ loading: false, error: null, tests: tests ?? [] });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), tests: [] });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Прохождение одного теста — форма повторяет `useSurveyTest`: вопросы с черновиками одним
 * ответом, тонкий автосейв и отправка с ключом идемпотентности в ref (переживает ретрай,
 * гасится только после успеха).
 */
export function usePsychTestTaking(assignmentId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, test: null });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const idempotencyToken = useRef(null);

  const load = useCallback(async () => {
    if (!token || !assignmentId) {
      setState({ loading: false, error: null, test: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const test = await psychTestsApi.taking(token, assignmentId);
      setState({ loading: false, error: null, test });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), test: null });
    }
  }, [token, assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Сбой автосейва не событие для ученика — он в этот момент отвечает дальше. Следующее
   * изменение уйдёт само, а ответ остаётся в состоянии экрана до отправки.
   *
   * Промис возвращается (и никогда не отклоняется), чтобы отправка могла дождаться
   * последнего сохранения, а не обогнать его.
   */
  const saveAnswer = useCallback((request) => {
    if (!token || !assignmentId) return Promise.resolve();
    return psychTestsApi.saveAnswer(token, assignmentId, request).catch(() => undefined);
  }, [token, assignmentId]);

  const submit = useCallback(async () => {
    if (!token || !assignmentId || sending) return false;
    if (!idempotencyToken.current) idempotencyToken.current = newIdempotencyToken();

    setSending(true);
    setSendError(null);
    try {
      await psychTestsApi.submit(token, assignmentId, idempotencyToken.current);
      idempotencyToken.current = null;
      return true;
    } catch (e) {
      // 409 «уже отправлено» — повтор того же нажатия поверх принятой отправки: итог для
      // ученика тот же, что у успеха, и звать нажать ещё раз незачем.
      if (e?.status === 409) {
        idempotencyToken.current = null;
        return true;
      }
      setSendError(e?.message || 'Не удалось отправить ответы');
      return false;
    } finally {
      setSending(false);
    }
  }, [token, assignmentId, sending]);

  return {
    ...state,
    reload: load,
    saveAnswer,
    submit,
    sending,
    sendError,
    clearSendError: () => setSendError(null),
  };
}

function newIdempotencyToken() {
  return `psych-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
