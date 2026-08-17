import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { lessonApi } from '@shared/api/lessonApi';
import { mapLessonCard } from '@shared/api/lessonMap';

/**
 * Карточка урока плюс счётчик истории.
 *
 * Ошибки разделены на две: 404 — «нет доступа» (бэк намеренно отвечает 404, а не 403,
 * чтобы по чужому id нельзя было подтвердить существование урока), всё остальное —
 * сбой загрузки с кнопкой «Повторить». Экран показывает для них разные состояния,
 * поэтому решение принимается здесь, а не в вёрстке.
 *
 * @param {number|null} lessonId  id LessonInstance
 * @param {{ childId?: number|null, highlight?: 'next'|null, history?: boolean }} options
 *   `history: false` — карточка нужна только как шапка (экран посещаемости), и счётчик
 *   истории урока там не показывается: запрос за числом, которое некуда вывести, —
 *   лишний круг к серверу на каждом открытии.
 */
export function useLesson(lessonId, { childId = null, highlight = null, history = true } = {}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(Boolean(lessonId));
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [historyCount, setHistoryCount] = useState(null);

  const reload = useCallback(async (silent = false) => {
    if (!token || !lessonId) {
      setLesson(null);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const raw = await lessonApi.card(token, lessonId, childId);
      setLesson(mapLessonCard(raw, { highlight }));

      // Счётчик истории — отдельный и некритичный запрос: карточка не должна
      // падать целиком из-за него, поэтому его ошибка гасится.
      if (history) {
        try {
          const page = await lessonApi.history(token, lessonId, { size: 1, childId });
          setHistoryCount(typeof page?.totalElements === 'number' ? page.totalElements : null);
        } catch {
          setHistoryCount(null);
        }
      }
    } catch (e) {
      // 404 — «нет доступа»: урок либо исчез, либо был чужим. Показывать старую
      // карточку в этом случае нельзя, она уже неправда.
      if (e?.status === 404) {
        setForbidden(true);
        setLesson(null);
        return;
      }
      setError(e?.message || 'Не удалось загрузить урок');
      // А вот сбой сети при pull-to-refresh карточку не стирает: пользователь
      // смотрел на рабочий экран и потянул его обновить — превращать это в
      // «Не удалось загрузить урок» значит наказывать за жест. Экран ошибки
      // остаётся только для первой загрузки, когда показывать ещё нечего.
      if (!silent) {
        setLesson(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token, lessonId, childId, highlight, history]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, forbidden, lesson, historyCount, reload };
}

/**
 * Отметка ученика «домашнее задание сделано».
 *
 * Состояние не правится локально: отметку видит и родитель, и учитель (счётчиком), так что
 * источник правды — ответ бэка, а карточка перечитывается тихо, без скелета поверх экрана.
 */
export function useLessonHomework(lessonId, reload) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggle = useCallback(async (done) => {
    if (!token || !lessonId) return false;
    setSaving(true);
    setError(null);
    try {
      if (done) {
        await lessonApi.completeHomework(token, lessonId);
      } else {
        await lessonApi.uncompleteHomework(token, lessonId);
      }
      await reload?.(true);
      return true;
    } catch (e) {
      setError(e?.message || 'Не удалось сохранить отметку');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, lessonId, reload]);

  return {
    saving,
    error,
    clearError: () => setError(null),
    markDone: () => toggle(true),
    undoDone: () => toggle(false),
  };
}

/**
 * Изменения учебной части (тема и комментарий).
 *
 * Каждое действие возвращает обновлённую карточку через `reload`, а не правит
 * состояние локально: тема и комментарий пишутся в журнал урока, и счётчик истории
 * обязан сойтись с тем, что реально записал бэк.
 */
export function useLessonEditing(lessonId, reload) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const run = useCallback(async (action) => {
    if (!token || !lessonId) return false;
    setSaving(true);
    setSaveError(null);
    try {
      await action();
      await reload?.(true);
      return true;
    } catch (e) {
      setSaveError(e?.message || 'Не удалось сохранить');
      return false;
    } finally {
      setSaving(false);
    }
  }, [token, lessonId, reload]);

  return {
    saving,
    saveError,
    clearSaveError: () => setSaveError(null),
    saveTopic: (topic) => run(() => lessonApi.updateTopic(token, lessonId, topic)),
    clearTopic: () => run(() => lessonApi.clearTopic(token, lessonId)),
    saveComment: (body) => run(() => lessonApi.upsertComment(token, lessonId, body)),
    deleteComment: () => run(() => lessonApi.deleteComment(token, lessonId)),
  };
}
