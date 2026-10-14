import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';

const PAGE_SIZE = 50;

// Карточка и списки остаются смонтированными под экраном теста. После успешной
// отправки сразу обновляем их состояние, затем сверяем его с сервером.
const testSubmissionListeners = new Set();

function publishTestSubmitted(token, homeworkId, result) {
  for (const listener of testSubmissionListeners) listener({ token, homeworkId, result });
}

function submittedRows(rows, homeworkId, result) {
  return rows.map((row) => row.id === homeworkId
    ? { ...row, submissionStatus: 'SUBMITTED', lastSubmittedAt: result.submittedAt }
    : row);
}

function submittedHomework(data, result) {
  if (!data) return data;
  const attempt = {
    id: result.attemptId,
    attemptNumber: result.attemptNumber,
    submittedAt: result.submittedAt,
    photos: [], files: [], reviews: [],
  };
  return {
    ...data,
    submission: {
      ...data.submission,
      status: 'SUBMITTED',
      canSubmit: false,
      blockedReason: 'Работа отправлена и ждёт проверки — изменить её можно только после возврата учителем',
      attemptCount: result.attemptNumber,
      lastSubmittedAt: result.submittedAt,
      resubmitted: result.attemptNumber > 1,
      currentAttempt: attempt,
      history: [...(data.submission?.history ?? []).filter((item) => item.id !== attempt.id), attempt],
      testResult: null,
    },
  };
}

/**
 * Ошибка экрана одним словом. 403 — не сбой сети, а «раздел не для этой роли»,
 * и предлагать «Повторить» на нём бессмысленно: повторится то же самое.
 */
function errorKind(e) {
  if (e?.status === 403) return 'forbidden';
  if (e?.status === 404) return 'missing';
  return 'load';
}

/**
 * Лента заданий ученика или ребёнка. Вкладка уходит в запрос параметром: набор статусов
 * считает сервер, и повторно открытое задание возвращается в «Актуальные» само, потому
 * что у него сменился статус (ТЗ HOMEWORK-005.1 §4.1).
 *
 * @param {{childId?: number|null}} options `childId` — родительский режим; `undefined`
 *   означает «свои задания», а `null` — «ребёнок ещё не выбран», и это разные состояния:
 *   во втором грузить нечего, но и ошибки нет.
 */
export function useHomeworkList({ childId } = {}) {
  const { token } = useAuth();
  const [scope, setScope] = useState('ACTUAL');
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);
  const requestVersion = useRef(0);

  const parentMode = childId !== undefined;
  const idle = !token || (parentMode && !childId);

  const load = useCallback(async (silent = false) => {
    const version = ++requestVersion.current;
    if (idle) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const page = parentMode
        ? await homeworkApi.children(token, childId, { scope, size: PAGE_SIZE })
        : await homeworkApi.my(token, { scope, size: PAGE_SIZE });
      if (version === requestVersion.current) {
        setState({ loading: false, error: null, rows: page?.content ?? [] });
      }
    } catch (e) {
      if (version === requestVersion.current) {
        setState((prev) => silent && prev.rows.length > 0 && errorKind(e) === 'load'
          ? { ...prev, loading: false }
          : { loading: false, error: errorKind(e), rows: [] });
      }
    }
  }, [idle, parentMode, token, childId, scope]);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  useEffect(() => {
    if (parentMode) return;
    const listener = (event) => {
      if (event.token !== token) return;
      setState((prev) => ({ ...prev, rows: submittedRows(prev.rows, event.homeworkId, event.result) }));
      load(true);
    };
    testSubmissionListeners.add(listener);
    return () => testSubmissionListeners.delete(listener);
  }, [token, parentMode, load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { ...state, scope, setScope, reload: load, refresh, refreshing };
}

/**
 * Задания одного урока — то, что ученик и родитель видят на карточке урока.
 *
 * Обе вкладки сразу: у урока вкладок нет, а завершённое задание с урока никуда не девается
 * и остаётся частью ответа на вопрос «что задавали». Источник тот же, что у вкладки
 * «Задания» (`/api/homework/my`), только сужен уроком: собирать список урока вторым
 * правилом видимости нельзя — оно разошлось бы с лентой.
 *
 * Ошибка здесь не ломает карточку урока: задания — блок внутри неё, и их недоступность
 * не повод прятать тему, посещаемость и всё остальное.
 *
 * @param {{childId?: number|null}} options `childId` — родительский режим (см. `useHomeworkList`)
 */
export function useLessonAssignments(lessonId, { childId } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: Boolean(lessonId), error: null, rows: [] });
  const requestVersion = useRef(0);

  const parentMode = childId !== undefined && childId !== null;

  const load = useCallback(async (silent = false) => {
    const version = ++requestVersion.current;
    if (!token || !lessonId) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    const params = { lessonId, size: PAGE_SIZE };
    const fetchScope = (scope) => (parentMode
      ? homeworkApi.children(token, childId, { ...params, scope })
      : homeworkApi.my(token, { ...params, scope }));
    try {
      const [actual, history] = await Promise.all([
        fetchScope('ACTUAL'),
        fetchScope('HISTORY'),
      ]);
      // Отбор делает сервер, и повторять его здесь нельзя: к уроку относится не только
      // задание с его `lessonId`, но и задание без привязки, срок которого приходится на
      // этот урок, — у такой строки `lessonId` пустой (правило см. LessonHomeworkScope).
      const rows = [...(actual?.content ?? []), ...(history?.content ?? [])];
      if (version === requestVersion.current) setState({ loading: false, error: null, rows });
    } catch (e) {
      if (version === requestVersion.current) {
        setState((prev) => silent && prev.rows.length > 0 && errorKind(e) === 'load'
          ? { ...prev, loading: false }
          : { loading: false, error: errorKind(e), rows: [] });
      }
    }
  }, [token, lessonId, parentMode, childId]);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  useEffect(() => {
    if (parentMode) return;
    const listener = (event) => {
      if (event.token !== token) return;
      setState((prev) => ({ ...prev, rows: submittedRows(prev.rows, event.homeworkId, event.result) }));
      load(true);
    };
    testSubmissionListeners.add(listener);
    return () => testSubmissionListeners.delete(listener);
  }, [token, parentMode, load]);

  return { ...state, reload: load };
}

/** Карточка задания вместе со своей работой (003 §3). */
export function useMyHomework(homeworkId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const requestVersion = useRef(0);

  const load = useCallback(async (silent = false) => {
    const version = ++requestVersion.current;
    if (!token || !homeworkId) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await homeworkApi.myOne(token, homeworkId);
      if (version === requestVersion.current) setState({ loading: false, error: null, data });
    } catch (e) {
      if (version === requestVersion.current) {
        setState((prev) => silent && prev.data && errorKind(e) === 'load'
          ? { ...prev, loading: false }
          : { loading: false, error: errorKind(e), data: null });
      }
    }
  }, [token, homeworkId]);

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  useEffect(() => {
    const listener = (event) => {
      if (event.token !== token || event.homeworkId !== homeworkId) return;
      setState((prev) => prev.data
        ? { loading: false, error: null, data: submittedHomework(prev.data, event.result) }
        : prev);
      load(true);
    };
    testSubmissionListeners.add(listener);
    return () => testSubmissionListeners.delete(listener);
  }, [token, homeworkId, load]);

  return { ...state, reload: load };
}

/** Карточка задания ребёнка — только чтение, без содержимого его ответа (005.3 §5). */
export function useChildHomework(homeworkId, childId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async (silent = false) => {
    if (!token || !homeworkId || !childId) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await homeworkApi.childOne(token, homeworkId, childId);
      setState({ loading: false, error: null, data });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), data: null });
    }
  }, [token, homeworkId, childId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Отправка работы.
 *
 * Ключ идемпотентности живёт до успеха, а не до нажатия: сорвавшийся из-за сети запрос
 * мог дойти до сервера, и повтор с тем же ключом вернёт уже созданную отправку вместо
 * второй такой же (ТЗ HOMEWORK-003 §4). Новый ключ берётся только после того, как
 * предыдущая отправка удалась.
 */
export function useHomeworkSubmit(homeworkId, { onSuccess } = {}) {
  const { token } = useAuth();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const clientToken = useRef(null);

  const submit = useCallback(async ({ body, photos, files }) => {
    if (!token || !homeworkId || sending) return false;
    if (!clientToken.current) clientToken.current = newClientToken();

    setSending(true);
    setError(null);
    try {
      const result = await homeworkApi.submit(token, homeworkId, {
        body,
        photos,
        files,
        clientToken: clientToken.current,
      });
      clientToken.current = null;
      onSuccess?.(result);
      return true;
    } catch (e) {
      setError(e?.message || 'Не удалось отправить работу');
      return false;
    } finally {
      setSending(false);
    }
  }, [token, homeworkId, sending, onSuccess]);

  return { submit, sending, error, clearError: () => setError(null) };
}

/**
 * Вопросы теста и их отправка.
 *
 * <p>Черновик ответов живёт локально и пишется здесь же: серверного черновика ТЗ не
 * предусматривает, а ребёнку звонят посреди работы. Потерянные ответы он второй раз
 * вводить не станет — он просто не сдаст задание.
 *
 * <p>Ключ идемпотентности живёт до успеха, а не до нажатия: сорвавшийся из-за сети
 * запрос мог дойти до сервера, и повтор с тем же ключом вернёт уже созданную отправку
 * вместо второй попытки.
 */
export function useHomeworkTest(homeworkId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, questions: null });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const clientToken = useRef(null);
  const sendingRef = useRef(false);

  const load = useCallback(async () => {
    if (!token || !homeworkId) {
      setState({ loading: false, error: null, questions: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const questions = await homeworkApi.myQuestions(token, homeworkId);
      setState({ loading: false, error: null, questions });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), questions: null });
    }
  }, [token, homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async (answers) => {
    if (!token || !homeworkId || sendingRef.current) return false;
    sendingRef.current = true;
    if (!clientToken.current) clientToken.current = newClientToken();

    setSending(true);
    setSendError(null);
    try {
      const result = await homeworkApi.submitAnswers(token, homeworkId, {
        answers,
        clientToken: clientToken.current,
      });
      clientToken.current = null;
      publishTestSubmitted(token, homeworkId, result);
      return true;
    } catch (e) {
      setSendError(e?.message || 'Не удалось отправить ответы');
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [token, homeworkId]);

  return {
    ...state,
    reload: load,
    submit,
    sending,
    sendError,
    clearSendError: () => setSendError(null),
  };
}

function newClientToken() {
  return `hw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
