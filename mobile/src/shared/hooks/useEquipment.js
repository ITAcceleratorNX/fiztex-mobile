import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { equipmentApi } from '@shared/api/equipmentApi';

const HISTORY_PAGE_SIZE = 30;

/**
 * Подписчики «в модуле что-то изменилось».
 *
 * Команда меняет сразу несколько экранов: строка уходит из «В наличии» и появляется в
 * «Выдано», меняется карточка, счётчики и журнал. Держать это на ключах кэша негде —
 * своего кэш-слоя в приложении нет, — поэтому экраны перечитывают себя по сигналу.
 */
const listeners = new Set();

function publishEquipmentChanged() {
  for (const listener of listeners) listener();
}

function messageOf(error, fallback) {
  return error?.message || fallback;
}

export function useEquipmentDashboard(state) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [problemOnly, setProblemOnly] = useState(false);
  const [holderInactiveOnly, setHolderInactiveOnly] = useState(false);
  const [result, setResult] = useState({ loading: true, error: null, data: null });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setResult((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await equipmentApi.dashboard(token, {
        state,
        query: settledQuery || undefined,
        hasProblem: problemOnly ? true : undefined,
        holderInactive: state === 'ISSUED' && holderInactiveOnly ? true : undefined,
      });
      setResult({ loading: false, error: null, data });
    } catch (error) {
      setResult((prev) => ({
        loading: false,
        error: messageOf(error, 'Не удалось загрузить технику.'),
        data: silent ? prev.data : null,
      }));
    }
  }, [token, state, settledQuery, problemOnly, holderInactiveOnly]);

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

  return {
    ...result,
    query,
    setQuery,
    problemOnly,
    setProblemOnly,
    holderInactiveOnly,
    setHolderInactiveOnly,
    refresh,
    refreshing,
    reload: load,
  };
}

export function useEquipmentUnit(unitId) {
  const { token } = useAuth();
  const [result, setResult] = useState({ loading: true, error: null, card: null });

  const load = useCallback(async (silent = false) => {
    if (!token || unitId == null) return;
    if (!silent) setResult((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const card = await equipmentApi.unit(token, unitId);
      setResult({ loading: false, error: null, card });
    } catch (error) {
      setResult({ loading: false, error: messageOf(error, 'Не удалось загрузить экземпляр.'), card: null });
    }
  }, [token, unitId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const listener = () => load(true);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, [load]);

  return { ...result, reload: load };
}

/** Справочник позиций: выбор «добавить экземпляры в существующую» (§7.1). */
export function useEquipmentItems(enabled = true) {
  const { token } = useAuth();
  const [result, setResult] = useState({ loading: enabled, error: null, rows: [] });

  const load = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const rows = await equipmentApi.items(token, {});
      setResult({ loading: false, error: null, rows: rows ?? [] });
    } catch (error) {
      setResult({ loading: false, error: messageOf(error, 'Не удалось загрузить позиции.'), rows: [] });
    }
  }, [token, enabled]);

  useEffect(() => { load(); }, [load]);
  return { ...result, reload: load };
}

export function useEquipmentRecipients(query, enabled = true) {
  const { token } = useAuth();
  const [result, setResult] = useState({ loading: enabled, error: null, rows: [] });

  useEffect(() => {
    if (!token || !enabled) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setResult((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const rows = await equipmentApi.recipients(token, { query: query.trim() || undefined, limit: 30 });
        if (active) setResult({ loading: false, error: null, rows: rows ?? [] });
      } catch (error) {
        if (active) {
          setResult({ loading: false, error: messageOf(error, 'Не удалось загрузить сотрудников.'), rows: [] });
        }
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [token, query, enabled]);

  return result;
}

export function useEquipmentHistory(action) {
  const { token } = useAuth();
  const [state, setState] = useState({
    loading: true, error: null, rows: [], page: -1, last: false, refreshing: false,
  });
  const loadingRef = useRef(false);
  const generation = useRef(0);

  const loadPage = useCallback(async (page, replace = false) => {
    if (!token || loadingRef.current) return;
    loadingRef.current = true;
    const currentGeneration = generation.current;
    if (replace) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await equipmentApi.history(token, {
        page, size: HISTORY_PAGE_SIZE, action: action || undefined,
      });
      if (currentGeneration !== generation.current) return;
      setState((prev) => ({
        loading: false,
        error: null,
        rows: replace ? data?.content ?? [] : [...prev.rows, ...(data?.content ?? [])],
        page,
        last: Boolean(data?.last),
        refreshing: false,
      }));
    } catch (error) {
      if (currentGeneration === generation.current) {
        setState((prev) => ({
          ...prev, loading: false, refreshing: false, error: messageOf(error, 'Не удалось загрузить историю.'),
        }));
      }
    } finally {
      loadingRef.current = false;
    }
  }, [token, action]);

  useEffect(() => {
    generation.current += 1;
    loadingRef.current = false;
    setState({ loading: true, error: null, rows: [], page: -1, last: false, refreshing: false });
    loadPage(0, true);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (!state.loading && !state.last && !state.error) loadPage(state.page + 1);
  }, [state.loading, state.last, state.error, state.page, loadPage]);

  const refresh = useCallback(() => {
    generation.current += 1;
    loadingRef.current = false;
    setState((prev) => ({ ...prev, refreshing: true, error: null }));
    return loadPage(0, true);
  }, [loadPage]);

  return { ...state, loadMore, refresh, reload: () => loadPage(0, true) };
}

/**
 * §10: «Моя техника» получателя. Только чтение — ни вернуть, ни передать, ни списать
 * сотрудник не может, и кнопок у блока нет.
 */
export function useMyEquipment() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await equipmentApi.mine(token);
      setState({ loading: false, error: null, rows: rows ?? [] });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить технику.'), rows: [] });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listeners.add(load);
    return () => listeners.delete(load);
  }, [load]);

  return { ...state, reload: load };
}

export function useEquipmentCommands() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (operation) => {
    if (!token) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await operation(token);
      publishEquipmentChanged();
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
    /**
     * Заведение позиции и добавление экземпляров — одна команда с двумя ветками.
     *
     * Занятое название ловится не здесь: сервер отвечает 409 с самой позицией, и экран
     * предлагает добавить экземпляры в неё. Вторую позицию с тем же именем завести нельзя.
     */
    saveItem: ({ itemId, name, note, units }) => run((value) => (
      itemId
        ? equipmentApi.addUnits(value, itemId, units)
        : equipmentApi.createItem(value, { name: name.trim(), note: note?.trim() || null, units })
    )),
    updateItem: (itemId, body) => run((value) => equipmentApi.updateItem(value, itemId, body)),
    updateUnit: (unitId, body) => run((value) => equipmentApi.updateUnit(value, unitId, body)),
    writeOff: (unitId, options) => run((value) => equipmentApi.writeOff(value, unitId, options)),
    issue: (unitIds, accountId, comment) => run((value) => equipmentApi.issue(value, unitIds, accountId, comment)),
    returnUnits: (unitIds, comment) => run((value) => equipmentApi.returnUnits(value, unitIds, comment)),
    transfer: (unitIds, accountId, comment) => run((value) => equipmentApi.transfer(value, unitIds, accountId, comment)),
    setProblem: (unitId, type, comment) => run((value) => equipmentApi.setProblem(value, unitId, type, comment)),
    resolveProblem: (unitId, comment) => run((value) => equipmentApi.resolveProblem(value, unitId, comment)),
  }), [busy, error, run]);
}
