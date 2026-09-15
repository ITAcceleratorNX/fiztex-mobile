import { request } from './client';

/**
 * Психологические тесты ученика (PSYCHOLOGIST-002, `fiztex-back/docs/psych-test-contract.md`).
 *
 * <p>Тот же приём, что у опросов: обычный токен ученика, серверный черновик ответов и
 * идемпотентная отправка. Тело `PUT /answers` и `savedAnswers` у психотеста и опроса
 * совпадают поле в поле, поэтому экран прохождения переиспользует `surveyTestModel`.
 *
 * <p>Результата ученик не получает ни в каком виде: тест не оценивается, а ответы видит
 * только школьный психолог.
 */
export const psychTestsApi = {
  /** Назначенные ученику тесты — и открытые, и уже пройденные. */
  list(token) {
    return request('/api/psych-tests/my', { token });
  },

  /** Вопросы вместе с сохранёнными черновиками (`savedAnswers`) — прогресс восстанавливается с сервера. */
  taking(token, assignmentId) {
    return request(`/api/psych-tests/${assignmentId}`, { token });
  },

  /** Автосохранение одного ответа — upsert на сервере. */
  saveAnswer(token, assignmentId, answer) {
    return request(`/api/psych-tests/${assignmentId}/answers`, {
      method: 'PUT',
      body: answer,
      token,
    });
  },

  /** Отправка. Повтор с тем же токеном после обрыва сети возвращает уже принятое, а не ошибку. */
  submit(token, assignmentId, idempotencyToken) {
    return request(`/api/psych-tests/${assignmentId}/submit`, {
      method: 'POST',
      body: idempotencyToken ? { idempotencyToken } : undefined,
      token,
    });
  },
};
