import { request } from './client';

/**
 * Посещаемость ученика и родителя (AttendanceController, AttendanceSummaryController).
 *
 * Область считается по аккаунту, а не по параметрам: подставить чужой `childId`
 * ученику ничего не даёт, а родитель без него получает 403 — у каждого ребёнка свой
 * контекст, и доступы детей не объединяются
 * (`fiztex-back/docs/attendance-read-contract.md` §7).
 *
 * Ученик и родитель видят только **опубликованное**: пока учитель не нажал
 * «Опубликовать», отметки нет — это не ошибка загрузки, а нормальное состояние.
 */
function childQuery(childId) {
  return childId ? `&childId=${encodeURIComponent(childId)}` : '';
}

export const attendanceApi = {
  /**
   * Свои отметки за диапазон дат — бейджи на карточках расписания.
   *
   * Расписание листается неделями, поэтому запрос диапазонный, а не месячный:
   * неделя на стыке месяцев иначе стоила бы двух запросов и склейки. В ответ
   * приходят только уроки с опубликованной отметкой.
   */
  myMarks: (token, { dateFrom, dateTo, childId } = {}) =>
    request(
      `/api/attendance/my-marks?dateFrom=${encodeURIComponent(dateFrom)}`
        + `&dateTo=${encodeURIComponent(dateTo)}${childQuery(childId)}`,
      { token },
    ),

  /** Своя отметка на конкретном уроке — карточка урока ученика и родителя. */
  myLessonMark: (token, lessonId, childId) =>
    request(
      `/api/lessons/${lessonId}/attendance/me${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`,
      { token },
    ),

  /**
   * Лист урока целиком — учитель и админ: состав, обе версии каждой отметки, счётчики
   * и посчитанные бэком `canFill` / `canPublish` / `reminder`.
   *
   * Правила времени и прав приходят готовыми (`attendance-read-contract.md` §4):
   * воспроизводить «урок начался, не отменён, все отмечены» на клиенте не нужно и
   * не следует — три реализации одного правила разъедутся.
   */
  /**
   * Месяц ученика: все уроки (с `lessonStatus`, `published` и опубликованной отметкой),
   * счётчики и границы учебного года — календарь «Посещаемость» и плитка главной.
   *
   * Цифры считает бэкенд — клиент их не выводит из списка отметок: тот же расчёт
   * показывают веб и журнал учителя, и разойтись им нельзя. Черновика в ответе нет:
   * неопубликованный урок приходит с `published: false` и без отметки.
   *
   * @param {{month?: string, childId?: number|null}} params `month` — «YYYY-MM»,
   *   по умолчанию текущий; `childId` — сводка ребёнка для родителя.
   */
  summary: (token, { month, childId } = {}) => {
    const search = new URLSearchParams();
    if (month) search.set('month', month);
    if (childId) search.set('childId', String(childId));
    const qs = search.toString();
    return request(`/api/attendance/summary${qs ? `?${qs}` : ''}`, { token });
  },

  sheet: (token, lessonId) => request(`/api/lessons/${lessonId}/attendance`, { token }),

  /**
   * Сохранить черновик. Уходят только изменённые ученики: полный лист на каждое
   * нажатие означал бы, что два учителя за одним уроком затирают правки друг друга.
   *
   * `expectedVersion` — версия, которую видел клиент; `null` значит «я видел, что
   * листа нет». Расхождение — 409 `ATTENDANCE_VERSION_CONFLICT`, чужие правки при
   * этом остаются на месте (§5).
   */
  saveDraft: (token, lessonId, { entries, expectedVersion = null }) =>
    request(`/api/lessons/${lessonId}/attendance/entries`, {
      method: 'PATCH',
      token,
      body: { entries, expectedVersion },
    }),

  /**
   * «Все присутствуют». Первое нажатие идёт без подтверждения; если кнопка затрёт
   * индивидуальные отметки, бэк отвечает 409 `ATTENDANCE_BULK_OVERWRITE_CONFIRM_REQUIRED`
   * и `details.affectedCount` — тогда повтор идёт с `confirmOverwrite: true`.
   * Подтверждение проверяет бэк, а не только UI, поэтому мимо него не пройти.
   */
  markAllPresent: (token, lessonId, { expectedVersion = null, confirmOverwrite = false } = {}) =>
    request(`/api/lessons/${lessonId}/attendance/mark-all-present`, {
      method: 'POST',
      token,
      body: { expectedVersion, confirmOverwrite },
    }),

  /**
   * Опубликовать — сделать отметки видимыми ученику и родителю. Частичной публикации
   * не бывает: неполный лист — 409 `ATTENDANCE_INCOMPLETE` со списком
   * `details.unmarkedStudentProfileIds`, чтобы клиенту было что подсветить.
   */
  publish: (token, lessonId, { expectedVersion = null } = {}) =>
    request(`/api/lessons/${lessonId}/attendance/publish`, {
      method: 'POST',
      token,
      body: { expectedVersion },
    }),

  /** История изменений листа: что было, что стало, кто и когда. Свежее сверху. */
  history: (token, lessonId, { page = 0, size = 20 } = {}) =>
    request(`/api/lessons/${lessonId}/attendance/history?page=${page}&size=${size}`, { token }),

  /**
   * Журнал учителя за месяц: уроки с опубликованными отметками и итоги по всему составу
   * (ATTENDANCE-TEACHER-001). Отменённые уроки приходят со `status: CANCELLED` и без
   * отметок — календарю ученика нужно отличать отмену от дня без урока.
   *
   * @param {{month: string, classId: number, subgroupId?: number|null}} query
   *   `month` — «YYYY-MM»; без `subgroupId` — все уроки класса.
   */
  teacherJournal: (token, { month, classId, subgroupId } = {}) => {
    const search = new URLSearchParams({ month, classId: String(classId) });
    if (subgroupId != null) search.set('subgroupId', String(subgroupId));
    return request(`/api/attendance/teacher-journal?${search}`, { token });
  },

  /**
   * Чем заполнить фильтры журнала: учебный год (из него — месяцы) и пары «класс +
   * подгруппа» учителя. Считаются тем же правилом видимости, что и журнал.
   */
  teacherJournalOptions: (token) => request('/api/attendance/teacher-journal/options', { token }),

};
