import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { keysApi } from '@shared/api/keysApi';

const HISTORY_PAGE_SIZE = 30;
const listeners = new Set();

function publishKeysChanged() {
  for (const listener of listeners) listener();
}

function messageOf(error, fallback) {
  return error?.message || fallback;
}

export function useKeysDashboard(state) {
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
      const data = await keysApi.dashboard(token, {
        state,
        query: settledQuery || undefined,
        hasProblem: problemOnly ? true : undefined,
        holderInactive: state === 'ISSUED' && holderInactiveOnly ? true : undefined,
      });
      setResult({ loading: false, error: null, data });
    } catch (error) {
      setResult((prev) => ({ loading: false, error: messageOf(error, 'Не удалось загрузить ключи.'), data: silent ? prev.data : null }));
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

  const groups = result.data?.groups ?? [];
  const rows = useMemo(() => groups.flatMap((group) => (group.units ?? []).map((unit) => ({ group, unit }))), [groups]);
  return { ...result, rows, query, setQuery, problemOnly, setProblemOnly, holderInactiveOnly, setHolderInactiveOnly, refresh, refreshing, reload: load };
}

export function useKeyCard(unitId) {
  const { token } = useAuth();
  const [result, setResult] = useState({ loading: true, error: null, card: null });
  const load = useCallback(async (silent = false) => {
    if (!token || unitId == null) return;
    if (!silent) setResult((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const card = await keysApi.card(token, unitId);
      setResult({ loading: false, error: null, card });
    } catch (error) {
      setResult({ loading: false, error: messageOf(error, 'Не удалось загрузить ключ.'), card: null });
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

export function useKeyRecipients(query, enabled = true) {
  const { token } = useAuth();
  const [result, setResult] = useState({ loading: enabled, error: null, rows: [] });
  useEffect(() => {
    if (!token || !enabled) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setResult((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const rows = await keysApi.recipients(token, { query: query.trim() || undefined, limit: 50 });
        if (active) setResult({ loading: false, error: null, rows: rows ?? [] });
      } catch (error) {
        if (active) setResult({ loading: false, error: messageOf(error, 'Не удалось загрузить сотрудников.'), rows: [] });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [token, query, enabled]);
  return result;
}

export function useKeyHistory(action) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [], page: -1, last: false, refreshing: false });
  const loadingRef = useRef(false);
  const generation = useRef(0);

  const loadPage = useCallback(async (page, replace = false) => {
    if (!token || loadingRef.current) return;
    loadingRef.current = true;
    const currentGeneration = generation.current;
    if (replace) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await keysApi.history(token, { page, size: HISTORY_PAGE_SIZE, action: action || undefined });
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
        setState((prev) => ({ ...prev, loading: false, refreshing: false, error: messageOf(error, 'Не удалось загрузить историю.') }));
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

export function useMyKeys() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });
  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await keysApi.mine(token);
      setState({ loading: false, error: null, rows: rows ?? [] });
    } catch (error) {
      setState({ loading: false, error: messageOf(error, 'Не удалось загрузить ключи.'), rows: [] });
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    listeners.add(load);
    return () => listeners.delete(load);
  }, [load]);
  return { ...state, reload: load };
}

export function useKeyCommands() {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = useCallback(async (operation) => {
    if (!token) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await operation(token);
      publishKeysChanged();
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
    saveGroup: ({ group, name, note, labels }) => run(async (value) => {
      const cleanLabels = labels.map((label) => label.trim());
      if (!group?.id) {
        const created = await keysApi.createGroup(value, { name: name.trim(), note: note.trim() || null, initialUnits: cleanLabels.length });
        const units = created?.units ?? [];
        await Promise.all(units.map((unit, index) => {
          const label = cleanLabels[index];
          return label && label !== unit.label ? keysApi.updateUnit(value, unit.id, { label }) : Promise.resolve(unit);
        }));
        return created;
      }

      const updated = await keysApi.updateGroup(value, group.id, { name: name.trim(), note: note.trim() || null });
      const existing = group.units ?? [];
      await Promise.all(existing.map((unit, index) => {
        const label = cleanLabels[index];
        return label !== (unit.label || '') ? keysApi.updateUnit(value, unit.id, { label: label || null, note: unit.note || null }) : Promise.resolve(unit);
      }));
      const addCount = Math.max(0, cleanLabels.length - existing.length);
      if (addCount) {
        const added = await keysApi.addUnits(value, group.id, { count: addCount });
        await Promise.all((added ?? []).map((unit, index) => {
          const label = cleanLabels[existing.length + index];
          return label ? keysApi.updateUnit(value, unit.id, { label }) : Promise.resolve(unit);
        }));
      }
      return updated;
    }),
    createGroup: (body) => run((value) => keysApi.createGroup(value, body)),
    updateGroup: (groupId, body) => run((value) => keysApi.updateGroup(value, groupId, body)),
    addUnits: (groupId, body) => run((value) => keysApi.addUnits(value, groupId, body)),
    updateUnit: (unitId, body) => run((value) => keysApi.updateUnit(value, unitId, body)),
    issue: (unitIds, accountId, comment) => run((value) => keysApi.issue(value, unitIds, accountId, comment)),
    returnKeys: (unitIds, comment) => run((value) => keysApi.returnKeys(value, unitIds, comment)),
    transfer: (unitIds, accountId, comment) => run((value) => keysApi.transfer(value, unitIds, accountId, comment)),
    setProblem: (unitId, type, comment) => run((value) => keysApi.setProblem(value, unitId, type, comment)),
    resolveProblem: (unitId, comment) => run((value) => keysApi.resolveProblem(value, unitId, comment)),
    deleteUnit: (unitId, confirmIssued) => run((value) => keysApi.deleteUnit(value, unitId, confirmIssued)),
  }), [busy, error, run]);
}
