import { request } from './client';

/** Больше сотни за страницу сервер не отдаёт (`MyClassRosterService.MAX_PAGE_SIZE`). */
const ROSTER_PAGE_SIZE = 100;

/** «Мой класс» классного руководителя: какие классы его и кто в них учится. */
export const myClassApi = {
  /** `MyClassContextView`: вне учебного года и без руководства `classes` пуст. */
  context: (token) => request('/api/my-class/context', { token }),

  /** Одна страница состава класса — `MyClassRosterView`. */
  roster: (token, classId, { page = 0, size = ROSTER_PAGE_SIZE } = {}) =>
    request(`/api/my-class/classes/${classId}/students?page=${page}&size=${size}`, { token }),

  /** Весь состав: класс помещается в одну страницу, но обрезать список молча нельзя. */
  rosterAll: async (token, classId) => {
    const items = [];
    for (let page = 0; ; page += 1) {
      const view = await myClassApi.roster(token, classId, { page });
      const chunk = view?.items || [];
      items.push(...chunk);
      if (!view?.hasMore || chunk.length === 0) {
        return { items, totalItems: view?.totalItems ?? items.length };
      }
    }
  },
};
