import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { serviceRequestsApi } from '@shared/api/serviceRequestsApi';
import {
  SECTION_STATUSES, actionErrorText, byRecency, fieldErrors,
} from '@shared/api/serviceRequestsMap';

const PAGE_SIZE = 50;

/**
 * Ошибка экрана одним словом. 403 — не сбой сети, а «не ваша заявка», и предлагать
 * «Повторить» на нём бессмысленно: повторится то же самое.
 */
function errorKind(e) {
  if (e?.status === 403) return 'forbidden';
  if (e?.status === 404) return 'missing';
  return 'load';
}

/**
 * Один раздел списка заявок (ТЗ SERVICE-FE-002 §3).
 *
 * Разделу отвечают два статуса, и запросов тоже два — по одному на статус, а не один
 * общий с разбором на клиенте. Причина в том, что страница это срез: смешанная выдача
 * из двадцати последних заявок могла бы целиком состоять из выполненных, и «Мои заявки»
 * показали бы «пусто» при живых новых заявках на следующей странице.
 *
 * @param {'ACTIVE'|'HISTORY'} section
 */
export function useServiceRequestList(section) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const pages = await Promise.all(
        SECTION_STATUSES[section].map((status) =>
          serviceRequestsApi.my(token, { status, size: PAGE_SIZE })),
      );
      const rows = pages.flatMap((page) => page?.content ?? []).sort(byRecency);
      setState({ loading: false, error: null, rows });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), rows: [] });
    }
  }, [token, section]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [load]);

  return { ...state, reload: load, refresh, refreshing };
}

/**
 * Карточка заявки вместе с её лентой (§8, §12).
 *
 * Лента грузится тем же заходом, а не по раскрытию блока: она часть карточки, и её
 * отдельная загрузка добавила бы экрану второе состояние ожидания там, где человек
 * ждёт один экран.
 *
 * Ошибка ленты карточку не роняет: заявка читается и без хронологии, а прятать статус,
 * местоположение и описание из-за недоступного вспомогательного запроса — терять больше,
 * чем показывать.
 */
export function useServiceRequest(requestId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, request: null, history: [] });

  const load = useCallback(async (silent = false) => {
    if (!token || requestId == null) {
      setState({ loading: false, error: null, request: null, history: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [request, history] = await Promise.all([
        serviceRequestsApi.one(token, requestId),
        serviceRequestsApi.history(token, requestId).catch(() => []),
      ]);
      setState({ loading: false, error: null, request, history: history ?? [] });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), request: null, history: [] });
    }
  }, [token, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Действие автора: создание (§6), отмена новой (§10) и возврат выполненной (§11).
 *
 * Все три возвращают заявку такой, какой её увидел бэкенд, и экран показывает именно
 * её — а не состояние, которое он предположил. Что стало с заявкой после возврата,
 * решает сервер: исполнителя автор не выбирает.
 *
 * Отказ хранится целиком, а не одним сообщением: у 422 в `details` лежат поля, которые
 * не прошли проверку, а у 409 в `code` — истекло ли окно возврата или разошёлся статус.
 * Свернув ошибку в строку, форма перестала бы уметь подсветить конкретный ввод.
 */
export function useServiceRequestAction() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (fn) => {
    if (!token) return null;
    setBusy(true);
    setError(null);
    try {
      return await fn(token);
    } catch (e) {
      setError(e);
      return null;
    } finally {
      setBusy(false);
    }
  }, [token]);

  return useMemo(() => ({
    busy,
    error,
    // Готовый текст отказа: экраны показывают его, а разбор кода живёт в одном месте.
    errorText: error ? actionErrorText(error) : null,
    fields: fieldErrors(error),
    clearError: () => setError(null),
    cancel: (id) => run((t) => serviceRequestsApi.cancel(t, id)),
    reopen: (id, comment) => run((t) => serviceRequestsApi.reopen(t, id, comment)),
    create: (payload) => run((t) => serviceRequestsApi.create(t, payload)),
  }), [busy, error, run]);
}
