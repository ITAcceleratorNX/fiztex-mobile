import { request } from './client';

function query(params) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Оценки урока (GRADES-001, GRADES-002).
 *
 * Экран берёт **лист** (`lessonSheet`), а не плоский список оценок: в листе есть состав
 * класса, автор каждой оценки и посчитанный ответ «можно ли писать прямо сейчас»
 * (`canManageGrades`, `writeState`, `canEdit`). Правила окна замещающего живут на
 * сервере — воспроизводить их в приложении нельзя: три реализации одного правила
 * (веб, мобилка, бэк) разъедутся, и первым это заметит учитель с неактивной кнопкой.
 *
 * Значение оценки — всегда `scaleCode` («4+»), а не число. Шкала приходит справочником.
 */
export const gradesApi = {
  scale: (token) => request('/api/grades/scale', { token }),

  lessonSheet: (token, lessonId) => request(`/api/lessons/${lessonId}/grades/sheet`, { token }),

  create: (token, { studentProfileId, lessonId, scaleCode, gradeType }) =>
    request('/api/grades', {
      token,
      method: 'POST',
      body: {
        studentProfileId,
        sourceType: 'LESSON',
        sourceId: lessonId,
        scaleCode,
        gradeType: gradeType ?? null,
      },
    }),

  /**
   * Правка описывает **полное** состояние обоих полей: не переданный `gradeType`
   * означает «типа нет», а не «оставить прежний» (grades-read-contract §6).
   */
  update: (token, gradeId, { scaleCode, gradeType }) =>
    request(`/api/grades/${gradeId}`, {
      token,
      method: 'PATCH',
      body: { scaleCode, gradeType: gradeType ?? null },
    }),

  /** Мягкое удаление: ответ — состояние оценки после снятия, повтор идемпотентен. */
  remove: (token, gradeId) => request(`/api/grades/${gradeId}`, { token, method: 'DELETE' }),

  /**
   * Раздел «Оценки» ученика: предметы за период, их оценки и средние одним ответом.
   *
   * Период необязателен — без него сервер берёт идущий сейчас. Считать текущую четверть
   * на телефоне нельзя: список периодов ученику не отдают, а по датам на границе четверти
   * в чужом часовом поясе ошибиться на день проще простого.
   *
   * `childStudentProfileId` обязателен родителю и бесполезен ученику: область считается
   * по аккаунту — тот же приём, что во всех «моих» эндпоинтах.
   */
  mySubjects: (token, { academicPeriodId, childStudentProfileId } = {}) =>
    request(`/api/grades/my/subjects${query({ academicPeriodId, childStudentProfileId })}`, { token }),
};

/**
 * Журнал класса и его шапка (GRADEBOOK-001).
 *
 * Модуль только читает: оценки создаются на уроке, итоги — своими командами. Средние
 * приходят посчитанными и на клиенте не пересчитываются — иначе журнал учителя разошёлся
 * бы с дневником ученика на копейку, а с рекомендацией итоговой — на балл.
 */
export const gradebookApi = {
  /** Год, периоды и доступные пары «класс + предмет» — из чего собрать фильтры. */
  context: (token) => request('/api/gradebook/context', { token }),

  /**
   * Недельный дневник: оценки ученика по датам — чипы на карточках расписания.
   *
   * Отдельный запрос, а не поле расписания: у них разный жизненный цикл и разная область
   * видимости, и ошибка здесь не должна ломать расписание. Тот же приём, что у отметок
   * посещаемости (`attendanceApi.myMarks`).
   */
  myDiary: (token, { dateFrom, dateTo, childStudentProfileId } = {}) =>
    request(`/api/gradebook/my/diary${query({ dateFrom, dateTo, childStudentProfileId })}`, { token }),

  /**
   * Оценки одного ученика по предмету за период — экран предмета.
   *
   * Ученику про себя положено (gradebook-read-contract §6), поэтому свой
   * `studentProfileId` он берёт из профиля и подставляет сюда.
   */
  studentSubject: (token, studentProfileId, { subjectId, academicPeriodId }) =>
    request(
      `/api/gradebook/students/${studentProfileId}${query({ subjectId, academicPeriodId })}`,
      { token },
    ),

  journal: (token, { classId, subjectId, academicPeriodId, subgroupId, dateFrom, dateTo }) =>
    request(
      `/api/gradebook/journal${query({
        classId,
        subjectId,
        academicPeriodId,
        subgroupId,
        dateFrom,
        dateTo,
      })}`,
      { token },
    ),
};

/**
 * Итоговые оценки за четверть (GRADEBOOK-002).
 *
 * Итог всегда создаётся черновиком; публикация — отдельное явное действие. Значение —
 * целое 2…5 без знаков: у итоговой их нет в принципе (контракт §3).
 */
export const finalGradesApi = {
  /**
   * Свои итоговые: таблица «предмет × период» плюс годовая.
   *
   * Черновиков здесь нет ни в каком виде — выборка их не возвращает (контракт §7).
   * Поэтому экран ученика не фильтрует статусы: всё, что пришло, показывать можно.
   */
  my: (token, { academicYearId, childStudentProfileId } = {}) =>
    request(`/api/final-grades/my${query({ academicYearId, childStudentProfileId })}`, { token }),

  ofClass: (token, { classId, subjectId, academicPeriodId, subgroupId }) =>
    request(
      `/api/final-grades/class${query({ classId, subjectId, academicPeriodId, subgroupId })}`,
      { token },
    ),

  create: (token, { studentProfileId, subjectId, academicPeriodId, value }) =>
    request('/api/final-grades', {
      token,
      method: 'POST',
      body: { scope: 'PERIOD', studentProfileId, subjectId, academicPeriodId, value },
    }),

  changeValue: (token, finalGradeId, value) =>
    request(`/api/final-grades/${finalGradeId}`, { token, method: 'PATCH', body: { value } }),

  /**
   * Публикация всего набора: класс (или подгруппа) + предмет + период.
   *
   * Неполный набор сервер отклоняет целиком (409 `FINAL_GRADE_SET_INCOMPLETE`, в
   * `details.studentProfileIds` — кого не хватает): частично опубликованной четверти
   * не бывает.
   */
  publishClass: (token, { classId, subjectId, academicPeriodId, subgroupId }) =>
    request('/api/final-grades/class/publication', {
      token,
      method: 'POST',
      body: { classId, subjectId, academicPeriodId, subgroupId: subgroupId ?? null },
    }),
};
