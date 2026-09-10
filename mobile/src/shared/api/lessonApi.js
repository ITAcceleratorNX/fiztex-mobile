import { request } from './client';
import { API_BASE_URL } from './config';

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

  /**
   * Урок, к которому ведёт кнопка «Текущий урок»: идущий сейчас, а если такого нет —
   * ближайший будущий.
   *
   * Выбирает урок бэк, а не приложение: правило «идёт / следующий сегодня / первый урок
   * ближайшего учебного дня» опирается на школьный календарь, подгруппы, замены и
   * горизонт генерации — всего этого у клиента нет, а расписание на неделю ответа не
   * даёт (за понедельником может не быть занятий вовсе).
   *
   * Пустой ответ приходит не пустотой, а причиной в `status`: «расписания ещё нет» и
   * «уроков больше нет» — разные новости для родителя.
   */
  current: (token, childId) => request(`/api/lessons/current${childQuery(childId)}`, { token }),

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

  /**
   * Материалы урока. Список приходит **уже отфильтрованным по роли**: ученику и
   * родителю бэк не отдаёт скрытые материалы вовсе (`LessonMaterialService`). Отбирать
   * их ещё раз здесь нельзя — это было бы второе место, где живёт правило видимости.
   */
  materials: (token, lessonId) => request(`/api/lessons/${lessonId}/materials`, { token }),

  /** Тема — поле урока, поэтому ответом приходит карточка целиком. */
  updateTopic: (token, lessonId, topic) =>
    request(`/api/lessons/${lessonId}/topic`, { method: 'PUT', body: { topic }, token }),

  clearTopic: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/topic`, { method: 'DELETE', token }),

  /**
   * Отметка «ДЗ не задано» — второе финальное действие учителя по уроку наравне с
   * выдачей задания.
   *
   * Ставится только руками: ни конец урока, ни конец дня её не проставляют — отсутствие
   * задания не считается решением, пока учитель его не принял.
   *
   * Ответ — карточка целиком: `homeworkState` считается по всем заданиям урока, и
   * собрать его из ответа на одно действие нельзя.
   */
  markHomeworkNotAssigned: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/homework/not-assigned`, { method: 'POST', token }),

  clearHomeworkNotAssigned: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/homework/not-assigned`, { method: 'DELETE', token }),
};

/**
 * Адрес содержимого материала — строкой, а не загрузкой: показывает его `Image` или
 * `WebView`, и оба ходят сами, вместе с заголовком авторизации.
 *
 * Через `Linking.openURL` этот адрес открывать нельзя: эндпоинт без заголовка
 * `Authorization` отвечает `401`, а системный браузер заголовка не пошлёт — учитель
 * увидел бы страницу ошибки вместо конспекта.
 */
export const lessonFiles = {
  material: (lessonId, materialId) =>
    `${API_BASE_URL}/api/lessons/${lessonId}/materials/${materialId}/content`,
};
