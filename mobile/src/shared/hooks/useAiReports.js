import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { aiReportsApi } from '@shared/api/aiReportsApi';
import { seenKey, sortReports } from '@shared/api/aiReportMap';

/**
 * Опубликованные сводки выбранного ребёнка. Ответ принадлежит паре «аккаунт + ребёнок»: при смене
 * ребёнка прежняя выдача не показывается ни кадра (ТЗ §8 — «сбрасывать предыдущую выдачу»).
 */
export function useChildAiReports(childId) {
  const { token } = useAuth();
  const focused = useIsFocused();
  const context = useMemo(() => ({ token, childId }), [token, childId]);
  const active = useRef(context);
  active.current = context;
  const [state, setState] = useState(null);

  const reload = useCallback((silent = false) => {
    if (!token || childId == null) return Promise.resolve(null);
    setState((old) => ({ context, items: old?.context === context ? old.items : null, loading: !silent, error: null }));
    return aiReportsApi.list(token, childId).then((data) => {
      if (active.current === context) setState({ context, items: sortReports(data?.items), loading: false, error: null });
      return data;
    }).catch((error) => {
      if (active.current === context) {
        setState((old) => ({ context, items: old?.context === context ? old.items : null, loading: false,
          // 404 — выдача сводок в школе ещё не включена: для родителя это «сводок пока нет».
          error: error?.status === 404 ? null : 'Не удалось загрузить сводки',
          disabled: error?.status === 404 }));
      }
      return null;
    });
  }, [context, token, childId]);

  useEffect(() => { if (focused) void reload(); }, [focused, reload]);
  const current = state?.context === context ? state : { items: null, loading: Boolean(token && childId != null), error: null };
  return { ...current, items: current.items || [], loaded: current.items != null || current.disabled, reload };
}

/**
 * Одна сводка. Доступ проверяется заново при каждом открытии: снятая публикация (старое
 * уведомление, М8) — `gone`, а не ошибка загрузки.
 */
export function useChildAiReport(childId, reportId) {
  const { token } = useAuth();
  const [state, setState] = useState({ key: null, data: null, loading: true, error: null, gone: false });
  const key = `${token}:${childId}:${reportId}`;
  const load = useCallback(() => {
    if (!token || childId == null || reportId == null) return;
    setState({ key, data: null, loading: true, error: null, gone: false });
    aiReportsApi.detail(token, childId, reportId)
      .then((data) => setState((old) => (old.key === key ? { key, data, loading: false, error: null, gone: false } : old)))
      .catch((error) => setState((old) => (old.key === key ? {
        key, data: null, loading: false,
        gone: error?.status === 404 || error?.status === 403,
        error: error?.status === 404 || error?.status === 403 ? null : 'Не удалось загрузить сводку',
      } : old)));
  }, [childId, key, reportId, token]);
  useEffect(() => { load(); }, [load]);
  return state.key === key ? { ...state, reload: load } : { data: null, loading: true, error: null, gone: false, reload: load };
}

const storageKey = (accountId) => `fiztex.aiReports.seen.${accountId || 'anon'}`;
const listeners = new Set();
let cache = { accountId: undefined, seen: new Set() };

async function loadSeen(accountId) {
  if (cache.accountId === accountId) return cache.seen;
  let seen = new Set();
  try {
    const raw = await AsyncStorage.getItem(storageKey(accountId));
    seen = new Set(JSON.parse(raw || '[]'));
  } catch { /* нет хранилища — все сводки «новые», это безопасно */ }
  cache = { accountId, seen };
  return seen;
}

/**
 * Что уже открывалось на этом устройстве — для метки «Новая»: сводки (`seenKey`) и месяцы отзывов
 * (`monthSeenKey`) ленты «От учителей». У комментариев прочтение хранит сервер.
 */
export function useSeenAiReports() {
  const { accountId } = useAuth();
  const [seen, setSeen] = useState(() => (cache.accountId === accountId ? cache.seen : new Set()));
  useEffect(() => {
    let alive = true;
    void loadSeen(accountId).then((value) => { if (alive) setSeen(new Set(value)); });
    const listener = (value) => setSeen(new Set(value));
    listeners.add(listener);
    return () => { alive = false; listeners.delete(listener); };
  }, [accountId]);
  const markSeenKey = useCallback(async (key) => {
    if (!key) return;
    const current = await loadSeen(accountId);
    if (current.has(key)) return;
    current.add(key);
    listeners.forEach((listener) => listener(current));
    try { await AsyncStorage.setItem(storageKey(accountId), JSON.stringify([...current].slice(-500))); } catch { /* только метка */ }
  }, [accountId]);
  const markSeen = useCallback((item) => markSeenKey(item ? seenKey(item) : null), [markSeenKey]);
  return { seen, markSeen, markSeenKey };
}
