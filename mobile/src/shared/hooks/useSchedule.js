import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { scheduleApi } from '@shared/api/scheduleApi';
import { parentApi } from '@shared/api/parentApi';
import { mapScheduleView, scheduleStatusMessage } from '@shared/api/scheduleMap';

export function shortName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Друг';
  if (parts.length === 1) return parts[0];
  return parts[1]; // first name when "Last First"
}

export function useMySchedule({ week = false } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reload = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = week ? await scheduleApi.meWeek(token) : await scheduleApi.meToday(token);
      setData(mapScheduleView(raw));
    } catch (e) {
      setError(e.message || 'Не удалось загрузить расписание');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, week]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, data, reload, emptyMessage: data ? scheduleStatusMessage(data.status, data.message) : null };
}

export function useChildSchedule(childId, { week = false } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(childId));
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const reload = useCallback(async () => {
    if (!token || !childId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const raw = week
        ? await scheduleApi.childWeek(token, childId)
        : await scheduleApi.childToday(token, childId);
      setData(mapScheduleView(raw));
    } catch (e) {
      setError(e.message || 'Не удалось загрузить расписание');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, childId, week]);

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

/** Build Mon–Fri chips for the current week from a week schedule view. */
export function weekDayChips(weekView) {
  const dayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  if (!weekView?.weekStart) {
    const today = new Date();
    const monday = new Date(today);
    const dow = (today.getDay() + 6) % 7;
    monday.setDate(today.getDate() - dow);
    return dayLabels.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        label,
        date: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
      };
    });
  }
  const start = new Date(`${weekView.weekStart}T12:00:00`);
  return dayLabels.map((label, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label,
      date: d.toISOString().slice(0, 10),
      dayNum: d.getDate(),
    };
  });
}

export function lessonsForDate(weekView, dateStr) {
  if (!weekView?.lessons) return [];
  return weekView.lessons.filter((l) => l.date === dateStr || l.raw?.date === dateStr);
}
