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

  // ── Учитель: «Отметить исправление» на листе оценок урока (те же адреса, что в вебе) ──

  /** Исправления урока; закрытые нужны, чтобы у завершённого показать значок. */
  byLesson: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/grade-corrections?includeClosed=true`, { token }),

  /** Дата для «До следующего урока» — урок выбирает сервер по расписанию. */
  nextLesson: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/grade-corrections/next-lesson`, { token }),

  create: (token, lessonId, { studentProfileId, comment, deadline, temporaryGrade }) =>
    request(`/api/lessons/${lessonId}/grade-corrections`, {
      method: 'POST', body: { studentProfileId, comment, deadline, temporaryGrade: temporaryGrade ?? undefined }, token,
    }),

  /** Незаданное поле не меняется; снять временную оценку — `removeTemporaryGrade`. */
  update: (token, correctionId, body) =>
    request(`/api/grade-corrections/${correctionId}`, { method: 'PATCH', body, token }),

  /** Итоговая оценка закрывает исправление и становится обычной оценкой урока. */
  complete: (token, correctionId, value) =>
    request(`/api/grade-corrections/${correctionId}/complete`, { method: 'POST', body: value, token }),
};
