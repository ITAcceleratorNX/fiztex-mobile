import { request } from './client';

function query(params) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Исправление работы — то, что видят ученик и родитель (контракт
 * `fiztex-back/docs/grade-correction-contract.md` §3).
 *
 * Сервер отдаёт только **открытые** исправления своего ученика: после итоговой оценки она
 * приходит обычными оценками, после отмены исправление просто пропадает. Статус и признак
 * истёкшего срока (`overdue`) посчитаны сервером по полуночи школы, а не телефона.
 *
 * `childStudentProfileId` обязателен родителю и бесполезен ученику — область считается по
 * аккаунту. `lessonId` сужает выдачу до одного урока (карточка урока).
 */
export const gradeCorrectionsApi = {
  my: (token, { childStudentProfileId, lessonId } = {}) =>
    request(`/api/grade-corrections/my${query({ childStudentProfileId, lessonId })}`, { token }),
};
