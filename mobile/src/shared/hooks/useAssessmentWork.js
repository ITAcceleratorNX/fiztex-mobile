import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { assessmentApi } from '@shared/api/assessmentApi';
import { kindUnavailableReason } from '@shared/api/assessmentMap';
import { mapSheet } from '@shared/api/assessmentScores';

/**
 * Команды над работами СОР/СОЧ урока (учитель). Каждая действует через `reload` карточки, а не
 * правит состояние локально: работа живёт на карточке, в расписании и в журнале, и источник правды
 * один — ответ сервера. Ошибка возвращается текстом сервера («Лимит СОР исчерпан…»), а не общей фразой.
 */
export function useAssessmentActions(lessonId, reload) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (action, fallback) => {
    if (!token || !lessonId) return false;
    setSaving(true);
    setError(null);
    try {
      await action();
      await reload?.(true);
      return true;
    } catch (e) {
      setError(e?.message || fallback);
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, lessonId, reload]);

  return {
    saving,
    error,
    clearError: () => setError(null),
    create: (input) => run(() => assessmentApi.create(token, lessonId, input), 'Не удалось назначить работу'),
    update: (workId, input) => run(() => assessmentApi.update(token, workId, input), 'Не удалось сохранить изменение'),
    conduct: (workId) => run(() => assessmentApi.conduct(token, workId), 'Не удалось отметить проведение'),
    cancel: (workId, input) => run(() => assessmentApi.cancel(token, workId, input), 'Не удалось отменить работу'),
    reschedule: (workId, input) => run(() => assessmentApi.reschedule(token, workId, input), 'Не удалось перенести работу'),
  };
}

/** Сколько работ ещё можно назначить: спрашивается, когда открывают окно назначения. */
export function useAssessmentLimits(scope, enabled) {
  const { token } = useAuth();
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !token || !scope?.classId || !scope?.subjectId || !scope?.academicPeriodId) return undefined;
    let alive = true;
    setLoading(true);
    assessmentApi.limits(token, scope)
      .then((value) => alive && setLimits(value))
      // Подсказка некритична: без неё окно открывается, а сервер всё равно проверит лимит.
      .catch(() => alive && setLimits(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [enabled, token, scope?.classId, scope?.subjectId, scope?.academicPeriodId, scope?.subgroupId]);

  return {
    limits,
    loading,
    problem: (kind) => kindUnavailableReason(kind, limits),
  };
}

/**
 * Уроки, на которые можно перенести работу: тот же класс, подгруппа, предмет и четверть. Окно дат —
 * вокруг урока работы; отбор по связке здесь, окончательно допустимость проверяет сервер.
 */
export function useRescheduleCandidates(lesson, enabled) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: false, error: null, items: [] });

  useEffect(() => {
    if (!enabled || !token || !lesson?.scope?.classId || !lesson?.date) return undefined;
    let alive = true;
    setState({ loading: true, error: null, items: [] });
    const base = new Date(`${lesson.date}T12:00:00`);
    const iso = (shift) => {
      const d = new Date(base);
      d.setDate(d.getDate() + shift);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    assessmentApi.candidates(token, { classId: lesson.scope.classId, dateFrom: iso(-60), dateTo: iso(120) })
      .then((page) => {
        if (!alive) return;
        const items = (page?.content ?? [])
          .filter((item) =>
            item.id != null && item.id !== lesson.id && item.status === 'ACTIVE'
            && item.subjectId === lesson.scope.subjectId
            && item.academicPeriodId === lesson.scope.academicPeriodId
            && (item.subgroupId ?? null) === (lesson.scope.subgroupId ?? null))
          .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
        setState({ loading: false, error: null, items });
      })
      .catch((e) => alive && setState({ loading: false, error: e?.message || 'Не удалось загрузить уроки', items: [] }));
    return () => { alive = false; };
  }, [enabled, token, lesson?.id, lesson?.date, lesson?.scope?.classId]);

  return state;
}

/**
 * Лист баллов одной работы и сохранение правок. Правки уходят по одной и последовательно: у каждой
 * своя версия строки и свой отказ, а параллельный запуск оставил бы итог пачки неизвестным. Успешные
 * не откатываются; упавшие возвращаются с текстом, чтобы экран не рисовал ложного успеха. Исправление
 * выставленного СОЧ идёт командой с причиной, остальное — обычным сохранением.
 */
export function useAssessmentScores(workId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: Boolean(workId), error: null, forbidden: false, sheet: null });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async (silent = false) => {
    if (!token || !workId) return;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await assessmentApi.results(token, workId);
      setState({ loading: false, error: null, forbidden: false, sheet: mapSheet(raw) });
    } catch (e) {
      const forbidden = e?.status === 403 || e?.status === 404;
      setState((s) => ({
        loading: false,
        forbidden,
        sheet: forbidden ? null : s.sheet,
        error: forbidden ? null : e?.message || 'Не удалось загрузить баллы',
      }));
    }
  }, [token, workId]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (changes, reason) => {
    setSaving(true);
    const result = { saved: [], failed: [] };
    try {
      for (const change of changes) {
        try {
          if (change.kind === 'SOCH' && change.before != null) {
            await assessmentApi.correct(token, change.workId, change.studentProfileId, {
              score: change.score, reason: reason ?? '', expectedVersion: change.version ?? undefined,
            });
          } else {
            await assessmentApi.saveResult(token, change.workId, change.studentProfileId, {
              score: change.score, expectedVersion: change.version ?? undefined,
            });
          }
          result.saved.push(change.studentProfileId);
        } catch (e) {
          result.failed.push({ studentProfileId: change.studentProfileId, message: e?.message || 'Не удалось сохранить балл' });
        }
      }
    } finally {
      setSaving(false);
    }
    await reload(true);
    return result;
  }, [token, reload]);

  return { ...state, saving, reload, save };
}
