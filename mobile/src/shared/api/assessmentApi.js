import { request } from './client';

/**
 * Работы СОР/СОЧ: назначение, проведение, перенос и отмена (учитель). Баллы на телефоне не вносятся —
 * это журнал на компьютере (ТЗ Frontend, Mobile). Права, лимиты и статусы решает бэкенд
 * (`fiztex-back/docs/assessment-work-contract.md`); клиент передаёт `expectedVersion`, чтобы не затереть
 * чужую правку.
 */
function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const assessmentApi = {
  create: (token, lessonId, { kind, maxScore, reminderDaysBefore }) =>
    request(`/api/lessons/${lessonId}/assessment-works`, {
      method: 'POST', body: { kind, maxScore, reminderDaysBefore }, token,
    }),

  /** Сколько работ ещё можно назначить в охвате — подсказка до попытки. */
  limits: (token, { classId, subjectId, academicPeriodId, subgroupId }) =>
    request(`/api/assessment-works/limits${query({ classId, subjectId, academicPeriodId, subgroupId })}`, { token }),

  update: (token, workId, { maxScore, reminderDaysBefore, expectedVersion }) =>
    request(`/api/assessment-works/${workId}`, {
      method: 'PATCH', body: { maxScore, reminderDaysBefore, expectedVersion }, token,
    }),

  conduct: (token, workId) =>
    request(`/api/assessment-works/${workId}/conduct`, { method: 'POST', body: {}, token }),

  cancel: (token, workId, { reason, expectedVersion } = {}) =>
    request(`/api/assessment-works/${workId}/cancel`, {
      method: 'POST', body: { reason, expectedVersion }, token,
    }),

  reschedule: (token, workId, { lessonId, expectedVersion }) =>
    request(`/api/assessment-works/${workId}/reschedule`, {
      method: 'POST', body: { lessonId, expectedVersion }, token,
    }),

  /** Лист результатов: весь состав урока, баллы, версии и права (`canManage`, `canCorrect`). */
  results: (token, workId) => request(`/api/assessment-works/${workId}/results`, { token }),

  /** Первичный балл (и правка СОР): 0…максимум; нет строки — не выставлен. */
  saveResult: (token, workId, studentProfileId, { score, expectedVersion }) =>
    request(`/api/assessment-works/${workId}/results/${studentProfileId}`, {
      method: 'PUT', body: { score, expectedVersion }, token,
    }),

  /** Исправление выставленного СОЧ: новый балл и обязательная причина; учитель и администратор. */
  correct: (token, workId, studentProfileId, { score, reason, expectedVersion }) =>
    request(`/api/assessment-works/${workId}/results/${studentProfileId}/correction`, {
      method: 'POST', body: { score, reason, expectedVersion }, token,
    }),

  /** Уроки класса в окне дат — из них отбираются варианты для переноса (сервер проверит сам). */
  candidates: (token, { classId, dateFrom, dateTo }) =>
    request(`/api/lessons${query({ classId, dateFrom, dateTo, size: 200 })}`, { token }),
};
