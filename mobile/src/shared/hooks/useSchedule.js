import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { scheduleApi } from '@shared/api/scheduleApi';
import { parentApi } from '@shared/api/parentApi';
import { localDateKey, mapScheduleView, scheduleStatusMessage } from '@shared/api/scheduleMap';

export function shortName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Друг';
  if (parts.length === 1) return parts[0];
  return parts[1]; // first name when "Last First"
}

/**
 * @param {{week?: boolean, date?: string|null}} options
 *   `date` — any day inside the wanted week (YYYY-MM-DD); omitted = current week.
 *   `reload(silent)` skips the loading flag, so pull-to-refresh keeps the list
 *   on screen instead of flashing the skeleton.
 */
export function useMySchedule({ week = false, date = null } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reload = useCallback(async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const raw = week ? await scheduleApi.meWeek(token, date) : await scheduleApi.meToday(token);
      setData(mapScheduleView(raw));
    } catch (e) {
      setError(e.message || 'Не удалось загрузить расписание');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, week, date]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, data, reload, emptyMessage: data ? scheduleStatusMessage(data.status, data.message) : null };
}

export function useChildSchedule(childId, { week = false, date = null } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(childId));
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reload = useCallback(async (silent = false) => {
    if (!token || !childId) {
      setData(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const raw = week
        ? await scheduleApi.childWeek(token, childId, date)
        : await scheduleApi.childToday(token, childId);
      setData(mapScheduleView(raw));
    } catch (e) {
      setError(e.message || 'Не удалось загрузить расписание');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, childId, week, date]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, data, reload, emptyMessage: data ? scheduleStatusMessage(data.status, data.message) : null };
}

export function useParentChildren(enabled = true) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);
  const [children, setChildren] = useState([]);

  const reload = useCallback(async () => {
    if (!token || !enabled) {
      setChildren([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await parentApi.myChildren(token);
      setChildren(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить детей');
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [token, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, children, reload };
}

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];

/** Monday of the week containing `dateStr` (YYYY-MM-DD in, YYYY-MM-DD out). */
export function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateKey(d);
}

/**
 * School days (Пн–Пт) spanning several weeks around `centerDate`, so the strip
 * can scroll into previous and next weeks instead of being stuck on one.
 *
 * Dates are formatted from local parts — `toISOString()` would render the
 * previous day for any timezone ahead of UTC during the early morning.
 */
export function buildDayStrip(centerDate, weeksAround = 12) {
  const monday = new Date(`${startOfWeek(centerDate)}T12:00:00`);
  monday.setDate(monday.getDate() - weeksAround * 7);
  const out = [];
  for (let w = 0; w <= weeksAround * 2; w += 1) {
    for (let i = 0; i < DAY_LABELS.length; i += 1) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + w * 7 + i);
      out.push({ label: DAY_LABELS[i], date: localDateKey(d), dayNum: d.getDate() });
    }
  }
  return out;
}

export function lessonsForDate(weekView, dateStr) {
  if (!weekView?.lessons) return [];
  return weekView.lessons.filter((l) => l.date === dateStr || l.raw?.date === dateStr);
}
