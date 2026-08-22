import { API_BASE_URL } from './config';
import { request, requestMultipart } from './client';

/**
 * Домашние задания (ТЗ HOMEWORK-003, 004, 005.1–005.3).
 *
 * Три ленты и три роли, но выдача одна: `scope` — это набор статусов на сервере, а не
 * фильтр по пришедшей странице. Доотбирать её на клиенте нельзя — страница это срез,
 * и отфильтровав её, мы показали бы «ничего нет» там, где подходящие задания лежат на
 * следующей.
 *
 * Права проверяет бэк: чужое задание отдаёт 403/404 и по прямому id, а роль решает,
 * какой из методов вообще ответит.
 */

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const homeworkApi = {
  /**
   * Лента заданий учителя (005.1).
   *
   * `lessonId` — не фильтр ленты, а переключение на другую выдачу: задания урока (привязка
   * либо срок в день урока), и право на неё даёт сам урок, а не профиль учителя.
   *
   * @param {{scope?: 'ACTUAL'|'HISTORY', statuses?: string[], classId?: number,
   *          subgroupId?: number, subjectId?: number, lessonId?: number,
   *          dueFrom?: string, dueTo?: string, pendingReviewOnly?: boolean,
   *          page?: number, size?: number}} params
   */
  list(token, { statuses, ...params } = {}) {
    const search = new URLSearchParams(query(params).slice(1));
    // `statuses` — множество на бэке: Spring разбирает повторы ключа, а не строку через запятую.
    for (const status of statuses ?? []) search.append('statuses', status);
    const qs = search.toString();
    return request(`/api/homework${qs ? `?${qs}` : ''}`, { token });
  },

  /** Свои задания (005.2). `scope` опущен — бэк открывает «Актуальные». */
  my(token, params = {}) {
    return request(`/api/homework/my${query(params)}`, { token });
  },

  /** Карточка задания вместе со своей работой — единственный вход ученика в модуль. */
  myOne(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/my-submission`, { token });
  },

  /**
   * Отправка работы одним запросом (003 §4): серверного черновика ответа нет, поэтому
   * текст и вложения уходят вместе — статус «Отправлено» появляется, только когда
   * сохранено всё.
   *
   * @param {{body?: string, photos?: Array, files?: Array, clientToken?: string}} payload
   *   `clientToken` — ключ идемпотентности: тот же ключ при ретрае вернёт уже созданную
   *   отправку, а не создаст вторую такую же.
   */
  submit(token, homeworkId, { body, photos = [], files = [], clientToken } = {}) {
    const form = new FormData();
    if (body) form.append('body', body);
    if (clientToken) form.append('clientToken', clientToken);
    for (const photo of photos) form.append('photos', asUpload(photo));
    for (const file of files) form.append('files', asUpload(file));
    return requestMultipart(`/api/homework/${homeworkId}/my-submission`, form, { token });
  },

  /** Карточка задания у учителя (001 §5). Ученику этот путь отвечает 403. */
  one(token, homeworkId) {
    return request(`/api/homework/${homeworkId}`, { token });
  },

  /**
   * Создание (001 §3). Либо `lessonId` — тогда класс, предмет, подгруппу и период бэкенд
   * берёт из урока, либо `classId` + `subjectId` для задания вне урока. Слать и то и другое
   * нельзя: контекст должен иметь один источник.
   */
  create(token, body) {
    return request('/api/homework', { method: 'POST', token, body });
  },

  /** Правка содержания и срока (001 §10). Новой записи не появляется. */
  update(token, homeworkId, body) {
    return request(`/api/homework/${homeworkId}`, { method: 'PUT', token, body });
  },

  remove(token, homeworkId) {
    return request(`/api/homework/${homeworkId}`, { method: 'DELETE', token });
  },

  publish(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/publish`, { method: 'POST', token });
  },

  complete(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/completion`, { method: 'POST', token });
  },

  /** Повторное открытие — снятие завершения, отдельного ресурса у него нет (001 §12.2). */
  reopen(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/completion`, { method: 'DELETE', token });
  },

  cancel(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/cancellation`, { method: 'POST', token });
  },

  /**
   * Копия задания (001 §11) — новая независимая запись без единого следа ответов оригинала:
   * черновик того же класса и предмета, который остаётся дополнить и опубликовать.
   */
  copy(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/copy`, { method: 'POST', token });
  },

  setRecipients(token, homeworkId, body) {
    return request(`/api/homework/${homeworkId}/recipients`, { method: 'PUT', token, body });
  },

  /** Готовые временные группы класса (002 §4): здесь только выбор, состав правит веб. */
  groups(token, classId, subjectId) {
    return request(`/api/homework-groups${query({ classId, subjectId, status: 'ACTIVE' })}`, { token });
  },

  materials(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/materials`, { token });
  },

  addMaterialFile(token, homeworkId, file) {
    const form = new FormData();
    form.append('file', asUpload(file));
    return requestMultipart(`/api/homework/${homeworkId}/materials/files`, form, { token });
  },

  deleteMaterial(token, homeworkId, materialId) {
    return request(`/api/homework/${homeworkId}/materials/${materialId}`, {
      method: 'DELETE',
      token,
    });
  },

  /** Кто получил задание и что сдал (004 §4). У черновика получателей ещё нет. */
  roster(token, homeworkId) {
    return request(`/api/homework/${homeworkId}/submissions`, { token });
  },

  submission(token, homeworkId, studentProfileId) {
    return request(`/api/homework/${homeworkId}/submissions/${studentProfileId}`, { token });
  },

  /**
   * Решение учителя по конкретной версии работы (004 §9).
   *
   * `expectedAttemptId` — не формальность: бэкенд сверяет версию с текущей и отклоняет
   * решение, если ученик успел прислать новую. Иначе учитель принял бы одну работу,
   * а подпись легла бы на другую.
   */
  review(token, homeworkId, studentProfileId, { decision, expectedAttemptId, comment, photos = [] }) {
    const form = new FormData();
    form.append('decision', decision);
    form.append('expectedAttemptId', String(expectedAttemptId));
    if (comment) form.append('comment', comment);
    for (const photo of photos) form.append('photos', asUpload(photo));
    return requestMultipart(
      `/api/homework/${homeworkId}/submissions/${studentProfileId}/reviews`,
      form,
      { token },
    );
  },

  /** Лента заданий ребёнка (005.3) — та же, что видит он сам. */
  children(token, childId, params = {}) {
    return request(`/api/homework/children/${childId}${query(params)}`, { token });
  },

  /** Карточка задания ребёнка: без текста, фотографий, файлов и версий его ответа. */
  childOne(token, homeworkId, childId) {
    return request(`/api/homework/${homeworkId}/children/${childId}`, { token });
  },
};

/**
 * Адреса файлов. Отдаются строками, а не загружаются: картинки показывает `<Image>`,
 * а он умеет ходить сам — включая заголовок авторизации, см. {@link authHeaders}.
 */
export const homeworkFiles = {
  material: (homeworkId, materialId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/materials/${materialId}/content`,
  myAttachment: (homeworkId, attachmentId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/my-submission/attachments/${attachmentId}/content`,
  myReviewPhoto: (homeworkId, photoId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/my-submission/review-photos/${photoId}/content`,
  childReviewPhoto: (homeworkId, childId, photoId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/children/${childId}/review-photos/${photoId}/content`,
  /** Вложение работы ученика глазами учителя (004 §5). */
  submissionAttachment: (homeworkId, studentProfileId, attachmentId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/submissions/${studentProfileId}/attachments/${attachmentId}/content`,
  reviewPhoto: (homeworkId, studentProfileId, photoId) =>
    `${API_BASE_URL}/api/homework/${homeworkId}/submissions/${studentProfileId}/review-photos/${photoId}/content`,
};

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/**
 * Вложение в форме multipart. React Native ждёт `{uri, name, type}` — не Blob: файл
 * не читается в память, а отдаётся ссылкой на локальный путь, и фотография на 8 МБ
 * не превращается в 8 МБ в куче JS.
 */
function asUpload(picked) {
  return {
    uri: picked.uri,
    name: picked.name || picked.fileName || fallbackName(picked),
    type: picked.type || picked.mimeType || 'application/octet-stream',
  };
}

function fallbackName(picked) {
  const ext = (picked.mimeType || picked.type || '').split('/')[1];
  return `upload.${ext || 'bin'}`;
}
