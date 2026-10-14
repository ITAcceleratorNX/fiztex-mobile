import { request } from './client';

function query(params) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Динамика оценок ребёнка (GRADE-DYNAMICS, контракт `fiztex-back/docs/grade-dynamics-contract.md`).
 *
 * `childStudentProfileId` обязателен родителю: область считается сервером по аккаунту, и
 * чужого ребёнка подставить нечем. Средний, изменение, статус и точки графика приходят
 * готовыми — приложение их только показывает.
 */
export const gradeDynamicsApi = {
  overview: (token, { childId, period }) =>
    request(`/api/grades/my/dynamics${query({ period, childStudentProfileId: childId })}`, { token }),

  subject: (token, { childId, subjectId, period }) =>
    request(`/api/grades/my/dynamics/subjects/${subjectId}${query({ period, childStudentProfileId: childId })}`, { token }),
};
