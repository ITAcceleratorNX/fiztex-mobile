import { API_BASE_URL } from './config';
import { request, requestMultipart } from './client';
import { asUpload } from './upload';

/**
 * Сервисные заявки — сценарий автора (ТЗ SERVICE-FE-002, бэкенд SERVICE-BE-002…006).
 *
 * Здесь только то, что делает автор: завести заявку, посмотреть свои, отменить новую и
 * вернуть выполненную. Исполнительских путей (`/queue`, `/claim`, `/complete`,
 * `/transfer`, `/return-to-queue`) в этом объекте нет вовсе — не «на будущее закомментированы»,
 * а отсутствуют: SERVICE-FE-003 добавит их вместе со своими экранами, и держать их
 * доступными раньше значило бы позволить экрану автора вызвать чужое действие.
 *
 * `PUT`/`PATCH`/`DELETE` в модуле нет и на бэкенде: содержание заявки после создания
 * неизменяемо, а «удаление» — это отмена, оставляющая запись в базе.
 */

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const serviceRequestsApi = {
  /**
   * Свои заявки (BE-002 §5.2).
   *
   * `status` необязателен, и разделы экрана его не используют: страница — это срез, и
   * отбирая её на клиенте, мы показали бы «ничего нет» там, где подходящие заявки лежат
   * на следующей странице. Бэкенд отдаёт новые сверху.
   *
   * @param {{status?: 'NEW'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED', page?: number, size?: number}} params
   */
  my(token, params = {}) {
    return request(`/api/service-requests/my${query(params)}`, { token });
  },

  one(token, id) {
    return request(`/api/service-requests/${id}`, { token });
  },

  /** Лента событий (BE-005 §5). Read-only хронология — поля ввода у неё нет (ТЗ §13). */
  history(token, id) {
    return request(`/api/service-requests/${id}/history`, { token });
  },

  /**
   * Создание заявки (BE-002 §5.1, BE-005 §3).
   *
   * Один метод на оба варианта одного эндпоинта: без фотографий уходит JSON, с
   * фотографиями — multipart. Различается кодировка запроса, а не операция, и заставлять
   * экран выбирать между ними значило бы вынести деталь транспорта в форму.
   *
   * Ни автора, ни статуса, ни номера здесь нет: их ставит бэкенд, и передать их некуда.
   *
   * @param {{serviceType: 'CLEANING'|'TECHNICIAN', emergency?: boolean, buildingText: string,
   *          floorText: string, locationText: string, description: string, photos?: Array}} payload
   */
  create(token, { photos = [], ...fields } = {}) {
    if (photos.length === 0) {
      return request('/api/service-requests', { method: 'POST', token, body: fields });
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    for (const photo of photos) form.append('photos', asUpload(photo));
    return requestMultipart('/api/service-requests', form, { token });
  },

  /**
   * Отмена новой заявки (BE-002 §5.4) — то, что на экране называется «Удалить заявку».
   *
   * `POST`, а не `DELETE`: физического удаления нет, запись остаётся со статусом
   * `CANCELLED` и уходит в «Историю».
   */
  cancel(token, id) {
    return request(`/api/service-requests/${id}/cancel`, { method: 'POST', token });
  },

  /**
   * Возврат выполненной заявки в работу (BE-006). Причина обязательна, исполнителя автор
   * не выбирает — в запросе такого поля нет, дальнейшее назначение решает бэкенд.
   */
  reopen(token, id, comment) {
    return request(`/api/service-requests/${id}/reopen`, {
      method: 'POST',
      token,
      body: { comment },
    });
  },
};

/**
 * Адрес снимка. Отдаётся строкой, а не загружается: картинку показывает `<Image>`, и он
 * ходит за ней сам — с заголовком авторизации, см. `authHeaders` в `upload.js`.
 */
export const serviceRequestFiles = {
  photo: (requestId, photoId) =>
    `${API_BASE_URL}/api/service-requests/${requestId}/photos/${photoId}/content`,
};
