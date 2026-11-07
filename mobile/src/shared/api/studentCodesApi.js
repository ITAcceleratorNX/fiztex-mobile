import { request } from './client';

/**
 * Персональный код ученика у родителя и классного руководителя (AUTH-BE-001 §10, контракт
 * `fiztex-back/docs/access-request-contract.md`).
 *
 * «Посмотреть код» здесь нет и не будет: в базе лежит BCrypt-хэш, а выданное значение
 * приходит один раз — в ответе на выпуск (`IssuedCodeResponse.issuedCode`). Списки отвечают на
 * вопросы, которые его заменяют: выпускали ли код, придумал ли ученик PIN, можно ли выпустить.
 */
export const studentCodesApi = {
  /** Свои дети родителя — `ChildAccessView[]`, только подтверждённые школой связи. */
  children: (token) => request('/api/me/children/access', { token }),

  /** Выпуск родителем. Поверх действующего кода без `confirm` — 409 `STUDENT_CODE_REISSUE_CONFIRM`. */
  issueForChild: (token, studentProfileId, confirm = false) =>
    request(`/api/me/children/${studentProfileId}/access-code?confirmReissue=${confirm}`,
      { method: 'POST', token }),

  /** Ученики, на которых у учителя действующее разрешение администратора, — `TeacherStudentAccessView[]`. */
  teacherStudents: (token) => request('/api/teacher/students/access-codes', { token }),

  /** Выпуск классным руководителем; без разрешения — 403 `STUDENT_CODE_NOT_PERMITTED`. */
  issueForStudent: (token, studentProfileId, confirm = false) =>
    request(`/api/teacher/students/${studentProfileId}/access-code?confirmReissue=${confirm}`,
      { method: 'POST', token }),
};
