import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { absenceApi } from '@shared/api/absenceApi';
import { monthRange } from '@shared/api/absenceMap';

/**
 * Дни отсутствия ребёнка за месяц календаря (ABSENCE-REASON-001, Р2). Данные дополнительные:
 * сбой не ломает календарь посещаемости — подсветки и блока «Нужна причина» просто нет.
 */
export function useAbsenceDays({ childId, month, enabled = true }) {
  const { token } = useAuth();
  const range = monthRange(month);
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const ready = Boolean(token && enabled && childId && from && to);
  const [days, setDays] = useState(null);
  const lastRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = lastRequest.current + 1;
    lastRequest.current = requestId;
    if (!ready) {
      setDays(null);
      return;
    }
    try {
      const data = await absenceApi.days(token, { childId, from, to });
      if (requestId === lastRequest.current) setDays(data);
    } catch {
      if (requestId === lastRequest.current) setDays(null);
    }
  }, [ready, token, childId, from, to]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { days, reload };
}

/** День отсутствия для шторки (Р3–Р9): загружается при открытии, перечитывается после ответа. */
export function useAbsenceDay({ childId, date }) {
  const { token } = useAuth();
  const ready = Boolean(token && childId && date);
  const [state, setState] = useState({ loading: ready, error: null, day: null });
  const lastRequest = useRef(0);

  const reload = useCallback(async () => {
    const requestId = lastRequest.current + 1;
    lastRequest.current = requestId;
    if (!ready) {
      setState({ loading: false, error: null, day: null });
      return;
    }
    setState((prev) => ({ loading: !prev.day, error: null, day: prev.day }));
    try {
      const data = await absenceApi.day(token, { childId, date });
      if (requestId === lastRequest.current) setState({ loading: false, error: null, day: data });
    } catch (error) {
      if (requestId === lastRequest.current) setState({ loading: false, error, day: null });
    }
  }, [ready, token, childId, date]);

  useEffect(() => {
    setState({ loading: ready, error: null, day: null });
    reload();
  }, [reload, ready]);

  return { ...state, reload };
}
