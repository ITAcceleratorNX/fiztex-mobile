import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { finalGradesApi, gradebookApi, gradesApi } from '@shared/api/gradesApi';
import { diaryGradesByLesson } from '@shared/api/gradesMap';
import { useGradeResource } from './useGradeResource';

/**
 * Шкала оценок — справочник, а не константы клиента (grades-read-contract §2).
 *
 * Загружается один раз на сессию: за учебный год она не меняется, а зашить «2, 3−, 3 …»
 * в приложение значило бы завести вторую шкалу, которая разойдётся с той, что принимает
 * бэк.
 */
export function useGradeScale() {
  const { token } = useAuth();
  const [scale, setScale] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setScale([]);
      return undefined;
    }
    gradesApi
      .scale(token)
      .then((list) => {
        if (alive) setScale(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        // Молча: без шкалы шит не открыть, но экран остаётся читаемым — оценки в нём
        // уже есть, и падать целиком из-за справочника незачем.
        if (alive) setScale([]);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return scale;
}

/**
 * Лист оценок урока и три команды над ним.
 *
 * <b>Состояние — это ответ бэка.</b> Команда возвращает саму оценку, а не лист, поэтому
 * после каждой лист перечитывается: в нём считаются права на каждую строку и лимит на
 * ученика, и собирать это на клиенте значило бы повторять серверные правила.
 *
 * <b>Ошибка команды не ломает экран.</b> Она возвращается вызывающему (шит покажет её
 * рядом с той клеткой, к которой она относится), а лист остаётся тем, что был.
 */
export function useLessonGrades(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();

  const [loading, setLoading] = useState(Boolean(lessonId) && enabled);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!token || !lessonId || !enabled) {
      setSheet(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setSheet(await gradesApi.lessonSheet(token, lessonId));
    } catch (e) {
      // 404 — урока не видно вовсе, 403 — виден, но оценки не положены. Для экрана это
      // один тупик «сюда нельзя».
      if (e?.status === 404 || e?.status === 403) {
        setForbidden(true);
        setSheet(null);
        return;
      }
      setError(e?.message || 'Не удалось загрузить оценки');
    } finally {
      setLoading(false);
    }
  }, [token, lessonId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  /** @returns {Promise<null|string>} `null` — получилось; строка — что показать учителю */
  const run = useCallback(async (action) => {
    setBusy(true);
    try {
      await action();
      await load({ silent: true });
      return null;
    } catch (e) {
      return e?.message || 'Не удалось сохранить оценку';
    } finally {
      setBusy(false);
    }
  }, [load]);

  /** `value` — `{ scaleCode }` или `{ score, maxScore }`: форму называет лист (GRADES-003). */
  const createGrade = useCallback(
    (studentProfileId, value, gradeType) =>
      run(() => gradesApi.create(token, { studentProfileId, lessonId, value, gradeType })),
    [run, token, lessonId],
  );

  const updateGrade = useCallback(
    (gradeId, value, gradeType) =>
      run(() => gradesApi.update(token, gradeId, { value, gradeType })),
    [run, token],
  );

  const removeGrade = useCallback(
    (gradeId) => run(() => gradesApi.remove(token, gradeId)),
    [run, token],
  );

  return {
    loading, error, forbidden, sheet, busy,
    reload: load,
    createGrade, updateGrade, removeGrade,
  };
}

/**
 * Шапка журнала: активный год, его периоды и доступные пары «класс + предмет».
 *
 * Список приходит с бэка и содержит **только то, что этот учитель может открыть**:
 * выбрать в фильтре чужой класс нельзя, а свой — не пропадёт.
 */
export function useGradebookContext({ enabled = true } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);

  const reload = useCallback(async () => {
    if (!token || !enabled) {
      setContext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setContext(await gradebookApi.context(token));
    } catch (e) {
      setError(e?.message || 'Не удалось загрузить журнал');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [token, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const scopes = context?.scopes || [];
  const periods = context?.periods || [];

  return { loading, error, context, scopes, periods, reload };
}

/** Журнал класса за период. Обязательны класс, предмет и период — без них запроса нет. */
export function useJournal({ classId, subjectId, academicPeriodId, subgroupId = null } = {}) {
  const { token } = useAuth();
  const ready = Boolean(token && classId && subjectId && academicPeriodId);

  const [loading, setLoading] = useState(ready);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [journal, setJournal] = useState(null);

  const reload = useCallback(async () => {
    if (!ready) {
      setJournal(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setJournal(
        await gradebookApi.journal(token, { classId, subjectId, academicPeriodId, subgroupId }),
      );
    } catch (e) {
      if (e?.status === 403) {
        setForbidden(true);
        setJournal(null);
        return;
      }
      setError(e?.message || 'Не удалось загрузить журнал');
      setJournal(null);
    } finally {
      setLoading(false);
    }
  }, [ready, token, classId, subjectId, academicPeriodId, subgroupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, forbidden, journal, reload };
}

/**
 * Итоги класса за период и команды над ними.
 *
 * `canManage` приходит с бэка: у админа экран открывается, но выставлять он не может
 * ни при каких условиях (final-grades-contract §9). Роль здесь не проверяется.
 */
export function useClassFinals({ classId, subjectId, academicPeriodId, subgroupId = null } = {}) {
  const { token } = useAuth();
  const ready = Boolean(token && classId && subjectId && academicPeriodId);

  const [loading, setLoading] = useState(ready);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [finals, setFinals] = useState(null);
  const [busy, setBusy] = useState(false);

  const target = useMemo(
    () => ({ classId, subjectId, academicPeriodId, subgroupId }),
    [classId, subjectId, academicPeriodId, subgroupId],
  );

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!ready) {
      setFinals(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      setFinals(await finalGradesApi.ofClass(token, target));
    } catch (e) {
      if (e?.status === 403) {
        setForbidden(true);
        setFinals(null);
        return;
      }
      setError(e?.message || 'Не удалось загрузить итоги');
      setFinals(null);
    } finally {
      setLoading(false);
    }
  }, [ready, token, target]);

  useEffect(() => {
    reload();
  }, [reload]);

  /** @returns {Promise<null|Error>} `null` — получилось; ошибка — чтобы экран разобрал код */
  const run = useCallback(async (action) => {
    setBusy(true);
    try {
      await action();
      await reload({ silent: true });
      return null;
    } catch (e) {
      return e;
    } finally {
      setBusy(false);
    }
  }, [reload]);

  /** Один вызов на «поставить» и «изменить»: у итога либо есть id, либо его ещё нет. */
  const setFinalValue = useCallback(
    (row, value) =>
      run(() =>
        row?.finalGrade?.id
          ? finalGradesApi.changeValue(token, row.finalGrade.id, value)
          : finalGradesApi.create(token, {
            studentProfileId: row.studentProfileId,
            subjectId: target.subjectId,
            academicPeriodId: target.academicPeriodId,
            value,
          })),
    [run, token, target],
  );

  const publishAll = useCallback(
    () => run(() => finalGradesApi.publishClass(token, target)),
    [run, token, target],
  );

  return { loading, error, forbidden, finals, busy, reload, setFinalValue, publishAll };
}

// ─── Ученик и родитель ───────────────────────────────────────────────────────

/**
 * Раздел «Оценки»: предметы за период, их оценки и средние (GRADES-FE-001 §7).
 *
 * Период необязателен — сервер сам возьмёт идущий сейчас и вернёт список всех, чтобы
 * экрану было чем переключать четверть. Считать «текущую четверть» на телефоне нельзя:
 * списка периодов ученику не отдают, а дата в чужом часовом поясе врёт на границе.
 *
 * `childStudentProfileId` — контекст родителя; ученику он ничего не даёт.
 */
export function useMySubjectGrades({ academicPeriodId = null, childStudentProfileId = null } = {}) {
  const { token, role } = useAuth();
  const load = useCallback(
    () => gradesApi.mySubjects(token, { academicPeriodId, childStudentProfileId }),
    [token, academicPeriodId, childStudentProfileId],
  );
  const resource = useGradeResource(load, Boolean(token && (role !== 'PARENT' || childStudentProfileId != null)));
  const view = resource.data;
  return {
    ...resource, view,
    subjects: view?.subjects || [],
    periods: view?.periods || [],
    period: view?.period || null,
  };
}

/**
 * Свои оценки за неделю — чипы на карточках расписания.
 *
 * Отдельный запрос, а не поле расписания: у них разный жизненный цикл, и ошибка здесь
 * не должна ломать расписание. Поэтому она и гасится молча — без чипов расписание
 * остаётся расписанием. Тот же приём, что у `useMyAttendanceMarks`.
 *
 * @returns {{grades: Record<number, string[]>, reload: () => Promise<void>}}
 */
export function useMyDiaryGrades({
  dateFrom, dateTo, childStudentProfileId = null, enabled = true,
} = {}) {
  const { token, role } = useAuth();
  const load = useCallback(async () => {
    const view = await gradebookApi.myDiary(token, { dateFrom, dateTo, childStudentProfileId });
    return diaryGradesByLesson(view?.entries);
  }, [token, dateFrom, dateTo, childStudentProfileId]);
  const resource = useGradeResource(load, Boolean(
    token && enabled && dateFrom && dateTo && (role !== 'PARENT' || childStudentProfileId != null),
  ));
  return { grades: resource.data || {}, reload: resource.reload };
}

/**
 * Экран предмета: оценки за период, средний балл и итоговые.
 *
 * Два источника, и оба обязательны: лента с типами и датами живёт в журнале
 * (`/api/gradebook/students/{id}`), итоги за четверти и год — в своём разделе
 * (`/api/final-grades/my`), где нет черновиков вовсе. Собирать ленту из «моих оценок»
 * нельзя: там нет ни названий уроков, ни среднего.
 */
export function useMySubjectDetail({
  studentProfileId, subjectId, academicPeriodId, academicYearId = null,
  childStudentProfileId = null,
} = {}) {
  const { token, role } = useAuth();
  const load = useCallback(async () => {
    const [history, finals] = await Promise.all([
      gradebookApi.studentSubject(token, studentProfileId, { subjectId, academicPeriodId }),
      finalGradesApi.my(token, { academicYearId, childStudentProfileId }).catch(() => null),
    ]);
    const breakdown = history?.result
      ? await gradesApi.myBreakdown(token, { subjectId, academicPeriodId, childStudentProfileId }).catch(() => null)
      : null;
    return { history, finals, breakdown };
  }, [token, studentProfileId, subjectId, academicPeriodId, academicYearId, childStudentProfileId]);
  const resource = useGradeResource(load, Boolean(
    token && studentProfileId && subjectId && academicPeriodId && (role !== 'PARENT' || childStudentProfileId != null),
  ));
  return {
    ...resource,
    history: resource.data?.history ?? null,
    finals: resource.data?.finals ?? null,
    breakdown: resource.data?.breakdown ?? null,
  };
}

/**
 * Оценка за одно задание — карточка ДЗ ученика и родителя.
 *
 * Отдельный и некритичный запрос: карточка задания оценки не несёт вовсе, а её отсутствие
 * не должно ронять экран — ровно так же, как отметка посещаемости в расписании. Сбой
 * гасится, и карточка остаётся карточкой.
 *
 * За задание ставят одну оценку (уникальный индекс на бэке), но приходит список: правило
 * может измениться, а форма ответа — нет.
 */
export function useMyHomeworkGrade(homeworkId, { childStudentProfileId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const context = useMemo(() => ({ token, homeworkId, childStudentProfileId, enabled }),
    [token, homeworkId, childStudentProfileId, enabled]);
  const [state, setState] = useState(null);
  const sequence = useRef(0);

  const reload = useCallback(async (silent = false) => {
    const requestId = ++sequence.current;
    if (!context.token || !context.homeworkId || !context.enabled) {
      setState({ context, grade: null, loading: false, error: null });
      return;
    }
    setState((old) => ({ context, grade: old?.context === context ? old.grade : null,
      loading: !silent || old?.context !== context || !old?.grade, error: null }));
    try {
      const list = await gradesApi.myHomeworkGrades(context.token, context.homeworkId,
        { childStudentProfileId: context.childStudentProfileId });
      if (requestId === sequence.current) {
        setState({ context, grade: (Array.isArray(list) ? list : [])[0] || null, loading: false, error: null });
      }
    } catch (error) {
      if (requestId === sequence.current) {
        setState((old) => ({ context,
          grade: old?.context === context && error?.status !== 403 && error?.status !== 404 ? old.grade : null,
          loading: false, error: 'Не удалось загрузить оценку' }));
      }
    }
  }, [context]);

  useEffect(() => {
    reload();
    return () => { sequence.current += 1; };
  }, [reload]);

  const visible = state?.context === context ? state : {
    grade: null, loading: Boolean(token && homeworkId && enabled), error: null,
  };
  return { grade: visible.grade, loading: visible.loading, error: visible.error, reload };
}

export function useGradeHistory(gradeId) {
  const { token } = useAuth();
  const load = useCallback(() => gradesApi.history(token, gradeId), [token, gradeId]);
  const resource = useGradeResource(load, Boolean(token && gradeId));
  return { ...resource, events: Array.isArray(resource.data) ? resource.data : [] };
}
