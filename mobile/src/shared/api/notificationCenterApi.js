import { request } from './client';

/**
 * Центр уведомлений — лента колокольчика (`/api/notifications`, ТЗ «Внутренние уведомления — Student / Parent»).
 *
 * Аккаунт берётся из токена: чужой ленты нет, а чужое уведомление для «прочитано» — 404. Что попадает в ленту,
 * решил бэк при создании уведомления; приложение только показывает и отмечает прочитанное.
 */
export const notificationCenterApi = {
  /**
   * Страница ленты, новые сверху. Следующая — с `before` = id последней строки.
   * @returns {Promise<{ items: object[], hasMore: boolean, unreadCount: number }>}
   */
  page: (token, { before, limit, collection } = {}) => {
    const query = new URLSearchParams();
    if (collection) query.set('collection', collection);
    if (before) query.set('before', before);
    if (limit) query.set('limit', String(limit));
    const suffix = query.toString();
    return request(`/api/notifications${suffix ? `?${suffix}` : ''}`, { token });
  },

  /**
   * Подборки колокольчика (Figma `phyztex` Р1): у каждой последняя строка и число непрочитанного. Раздел строки
   * решает сервер (`collection`), приложение только называет его.
   * @returns {Promise<{ collections: { collection: string, unreadCount: number, latest: object }[], unreadCount: number }>}
   */
  collections: (token) => request('/api/notifications/collections', { token }),

  /** Число на колокольчике. */
  unreadCount: (token) => request('/api/notifications/unread-count', { token }),

  markRead: (token, id) => request(`/api/notifications/${id}/read`, { method: 'POST', token }),

  /**
   * `upTo` — время самой новой показанной строки: уведомление, пришедшее, пока человек нажимал, прочитанным
   * не становится.
   */
  markAllRead: (token, upTo, collection) => {
    const query = new URLSearchParams();
    if (upTo) query.set('upTo', upTo);
    if (collection) query.set('collection', collection);
    const suffix = query.toString();
    return request(`/api/notifications/read-all${suffix ? `?${suffix}` : ''}`, { method: 'POST', token });
  },
};
