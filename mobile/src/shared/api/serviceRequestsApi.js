import { API_BASE_URL } from './config';
import { request, requestMultipart } from './client';
import { asUpload } from './upload';

/**
 * Сервисные заявки — сценарий автора (ТЗ SERVICE-FE-002, бэкенд SERVICE-BE-002…006).
 *
 * Авторские пути (SERVICE-FE-002) и исполнительские (SERVICE-FE-003) лежат вместе, но
 * порознь: разделять их на два объекта незачем — заявка одна, и сотрудник службы бывает
 * и автором, и исполнителем одной и той же. Что кому позволено, решает не набор методов,
 * а бэкенд: чужое действие он отвергнет независимо от того, откуда его позвали.
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
    return requestMultipart('/api/service-requests', toForm(fields, photos), { token });
  },

  /**
   * Общая очередь своей службы (BE-003 §10.1, ТЗ SERVICE-FE-003 §3).
   *
   * Без параметра службы: её выводит бэкенд из роли, и передать чужую нельзя — принимать
   * нечего. Порядок (экстренные выше, внутри группы старые раньше) он же и задаёт,
   * поэтому пересортировывать выдачу на клиенте нельзя: вторая сортировка рассыпала бы
   * постраничную ленту.
   */
  queue(token, params = {}) {
    return request(`/api/service-requests/queue${query(params)}`, { token });
  },

  /**
   * Назначенные мне заявки (BE-003 §10.4).
   *
   * Фильтра по статусу у эндпоинта нет, поэтому раздел собирается разбором выдачи —
   * единственный случай в модуле, где так приходится делать. Отсюда и увеличенный
   * размер страницы: при разборе среза важно, чтобы срез покрывал всё, что есть.
   */
  assignedToMe(token, params = {}) {
    return request(`/api/service-requests/assigned/my${query(params)}`, { token });
  },

  /**
   * Взять заявку в работу (BE-003 §10.3, §4).
   *
   * Тела у запроса нет: единственное, что нужно знать бэкенду, — кто нажал, и это он
   * берёт из токена. Проигравший гонку получает 409 «уже взята», а не 403.
   */
  claim(token, id) {
    return request(`/api/service-requests/${id}/claim`, { method: 'POST', token });
  },

  /**
   * «Создать и взять в работу» (§8) — одним запросом.
   *
   * Отдельный путь, а не флаг у обычного создания: у операций разный круг допущенных и
   * разный результат (`NEW` против `IN_PROGRESS`).
   */
  createAndClaim(token, { photos = [], ...fields } = {}) {
    if (photos.length === 0) {
      return request('/api/service-requests/claimed', { method: 'POST', token, body: fields });
    }
    return requestMultipart('/api/service-requests/claimed', toForm(fields, photos), { token });
  },

  /**
   * Вернуть заявку в очередь своей службы (BE-004 §5, ТЗ §6). Причина обязательна,
   * фотографий здесь нет и не принимается (§12).
   */
  returnToQueue(token, id, comment) {
    return request(`/api/service-requests/${id}/return-to-queue`, {
      method: 'POST',
      token,
      body: { comment },
    });
  },

  /** Передать заявку другой службе (BE-004 §6, ТЗ §6). Причина обязательна, фото нет. */
  transfer(token, id, targetServiceType, comment) {
    return request(`/api/service-requests/${id}/transfer`, {
      method: 'POST',
      token,
      body: { targetServiceType, comment },
    });
  },

  /**
   * Выполнить заявку (BE-004 §7, ТЗ §7): текст результата и/или до трёх снимков.
   *
   * Пустым не бывает — что именно требуется, проверяет бэкенд; экран лишь не даёт
   * отправить заведомо пустую форму.
   */
  complete(token, id, { comment, photos = [] } = {}) {
    if (photos.length === 0) {
      return request(`/api/service-requests/${id}/complete`, {
        method: 'POST',
        token,
        body: { comment },
      });
    }
    const form = new FormData();
    if (comment) form.append('comment', comment);
    for (const photo of photos) form.append('photos', asUpload(photo));
    return requestMultipart(`/api/service-requests/${id}/complete`, form, { token });
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
/**
 * Поля и снимки одной формой. В multipart каждое значение — отдельная часть, и собрать
 * их обратно в объект может только сервер; отсюда и `String(value)` у флага срочности.
 */
function toForm(fields, photos) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) form.append(key, String(value));
  }
  for (const photo of photos) form.append('photos', asUpload(photo));
  return form;
}

export const serviceRequestFiles = {
  photo: (requestId, photoId) =>
    `${API_BASE_URL}/api/service-requests/${requestId}/photos/${photoId}/content`,
};
