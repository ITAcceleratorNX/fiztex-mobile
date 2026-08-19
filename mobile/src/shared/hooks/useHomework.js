import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';

const PAGE_SIZE = 50;

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

  const parentMode = childId !== undefined;
  const idle = !token || (parentMode && !childId);

  const load = useCallback(async (silent = false) => {
    if (idle) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const page = parentMode
        ? await homeworkApi.children(token, childId, { scope, size: PAGE_SIZE })
        : await homeworkApi.my(token, { scope, size: PAGE_SIZE });
      setState({ loading: false, error: null, rows: page?.content ?? [] });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), rows: [] });
    }
  }, [idle, parentMode, token, childId, scope]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { ...state, scope, setScope, reload: load, refresh, refreshing };
}

/** Карточка задания вместе со своей работой (003 §3). */
export function useMyHomework(homeworkId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async (silent = false) => {
    if (!token || !homeworkId) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, data: await homeworkApi.myOne(token, homeworkId) });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), data: null });
    }
  }, [token, homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

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

function newClientToken() {
  return `hw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
