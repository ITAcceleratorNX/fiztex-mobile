import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Опрос только в активном приложении. Следующий таймер ставится после ответа:
 * медленная сеть не создаёт очередь запросов. `poll` должен быть useCallback.
 * Запрос, уже отправленный до ухода в фон, может завершиться; новых там нет.
 */
export function useForegroundPolling(poll, { enabled = true, intervalMs, immediate = true } = {}) {
  useEffect(() => {
    if (!enabled || !Number.isFinite(intervalMs) || intervalMs <= 0) return undefined;
    let alive = true;
    let active = AppState.currentState === 'active';
    let busy = false;
    let timer = null;

    const stopTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      stopTimer();
      if (alive && active) timer = setTimeout(run, intervalMs);
    };
    async function run() {
      stopTimer();
      if (!alive || !active || busy) return;
      busy = true;
      try {
        await poll();
      } catch {
        // Состояние ошибки принадлежит хукy данных. Следующий опрос — с обычной паузой.
      } finally {
        busy = false;
        schedule();
      }
    }

    const sub = AppState.addEventListener('change', (next) => {
      const wasActive = active;
      active = next === 'active';
      if (!active) stopTimer();
      else if (!wasActive) void run();
    });
    if (immediate) void run();
    else schedule();

    return () => {
      alive = false;
      stopTimer();
      sub.remove();
    };
  }, [poll, enabled, intervalMs, immediate]);
}
