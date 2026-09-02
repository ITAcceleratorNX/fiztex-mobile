import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { serviceRequestsApi } from '@shared/api/serviceRequestsApi';
import {
  SECTION_STATUSES, actionErrorText, byRecency, fieldErrors, mergeById,
} from '@shared/api/serviceRequestsMap';

const PAGE_SIZE = 50;

/**
 * Назначенные заявки берутся одной страницей с запасом: фильтра по статусу у эндпоинта
 * нет, и раздел собирается разбором выдачи. Меньший размер означал бы, что выполненные
 * заявки вытеснят активные из среза, и «Мои заявки» покажут неполный список.
 */
const ASSIGNED_PAGE_SIZE = 200;

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
export function useServiceRequestList(section, { enabled = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: enabled, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token || !enabled) {
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
  }, [token, section, enabled]);

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
 * Общая очередь своей службы (SERVICE-FE-003 §3).
 *
 * Порядок приходит готовым и здесь не трогается: бэкенд сортирует экстренные выше, а
 * внутри группы старые раньше. Вторая сортировка на клиенте рассыпала бы постраничную
 * выдачу и разошлась бы с тем, что видят остальные сотрудники.
 */
export function useServiceQueue({ enabled = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: enabled, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token || !enabled) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const page = await serviceRequestsApi.queue(token, { size: PAGE_SIZE });
      setState({ loading: false, error: null, rows: page?.content ?? [] });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), rows: [] });
    }
  }, [token, enabled]);

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
 * Раздел сотрудника службы (§5, §10).
 *
 * Он видит заявки с двух сторон сразу: те, где он исполнитель, и те, что завёл сам. Обе
 * выдачи склеиваются по идентификатору — заявка, где он и автор, и исполнитель, приходит
 * из обеих и обязана остаться одной карточкой (§5).
 *
 * Возвращённые в очередь и переданные другой службе сюда не попадают, и отдельного
 * правила для этого не нужно: вместе со снятием исполнителя они уходят из `assigned/my`
 * сами (§10).
 *
 * Назначенные заявки приходится разбирать по статусу на клиенте — у `assigned/my` нет
 * фильтра. Это единственное место в модуле, где так делается, и размер страницы поэтому
 * взят с запасом: разбирать срез можно, только если срез покрывает всё.
 *
 * @param {'ACTIVE'|'HISTORY'} section
 */
export function useExecutorRequests(section, { enabled = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: enabled, error: null, rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token || !enabled) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    const statuses = SECTION_STATUSES[section];
    try {
      const [assigned, ...authored] = await Promise.all([
        serviceRequestsApi.assignedToMe(token, { size: ASSIGNED_PAGE_SIZE }),
        ...statuses.map((status) => serviceRequestsApi.my(token, { status, size: PAGE_SIZE })),
      ]);
      const mine = (assigned?.content ?? []).filter((row) => statuses.includes(row.status));
      const rows = mergeById(mine, ...authored.map((page) => page?.content ?? [])).sort(byRecency);
      setState({ loading: false, error: null, rows });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), rows: [] });
    }
  }, [token, section, enabled]);

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
    // Исполнительские действия (§4, §6, §8). Отказ хранится тем же способом: у взятия
    // он тоже содержательный — бэкенд объясняет, чем именно кончилась гонка.
    claim: (id) => run((t) => serviceRequestsApi.claim(t, id)),
    createAndClaim: (payload) => run((t) => serviceRequestsApi.createAndClaim(t, payload)),
    returnToQueue: (id, comment) => run((t) => serviceRequestsApi.returnToQueue(t, id, comment)),
    transfer: (id, target, comment) =>
      run((t) => serviceRequestsApi.transfer(t, id, target, comment)),
    complete: (id, payload) => run((t) => serviceRequestsApi.complete(t, id, payload)),
  }), [busy, error, run]);
}
