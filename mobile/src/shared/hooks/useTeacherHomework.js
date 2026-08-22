import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { homeworkApi } from '@shared/api/homeworkApi';
import { scheduleApi } from '@shared/api/scheduleApi';

/**
 * Учительская сторона модуля ДЗ (ТЗ HOMEWORK-001, 002, 004, 005.1).
 *
 * Права здесь не вычисляются: что можно сделать с заданием, выводится из его статуса
 * ({@link homeworkActions}), а последнее слово всё равно за сервером — экран лишь не
 * предлагает заведомо недопустимое.
 */

function errorKind(e) {
  if (e?.status === 403) return 'forbidden';
  if (e?.status === 404) return 'missing';
  return 'load';
}

/**
 * Что учитель может сделать с заданием сейчас (001 §7, §12).
 *
 * Черновик — единственное состояние, которое удаляется физически: у опубликованного уже
 * есть получатели, и «удалить» для них означало бы исчезновение задания задним числом.
 */
export function homeworkActions(homework) {
  switch (homework?.status) {
    case 'DRAFT':
      return { edit: true, publish: true, complete: false, reopen: false, cancel: false, remove: true, review: false };
    case 'PUBLISHED':
      return { edit: true, publish: false, complete: true, reopen: false, cancel: true, remove: false, review: true };
    case 'COMPLETED':
      return { edit: false, publish: false, complete: false, reopen: true, cancel: true, remove: false, review: true };
    case 'CANCELLED':
      return { edit: false, publish: false, complete: false, reopen: false, cancel: false, remove: false, review: false };
    default:
      return { edit: false, publish: false, complete: false, reopen: false, cancel: false, remove: false, review: false };
  }
}

/**
 * Карточка задания: само задание, материалы и список работ.
 *
 * Три запроса, а не один: ростер у черновика не существует (получателей ещё нет), и
 * спрашивать его там значило бы ходить за гарантированной ошибкой. Материалы и ростер
 * некритичны — их сбой не должен стирать карточку.
 */
export function useTeacherHomeworkCard(homeworkId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, homework: null });
  const [materials, setMaterials] = useState([]);
  const [roster, setRoster] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!token || !homeworkId) {
      setState({ loading: false, error: null, homework: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const homework = await homeworkApi.one(token, homeworkId);
      setState({ loading: false, error: null, homework });

      try {
        setMaterials(await homeworkApi.materials(token, homeworkId));
      } catch {
        setMaterials([]);
      }
      if (homework?.status && homework.status !== 'DRAFT') {
        try {
          setRoster(await homeworkApi.roster(token, homeworkId));
        } catch {
          setRoster(null);
        }
      } else {
        setRoster(null);
      }
    } catch (e) {
      setState({ loading: false, error: errorKind(e), homework: null });
    }
  }, [token, homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, materials, roster, reload: load };
}

/**
 * Действия над заданием. Одно состояние занятости на все: пока идёт публикация, вторая
 * кнопка не должна начинать своё — сервер разрешил бы, а учитель получил бы два перехода
 * статуса подряд, о которых не просил.
 */
export function useHomeworkActions(homeworkId, { onDone } = {}) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async (action, fn) => {
    if (!token || !homeworkId || busy) return false;
    setBusy(action);
    setError(null);
    try {
      const result = await fn();
      await onDone?.(action, result);
      return true;
    } catch (e) {
      setError(e?.message || 'Не удалось выполнить действие');
      return false;
    } finally {
      setBusy(null);
    }
  }, [token, homeworkId, busy, onDone]);

  return {
    busy,
    error,
    clearError: () => setError(null),
    publish: () => run('publish', () => homeworkApi.publish(token, homeworkId)),
    complete: () => run('complete', () => homeworkApi.complete(token, homeworkId)),
    reopen: () => run('reopen', () => homeworkApi.reopen(token, homeworkId)),
    cancel: () => run('cancel', () => homeworkApi.cancel(token, homeworkId)),
    remove: () => run('remove', () => homeworkApi.remove(token, homeworkId)),
    copy: () => run('copy', () => homeworkApi.copy(token, homeworkId)),
    addMaterial: (file) => run('material', () => homeworkApi.addMaterialFile(token, homeworkId, file)),
    deleteMaterial: (materialId) =>
      run('material', () => homeworkApi.deleteMaterial(token, homeworkId, materialId)),
  };
}

/**
 * Контекст формы создания: что учитель вправе выбрать.
 *
 * Источник — его собственное расписание, а не школьные справочники: `/api/admin/*`
 * учительскому токену отвечает 401, и общий клиент считает это концом сессии. Неделя
 * покрывает и пары «класс + предмет», и сами уроки для привязки.
 */
export function useTeacherTeachingContext({ enabled = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: enabled, error: null, lessons: [] });

  const load = useCallback(async () => {
    if (!token || !enabled) {
      setState({ loading: false, error: null, lessons: [] });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Две недели: задание выдают на этой неделе или на следующий урок, а дальше
      // привязка теряет смысл — за месяц вперёд расписание ещё переиздадут.
      const [current, next] = await Promise.all([
        scheduleApi.meWeek(token),
        scheduleApi.meWeek(token, shiftWeek(1)),
      ]);
      const lessons = [...(current?.lessons ?? []), ...(next?.lessons ?? [])]
        .filter((lesson) => lesson.lessonInstanceId != null)
        .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
      setState({ loading: false, error: null, lessons });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), lessons: [] });
    }
  }, [token, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

function shiftWeek(weeks) {
  const date = new Date();
  date.setDate(date.getDate() + weeks * 7);
  return date.toLocaleDateString('sv-SE');
}

/**
 * Задания одного урока глазами учителя — то, что показывает карточка урока.
 *
 * Обе вкладки сразу: у урока вкладок нет, а завершённое задание с него никуда не девается
 * и остаётся частью ответа на вопрос «что задавали». Правило «что относится к уроку»
 * считает сервер (привязка либо срок в день урока) — клиент его не повторяет.
 */
export function useTeacherLessonHomework(lessonId, { enabled = true } = {}) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: Boolean(lessonId && enabled), error: null, rows: [] });

  const load = useCallback(async (silent = false) => {
    if (!token || !lessonId || !enabled) {
      setState({ loading: false, error: null, rows: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [actual, history] = await Promise.all([
        homeworkApi.list(token, { scope: 'ACTUAL', lessonId, size: 50 }),
        homeworkApi.list(token, { scope: 'HISTORY', lessonId, size: 50 }),
      ]);
      setState({
        loading: false,
        error: null,
        rows: [...(actual?.content ?? []), ...(history?.content ?? [])],
      });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), rows: [] });
    }
  }, [token, lessonId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/** Сохранение задания: создание и правка отличаются только вызовом. */
export function useHomeworkSave() {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = useCallback(async ({ homeworkId, body, publish }) => {
    if (!token || saving) return null;
    setSaving(true);
    setError(null);
    try {
      const saved = homeworkId
        ? await homeworkApi.update(token, homeworkId, body)
        : await homeworkApi.create(token, body);
      if (publish) {
        // Публикация — отдельный шаг после сохранения: у «до следующего урока» она может
        // отказать (урока впереди нет), и черновик при этом обязан остаться сохранённым.
        await homeworkApi.publish(token, saved.id);
      }
      return saved;
    } catch (e) {
      setError(e?.message || 'Не удалось сохранить задание');
      return null;
    } finally {
      setSaving(false);
    }
  }, [token, saving]);

  return { save, saving, error, clearError: () => setError(null) };
}

/** Работа одного ученика и решение по ней (004 §5, §9). */
export function useTeacherSubmission(homeworkId, studentProfileId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(async (silent = false) => {
    if (!token || !homeworkId || !studentProfileId) {
      setState({ loading: false, error: null, data: null });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      setState({
        loading: false,
        error: null,
        data: await homeworkApi.submission(token, homeworkId, studentProfileId),
      });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), data: null });
    }
  }, [token, homeworkId, studentProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function useSubmissionReview(homeworkId, studentProfileId, { onSuccess } = {}) {
  const { token } = useAuth();
  const [sending, setSending] = useState(null);
  const [error, setError] = useState(null);

  const decide = useCallback(async (decision, { expectedAttemptId, comment, photos }) => {
    if (!token || sending) return false;
    if (!expectedAttemptId) {
      setError('Работа ещё не отправлена — решать нечего');
      return false;
    }
    setSending(decision);
    setError(null);
    try {
      await homeworkApi.review(token, homeworkId, studentProfileId, {
        decision,
        expectedAttemptId,
        comment,
        photos,
      });
      await onSuccess?.();
      return true;
    } catch (e) {
      setError(e?.message || 'Не удалось сохранить решение');
      return false;
    } finally {
      setSending(null);
    }
  }, [token, homeworkId, studentProfileId, sending, onSuccess]);

  return { decide, sending, error, clearError: () => setError(null) };
}
