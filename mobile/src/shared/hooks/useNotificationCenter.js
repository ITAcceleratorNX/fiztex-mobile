import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { notificationCenterApi } from '@shared/api/notificationCenterApi';
import { markAllReadUpTo, markItemsRead } from '@shared/api/notificationCenterMap';

const PAGE_SIZE = 30;

/**
 * Лента центра уведомлений: первая страница, подгрузка старых, «прочитано» и «прочитать все».
 *
 * «Прочитано» ставится сразу на экране и уходит на сервер следом: строку открывают ради перехода, и ждать ответа
 * перед ним незачем. Отказ сервера отметку не откатывает — следующее обновление ленты покажет правду.
 */
export function useNotificationFeed() {
  const { token } = useAuth();
  const [state, setState] = useState({
    loading: true, error: null, items: [], hasMore: false, unreadCount: 0, loadingMore: false,
  });
  const loadingMore = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (!token) {
      setState((prev) => ({ ...prev, loading: false, error: null, items: [], hasMore: false, unreadCount: 0 }));
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const page = await notificationCenterApi.page(token, { limit: PAGE_SIZE });
      setState({
        loading: false,
        error: null,
        items: page?.items ?? [],
        hasMore: Boolean(page?.hasMore),
        unreadCount: page?.unreadCount ?? 0,
        loadingMore: false,
      });
    } catch (e) {
      // Ошибка при уже показанной ленте её не прячет: обновление не удалось, а прочитанное осталось.
      setState((prev) => (silent && prev.items.length
        ? { ...prev, loading: false }
        : { ...prev, loading: false, error: e?.message || 'load' }));
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = useCallback(async () => {
    const last = state.items[state.items.length - 1];
    if (!token || !state.hasMore || !last || loadingMore.current) return;
    loadingMore.current = true;
    setState((prev) => ({ ...prev, loadingMore: true }));
    try {
      const page = await notificationCenterApi.page(token, { before: last.id, limit: PAGE_SIZE });
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...(page?.items ?? []).filter((item) => !prev.items.some((p) => p.id === item.id))],
        hasMore: Boolean(page?.hasMore),
        unreadCount: page?.unreadCount ?? prev.unreadCount,
        loadingMore: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, loadingMore: false }));
    } finally {
      loadingMore.current = false;
    }
  }, [token, state.items, state.hasMore]);

  const markRead = useCallback((item) => {
    if (!token || !item || item.read) return;
    setState((prev) => ({
      ...prev,
      items: markItemsRead(prev.items, [item.id]),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
    notificationCenterApi.markRead(token, item.id).catch(() => {});
  }, [token]);

  const markAllRead = useCallback(async () => {
    const upTo = state.items[0]?.createdAt;
    if (!token || !upTo) return;
    setState((prev) => ({ ...prev, items: markAllReadUpTo(prev.items, upTo), unreadCount: 0 }));
    try {
      await notificationCenterApi.markAllRead(token, upTo);
    } finally {
      // Счётчик — по всей ленте, а не по показанной странице: его считает сервер.
      load(true);
    }
  }, [token, state.items, load]);

  return { ...state, reload: load, loadMore, markRead, markAllRead };
}

/**
 * Число на колокольчике. Спрашивается при каждом возвращении на экран: человек вернулся из ленты — прочитанное
 * должно погасить бейдж сразу, а не при следующем запуске приложения.
 *
 * Сбой не показывается: колокольчик без числа лучше колокольчика с ошибкой, а лента расскажет о сбое сама.
 */
export function useUnreadNotifications() {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    if (!token) {
      setCount(0);
      return undefined;
    }
    let active = true;
    notificationCenterApi.unreadCount(token)
      .then((result) => {
        if (active) setCount(result?.count ?? 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [token]);

  useFocusEffect(refresh);

  return count;
}
