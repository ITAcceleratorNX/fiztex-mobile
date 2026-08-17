import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { attendanceApi } from '@shared/api/attendanceApi';
import {
  attendanceChip,
  marksByLesson,
  sameMarking,
  toEntryChange,
  withMarkToggled,
  withStatus,
} from '@shared/api/attendanceMap';

/**
 * Свои отметки за неделю — бейджи на карточках расписания.
 *
 * <b>Отдельный запрос, а не поле расписания.</b> Расписание отвечает за то, какие уроки
 * есть, посещаемость — за то, что на них было; у них разный жизненный цикл (лист правят
 * и публикуют после урока) и разная область видимости. Поэтому и ошибка здесь не
 * ломает экран: без отметок расписание остаётся расписанием, чипы просто не появляются.
 *
 * @param {{dateFrom: string, dateTo: string, childId?: number|null, enabled?: boolean}} options
 * @returns {{marks: Record<number, string>, reload: () => Promise<void>}}
 */
export function useMyAttendanceMarks({ dateFrom, dateTo, childId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const [marks, setMarks] = useState({});

  const reload = useCallback(async () => {
    if (!token || !enabled || !dateFrom || !dateTo) {
      setMarks({});
      return;
    }
    try {
      const list = await attendanceApi.myMarks(token, { dateFrom, dateTo, childId });
      setMarks(marksByLesson(list));
    } catch {
      // Молча: посещаемость — украшение карточки, а не её содержание. Показывать
      // ошибку поверх расписания значило бы пугать тем, что уроков не касается.
      setMarks({});
    }
  }, [token, enabled, dateFrom, dateTo, childId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { marks, reload };
}

/**
 * Своя отметка на одном уроке — плитка «Посещаемость» на карточке урока.
 *
 * Пусто по трём разным причинам, и все три для экрана одинаковы: урок ещё не
 * заполняли, учитель не опубликовал, урок отменён и витрина погашена. Различать их
 * ученику незачем — во всех случаях смотреть нечего.
 *
 * @returns {{loading: boolean, chip: string|null, marking: object|null, reload: () => Promise<void>}}
 */
export function useMyLessonAttendance(lessonId, { childId = null, enabled = true } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(lessonId) && enabled);
  const [marking, setMarking] = useState(null);

  const reload = useCallback(async () => {
    if (!token || !lessonId || !enabled) {
      setMarking(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const view = await attendanceApi.myLessonMark(token, lessonId, childId);
      setMarking(view?.attendance ?? null);
    } catch {
      setMarking(null);
    } finally {
      setLoading(false);
    }
  }, [token, lessonId, childId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, marking, chip: attendanceChip(marking), reload };
}

/**
 * Состояние листа урока — плитка «Посещаемость» у учителя и админа.
 *
 * Запрос включается только там, где карточка урока уже вернула capability
 * `VIEW_ATTENDANCE`: без неё бэк ответит 403, и ходить за гарантированной ошибкой
 * ради выключенной плитки незачем.
 */
export function useLessonAttendanceSheet(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(lessonId) && enabled);
  const [sheet, setSheet] = useState(null);

  const reload = useCallback(async () => {
    if (!token || !lessonId || !enabled) {
      setSheet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setSheet(await attendanceApi.sheet(token, lessonId));
    } catch {
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [token, lessonId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, sheet, reload };
}

/**
 * История изменений листа — счётчик в свёрнутой строке и первые записи в развёрнутой.
 *
 * Одним запросом, а не двумя: счётчик приходит в `totalElements` той же страницы, что и
 * записи, и просить его отдельно значило бы сходить на сервер дважды за одним фактом.
 * Ошибка гасится — история поясняет лист, а не заменяет его.
 */
export function useAttendanceHistory(lessonId, { enabled = true, size = 5 } = {}) {
  const { token } = useAuth();
  const [total, setTotal] = useState(null);
  const [rows, setRows] = useState([]);

  const reload = useCallback(async () => {
    if (!token || !lessonId || !enabled) {
      setTotal(null);
      setRows([]);
      return;
    }
    try {
      const page = await attendanceApi.history(token, lessonId, { page: 0, size });
      setTotal(typeof page?.totalElements === 'number' ? page.totalElements : null);
      setRows(Array.isArray(page?.content) ? page.content : []);
    } catch {
      setTotal(null);
      setRows([]);
    }
  }, [token, lessonId, enabled, size]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { total, rows, reload };
}

/**
 * Экран посещаемости урока: лист, локальные правки и три команды бэка.
 *
 * <b>Правки живут отдельно от листа.</b> `drafts` — только то, что учитель изменил и ещё
 * не сохранил; всё остальное читается из ответа бэка. Это не оптимизация: лист правят
 * несколько человек (основной учитель, замещающий, админ), и «слить своё в общую копию»
 * означало бы потерять признак того, что именно ты изменил и что нужно отправить.
 *
 * <b>Версия не хранится отдельно от листа.</b> Каждая команда возвращает лист целиком с
 * новой версией — он и становится состоянием. Помнить версию рядом значит однажды
 * отправить прошлую.
 *
 * <b>Конфликт не стирает работу.</b> На 409 локальные правки остаются на экране: их
 * автор ещё не решил, что с ними делать. Стирает их только явное «Обновить данные» —
 * то есть сам учитель.
 */
export function useAttendanceEditor(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();

  const [loading, setLoading] = useState(Boolean(lessonId) && enabled);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [sheet, setSheet] = useState(null);

  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState({});

  const [busy, setBusy] = useState(null); // 'draft' | 'publish' | 'bulk' | null
  const [conflict, setConflict] = useState(false);
  const [unmarked, setUnmarked] = useState([]);
  const [bulkConfirm, setBulkConfirm] = useState(null); // { affectedCount }
  const [actionError, setActionError] = useState(null);

  // Ответ любой команды — это и есть новое состояние листа: версия, счётчики и флаги
  // в нём уже посчитаны так же, как их посчитал бы следующий GET.
  const accept = useCallback((view) => {
    setSheet(view);
    setDrafts({});
    setConflict(false);
    setUnmarked([]);
    setBulkConfirm(null);
    setActionError(null);
  }, []);

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
      accept(await attendanceApi.sheet(token, lessonId));
    } catch (e) {
      // 404 — урока не видно вовсе, 403 — виден, но лист не положен. Для экрана это
      // один и тот же тупик «сюда нельзя», и разделять его сообщениями незачем.
      if (e?.status === 404 || e?.status === 403) {
        setForbidden(true);
        setSheet(null);
        return;
      }
      setError(e?.message || 'Не удалось загрузить посещаемость');
      if (!silent) setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [token, lessonId, enabled, accept]);

  useEffect(() => {
    load();
  }, [load]);

  /** Строки экрана: состав из листа плюс несохранённые правки поверх. */
  const rows = useMemo(() => {
    const entries = Array.isArray(sheet?.entries) ? sheet.entries : [];
    return entries.map((entry) => {
      const saved = entry.draft || null;
      const local = drafts[entry.studentProfileId];
      return {
        studentProfileId: entry.studentProfileId,
        fullName: entry.fullName,
        published: entry.published || null,
        marking: local || saved,
        dirty: Boolean(local) && !sameMarking(local, saved),
      };
    });
  }, [sheet, drafts]);

  const dirty = rows.some((row) => row.dirty);

  // Счётчик берётся из строк, а не из `sheet.markedCount`: пока правки не сохранены,
  // серверный счётчик отстаёт, и «Опубликовать» вело бы себя не так, как выглядит.
  const markedCount = rows.filter((row) => row.marking?.status && row.marking.status !== 'NOT_MARKED').length;
  const totalCount = rows.length;

  const edit = useCallback((studentProfileId, apply) => {
    setDrafts((prev) => {
      const current = prev[studentProfileId]
        ?? sheet?.entries?.find((e) => e.studentProfileId === studentProfileId)?.draft
        ?? { status: 'NOT_MARKED', mark: null, reason: null, comment: null };
      return { ...prev, [studentProfileId]: apply(current) };
    });
    // Правка отвечает на «опубликуйте неполный лист»: подсветка снимается с того, кого
    // только что отметили, а не со всех сразу.
    setUnmarked((prev) => prev.filter((id) => id !== studentProfileId));
  }, [sheet]);

  const setStatus = useCallback(
    (id, status) => edit(id, (m) => withStatus(m, status)), [edit],
  );
  const toggleMark = useCallback((id) => edit(id, withMarkToggled), [edit]);
  const setReason = useCallback(
    (id, reason) => edit(id, (m) => ({ ...m, reason })), [edit],
  );
  const setComment = useCallback(
    (id, comment) => edit(id, (m) => ({ ...m, comment: comment || null })), [edit],
  );

  /**
   * Разбор отказа. Все три кода — не сбой, а состояние экрана: у каждого свой ответ,
   * и показывать их одинаковым «что-то пошло не так» значило бы прятать подсказку,
   * которую бэк уже дал.
   */
  const handleFailure = useCallback((e) => {
    switch (e?.code) {
      case 'ATTENDANCE_VERSION_CONFLICT':
      case 'ATTENDANCE_SHEET_CONFLICT':
        setConflict(true);
        return;
      case 'ATTENDANCE_INCOMPLETE':
        setUnmarked(e?.details?.unmarkedStudentProfileIds || []);
        setActionError('Опубликовать можно только полностью заполненную посещаемость');
        return;
      case 'ATTENDANCE_BULK_OVERWRITE_CONFIRM_REQUIRED':
        setBulkConfirm({ affectedCount: e?.details?.affectedCount ?? 0 });
        return;
      default:
        setActionError(e?.message || 'Не удалось сохранить');
    }
  }, []);

  const changedEntries = useCallback(
    () => rows.filter((row) => row.dirty).map((row) => toEntryChange(row.studentProfileId, row.marking)),
    [rows],
  );

  const run = useCallback(async (kind, action) => {
    if (!token || !lessonId) return null;
    setBusy(kind);
    setActionError(null);
    try {
      const view = await action();
      accept(view);
      return view;
    } catch (e) {
      handleFailure(e);
      return null;
    } finally {
      setBusy(null);
    }
  }, [token, lessonId, accept, handleFailure]);

  const saveDraft = useCallback(async () => {
    const entries = changedEntries();
    if (entries.length === 0) return true;
    const view = await run('draft', () => attendanceApi.saveDraft(token, lessonId, {
      entries,
      expectedVersion: sheet?.version ?? null,
    }));
    return Boolean(view);
  }, [changedEntries, run, token, lessonId, sheet]);

  /**
   * Публикация всегда идёт от сохранённого черновика: бэк публикует то, что лежит в
   * листе, а не то, что видит экран. Поэтому несохранённые правки сначала уходят
   * черновиком — иначе «Опубликовать» опубликовало бы прошлую версию, ничего об этом
   * не сказав.
   */
  const publish = useCallback(async () => {
    const entries = changedEntries();
    let version = sheet?.version ?? null;
    if (entries.length > 0) {
      const saved = await run('publish', () => attendanceApi.saveDraft(token, lessonId, {
        entries,
        expectedVersion: version,
      }));
      if (!saved) return false;
      version = saved.version ?? null;
    }
    const view = await run('publish', () => attendanceApi.publish(token, lessonId, {
      expectedVersion: version,
    }));
    return Boolean(view);
  }, [changedEntries, run, token, lessonId, sheet]);

  /**
   * «Все присутствуют». Подтверждение не спрашивается заранее: нужно ли оно, знает
   * бэк — он же считает, что именно будет затёрто (§12). Первый заход идёт без флага,
   * и только отказ поднимает диалог.
   */
  const markAllPresent = useCallback(async ({ confirmOverwrite = false } = {}) => {
    const view = await run('bulk', () => attendanceApi.markAllPresent(token, lessonId, {
      expectedVersion: sheet?.version ?? null,
      confirmOverwrite,
    }));
    return Boolean(view);
  }, [run, token, lessonId, sheet]);

  const startEditing = useCallback(() => setEditing(true), []);
  const stopEditing = useCallback(() => {
    setEditing(false);
    setDrafts({});
    setUnmarked([]);
    setActionError(null);
  }, []);

  const refresh = useCallback(async () => {
    setDrafts({});
    await load({ silent: true });
  }, [load]);

  return {
    loading,
    error,
    forbidden,
    sheet,
    rows,
    dirty,
    markedCount,
    totalCount,
    editing,
    startEditing,
    stopEditing,
    busy,
    conflict,
    unmarked,
    bulkConfirm,
    actionError,
    dismissBulkConfirm: () => setBulkConfirm(null),
    dismissActionError: () => setActionError(null),
    setStatus,
    toggleMark,
    setReason,
    setComment,
    saveDraft,
    publish,
    markAllPresent,
    refresh,
    reload: load,
  };
}
