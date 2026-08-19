import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { profileApi } from '@shared/api/profileApi';
import { attendanceApi } from '@shared/api/attendanceApi';

/**
 * Свой профиль. Имя и роль известны сразу после входа, поэтому экран не пустует, пока
 * идёт запрос: заголовок рисуется по данным сессии, а профиль дополняет его классом,
 * предметами и детьми — тем, чего в токене нет.
 */
export function useMyProfile() {
  const { token, fullName, role } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, profile: null });

  const reload = useCallback(async (silent = false) => {
    if (!token) {
      setState({ loading: false, error: null, profile: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, profile: await profileApi.me(token) });
    } catch (e) {
      setState({ loading: false, error: e.message || 'Не удалось загрузить профиль', profile: null });
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const profile = state.profile;
  return {
    ...state,
    reload,
    // Пока профиль едет — то, что уже знает сессия: экран «Я» без имени выглядит сломанным.
    displayName: profile?.fullName || fullName || '',
    role: profile?.role || role || null,
    className: profile?.student?.className || null,
    academicYearName: profile?.student?.academicYearName || null,
    assignments: profile?.teacher?.assignments ?? [],
    children: profile?.children ?? [],
  };
}

/**
 * Посещаемость за месяц — доля посещённых уроков.
 *
 * Считается по тем же четырём счётчикам, что и месячная сводка: знаменатель — все уроки,
 * по которым есть отметка, а не календарные. Освобождение не пропуск, поэтому оно в
 * числителе вместе с присутствием — иначе законно освобождённый ученик выглядел бы
 * прогульщиком.
 *
 * @param {number|null} childId профиль ребёнка для родителя; `null` — свои отметки
 */
export function useAttendanceRate(childId = null) {
  const { token } = useAuth();
  const [rate, setRate] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    attendanceApi
      .summary(token, { childId })
      .then((summary) => {
        if (!alive || !summary) return;
        const attended = (summary.attendedCount ?? 0) + (summary.excusedCount ?? 0)
          + (summary.lateCount ?? 0);
        const total = attended + (summary.missedCount ?? 0);
        setRate(total > 0 ? Math.round((attended / total) * 100) : null);
      })
      .catch(() => {
        // Профиль не должен падать из-за сводки: строка просто не показывается.
        if (alive) setRate(null);
      });
    return () => {
      alive = false;
    };
  }, [token, childId]);

  return rate;
}
