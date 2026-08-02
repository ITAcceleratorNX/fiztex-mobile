import { request } from './client';

/**
 * Рабочее пространство урока — одно на все роли (LessonController).
 *
 * Область видимости определяет бэк по роли аккаунта, а не адрес эндпоинта: учитель,
 * ученик, родитель и админ ходят в одни и те же пути и получают карточку со своим
 * набором `capabilities`. Родитель дополнительно передаёт `childId` — у каждого
 * ребёнка свой контекст.
 *
 * Урок, к которому у пользователя нет связи, отдаёт 404 (а не 403): знание
 * идентификатора доступа не даёт. Экран трактует 404 как «нет доступа».
 */
function childQuery(childId) {
  return childId ? `?childId=${encodeURIComponent(childId)}` : '';
}

export const lessonApi = {
  /** Карточка урока. `lessonId` — id LessonInstance (не слота расписания). */
  card: (token, lessonId, childId) =>
    request(`/api/lessons/${lessonId}${childQuery(childId)}`, { token }),

  /** Состав учеников урока (нужна capability VIEW_STUDENTS). */
  students: (token, lessonId, childId) =>
    request(`/api/lessons/${lessonId}/students${childQuery(childId)}`, { token }),

  /**
   * История изменений. Возвращает Page — экрану нужен только `totalElements`
   * для счётчика, поэтому по умолчанию тянем одну запись.
   */
  history: (token, lessonId, { page = 0, size = 20, childId } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (childId) params.set('childId', String(childId));
    return request(`/api/lessons/${lessonId}/history?${params}`, { token });
  },

  /** Комментарий на урок один — создание и правка это один вызов. */
  upsertComment: (token, lessonId, body) =>
    request(`/api/lessons/${lessonId}/comment`, { method: 'PUT', body: { body }, token }),

  deleteComment: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/comment`, { method: 'DELETE', token }),

  /**
   * Отметка ученика «сделал». Оба вызова идемпотентны и возвращают задание целиком,
   * поэтому экран берёт новое состояние прямо из ответа, не перезапрашивая карточку.
   */
  completeHomework: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/homework/completion`, { method: 'POST', token }),

  uncompleteHomework: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/homework/completion`, { method: 'DELETE', token }),

  /** Тема — поле урока, поэтому ответом приходит карточка целиком. */
  updateTopic: (token, lessonId, topic) =>
    request(`/api/lessons/${lessonId}/topic`, { method: 'PUT', body: { topic }, token }),

  clearTopic: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/topic`, { method: 'DELETE', token }),
};
