import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@features/auth/AuthContext';
import { myClassApi } from '@shared/api/myClassApi';
import { studentCodesApi } from '@shared/api/studentCodesApi';
import { mergeRoster } from './studentCodeModel';

/**
 * Загрузка с перечитыванием при каждом возвращении на экран: код выдают ещё и в вебе, и
 * администратор, и второй родитель — «выдан» и «входил» должны быть свежими, а не с первого
 * открытия. Повторная загрузка тихая: прежние данные стоят на экране, пока идёт запрос.
 *
 * `data === undefined` — ещё ни разу не загрузили; `null` — загрузили, и строки нет.
 */
function useFocusedLoad(load) {
  const { token } = useAuth();
  const [state, setState] = useState({ data: undefined, error: null });
  const sequence = useRef(0);

  const reload = useCallback(async () => {
    const id = ++sequence.current;
    setState((old) => ({ data: old.data, error: null }));
    try {
      const data = await load(token);
      if (id === sequence.current) setState({ data, error: null });
    } catch (error) {
      if (id === sequence.current) setState((old) => ({ data: old.data, error }));
    }
  }, [load, token]);

  useFocusEffect(useCallback(() => {
    reload();
    return () => { sequence.current += 1; };
  }, [reload]));

  return {
    data: state.data,
    error: state.error,
    loading: state.data === undefined && !state.error,
    reload,
  };
}

/** Классы руководства с числом учеников — раздел профиля учителя (2460:4109). */
export function useHomeroomClasses() {
  const load = useCallback(async (token) => {
    const context = await myClassApi.context(token);
    return Promise.all((context?.classes || []).map(async (item) => {
      // Число — подпись, а не условие входа: не загрузилось — строка остаётся без него.
      const count = await myClassApi.roster(token, item.id, { size: 1 })
        .then((page) => page?.totalItems ?? null, () => null);
      return { id: item.id, name: item.name, count };
    }));
  }, []);
  return useFocusedLoad(load);
}

/** Состав класса вместе с разрешениями учителя (2460:4192). */
export function useHomeroomRoster(classId) {
  const load = useCallback(async (token) => {
    const [roster, grants] = await Promise.all([
      myClassApi.rosterAll(token, classId),
      studentCodesApi.teacherStudents(token),
    ]);
    return { rows: mergeRoster(roster.items, grants), total: roster.totalItems };
  }, [classId]);
  return useFocusedLoad(load);
}

/** Строка доступа одного ученика у учителя; `null` — разрешения на него нет. */
export function useTeacherStudentAccess(studentProfileId) {
  const load = useCallback(async (token) => {
    const list = await studentCodesApi.teacherStudents(token);
    return (list || []).find((row) => row.studentProfileId === studentProfileId) || null;
  }, [studentProfileId]);
  return useFocusedLoad(load);
}

/** Строка доступа своего ребёнка у родителя; `null` — школа связь не подтверждает. */
export function useChildAccess(studentProfileId) {
  const load = useCallback(async (token) => {
    const list = await studentCodesApi.children(token);
    return (list || []).find((row) => row.studentProfileId === studentProfileId) || null;
  }, [studentProfileId]);
  return useFocusedLoad(load);
}
