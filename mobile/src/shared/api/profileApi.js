import { request } from './client';

/**
 * Свой профиль — экран «Я».
 *
 * Адрес без идентификатора: чужой профиль отсюда не открыть в принципе. Административные
 * карточки людей живут под `/api/admin/**`, и ученику с родителем туда нельзя — мобилка
 * на 403 оттуда разлогинивает, так что ходить туда за своими же данными нельзя вдвойне.
 */
export const profileApi = {
  /**
   * @returns {Promise<{accountId: number, role: string, fullName: string,
   *   firstName?: string, lastName?: string, middleName?: string,
   *   email?: string, phone?: string,
   *   student?: {studentProfileId: number, className?: string, academicYearName?: string},
   *   teacher?: {teacherProfileId: number, assignments: Array<{subjectId: number,
   *     subjectName: string, classId: number, className: string}>},
   *   children: Array<{studentProfileId: number, fullName: string, className?: string,
   *     relationType?: string}>}>}
   */
  me: (token) => request('/api/me/profile', { token }),
};
