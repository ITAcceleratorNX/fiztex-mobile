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

// Подписи по позиции внутри недели (0 = понедельник), а не по индексу в массиве
// рабочих дней: у шестидневки суббота обязана быть «Сб», а не пятой подписью.
const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEKDAY_NAMES = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY',
];
// Пока расписание не пришло, показываем пятидневку — самый частый случай.
// Как только вьюха отдаст `workingDays`, полоска перестроится под школу.
const DEFAULT_WORKING_OFFSETS = [0, 1, 2, 3, 4];

/** Monday of the week containing `dateStr` (YYYY-MM-DD in, YYYY-MM-DD out). */
export function startOfWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return localDateKey(d);
}

/**
 * Воскресенье той же недели — верхняя граница диапазонных запросов на неделю.
 *
 * Всегда семь дней, а не «последний учебный день»: шестидневка, разовое занятие в
 * выходной или перенос сделали бы границу по учебным дням короче фактической недели,
 * и урок субботы выпал бы из ответа.
 */
export function endOfWeek(dateStr) {
  const d = new Date(`${startOfWeek(dateStr)}T12:00:00`);
  d.setDate(d.getDate() + 6);
  return localDateKey(d);
}

/**
 * Учебные дни года → смещения от понедельника (0..6), по возрастанию.
 *
 * Календарь школы приходит с бэка (`RoleScheduleView.workingDays`): захардкоженная
 * пятидневка прятала субботние уроки шестидневки, а в выходной ещё и оставляла
 * полоску без выбранного дня — экран выглядел сломанным.
 */
export function workingDayOffsets(weekView) {
  const days = weekView?.workingDays;
  if (!Array.isArray(days) || days.length === 0) return DEFAULT_WORKING_OFFSETS;
  const offsets = days
    .map((d) => WEEKDAY_NAMES.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  return offsets.length ? offsets : DEFAULT_WORKING_OFFSETS;
}

/**
 * School days spanning several weeks around `centerDate`, so the strip can
 * scroll into previous and next weeks instead of being stuck on one.
 *
 * Dates are formatted from local parts — `toISOString()` would render the
 * previous day for any timezone ahead of UTC during the early morning.
 *
 * @param {number[]} offsets  учебные дни как смещения от понедельника (см. workingDayOffsets)
 */
export function buildDayStrip(centerDate, offsets = DEFAULT_WORKING_OFFSETS, weeksAround = 12) {
  const monday = new Date(`${startOfWeek(centerDate)}T12:00:00`);
  monday.setDate(monday.getDate() - weeksAround * 7);
  const out = [];
  for (let w = 0; w <= weeksAround * 2; w += 1) {
    for (const offset of offsets) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + w * 7 + offset);
      out.push({ label: DAY_LABELS[offset], date: localDateKey(d), dayNum: d.getDate() });
    }
  }
  return out;
}

/**
 * Ближайший учебный день не раньше `dateStr` — куда встать, если приложение
 * открыли в выходной. Раньше выбиралось «сегодня», которого в полоске нет:
 * ни один чип не подсвечивался, и пустой день читался как поломка.
 */
export function nearestSchoolDay(dateStr, offsets = DEFAULT_WORKING_OFFSETS) {
  if (!offsets.length) return dateStr;
  const d = new Date(`${dateStr}T12:00:00`);
  for (let i = 0; i < 7; i += 1) {
    const offset = (d.getDay() + 6) % 7; // 0 = понедельник
    if (offsets.includes(offset)) return localDateKey(d);
    d.setDate(d.getDate() + 1);
  }
  return dateStr;
}

export function lessonsForDate(weekView, dateStr) {
  if (!weekView?.lessons) return [];
  return weekView.lessons.filter((l) => l.date === dateStr || l.raw?.date === dateStr);
}
