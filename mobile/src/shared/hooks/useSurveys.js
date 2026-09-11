import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@features/auth/AuthContext';
import { surveysApi } from '@shared/api/surveysApi';

/**
 * Ошибка экрана одним словом — тот же приём, что и у `useHomework.js`: 403 не сбой
 * сети, и предлагать «Повторить» на нём бессмысленно.
 */
function errorKind(e) {
  if (e?.status === 403) return 'forbidden';
  if (e?.status === 404) return 'missing';
  return 'load';
}

/**
 * Свои опросы — назначенные и уже пройденные, одной лентой (ТЗ не заводит вкладок или
 * статусного фильтра, в отличие от `useHomeworkList`).
 *
 * У родителя это те же опросы, что вернёт `GET /surveys/my` его собственному токену:
 * `childId` здесь не бывает — эндпоинт уже отдаёт ровно анкету его аккаунта, а не
 * анкету по ребёнку.
 */
export function useMySurveys() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, surveys: [] });

  const load = useCallback(async (silent = false) => {
    if (!token) {
      setState({ loading: false, error: null, surveys: [] });
      return;
    }
    if (!silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const surveys = await surveysApi.list(token);
      setState({ loading: false, error: null, surveys: surveys ?? [] });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), surveys: [] });
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

/**
 * Вопросы опроса и их прохождение — форма хука повторяет `useHomeworkTest`: те же
 * `loading`/`error`/`reload` у вопросов и то же `sending`/`sendError` у отправки, с тем
 * же ключом идемпотентности в ref (переживает ретрай, гасится только после успеха).
 *
 * <p>Разница со своим тестом ДЗ — не в форме, а в том, где живёт черновик. У домашки
 * серверного черновика нет, и `useHomeworkTest`/экран пишут его в `AsyncStorage`. У
 * опроса черновик серверный (`PUT /answers` — автосейв на каждый ответ), поэтому
 * локального состояния ответов здесь нет вовсе: экран держит его сам, восстанавливая из
 * `survey.savedAnswers` при загрузке, а `saveAnswer` — тонкая обёртка над API, вызываемая
 * экраном на каждое изменение (см. `SurveyTakeScreen`).
 *
 * <p>`survey` — весь ответ `GET /{id}/questions` целиком (`title`, `canAnswer`,
 * `responseStatus`, `savedAnswers` и т.д.), а не только массив вопросов: экрану нужны его
 * поля для шапки и для блокировки формы, когда отвечать уже нельзя.
 */
export function useSurveyTest(surveyId) {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, questions: null, survey: null });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const idempotencyToken = useRef(null);

  const load = useCallback(async () => {
    if (!token || !surveyId) {
      setState({ loading: false, error: null, questions: null, survey: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const survey = await surveysApi.myQuestions(token, surveyId);
      setState({ loading: false, error: null, questions: survey?.questions ?? [], survey });
    } catch (e) {
      setState({ loading: false, error: errorKind(e), questions: null, survey: null });
    }
  }, [token, surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Автосейв одного вопроса (апсерт на бэке). Отказ здесь не событие для отвечающего —
   * он в этот момент заполняет опрос дальше, и ронять экран из-за моргнувшей сети
   * незачем: следующее изменение отправится само, а ответ всё равно остаётся в состоянии
   * экрана до финальной отправки.
   */
  const saveAnswer = useCallback((request) => {
    if (!token || !surveyId) return;
    surveysApi.saveAnswer(token, surveyId, request).catch(() => undefined);
  }, [token, surveyId]);

  const submit = useCallback(async () => {
    if (!token || !surveyId || sending) return false;
    if (!idempotencyToken.current) idempotencyToken.current = newIdempotencyToken();

    setSending(true);
    setSendError(null);
    try {
      await surveysApi.submit(token, surveyId, idempotencyToken.current);
      idempotencyToken.current = null;
      return true;
    } catch (e) {
      // 409 «уже отправлено» — это гонка двойного тапа, а не отказ: кнопка блокируется
      // на время запроса, и сюда можно попасть только повтором того же нажатия, который
      // сервер отбросил как дубль поверх уже принятого ответа. Итог для отвечающего тот
      // же, что и у обычного успеха, — показывать ошибку означало бы звать нажать ещё
      // раз то, что уже случилось.
      if (e?.status === 409) {
        idempotencyToken.current = null;
        return true;
      }
      setSendError(e?.message || 'Не удалось отправить ответы');
      return false;
    } finally {
      setSending(false);
    }
  }, [token, surveyId, sending]);

  return {
    ...state,
    reload: load,
    saveAnswer,
    submit,
    sending,
    sendError,
    clearSendError: () => setSendError(null),
  };
}

function newIdempotencyToken() {
  return `survey-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
