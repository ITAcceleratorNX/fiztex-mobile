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
  page: (token, { before, limit } = {}) => {
    const query = new URLSearchParams();
    if (before) query.set('before', before);
    if (limit) query.set('limit', String(limit));
    const suffix = query.toString();
    return request(`/api/notifications${suffix ? `?${suffix}` : ''}`, { token });
  },

  /** Число на колокольчике. */
  unreadCount: (token) => request('/api/notifications/unread-count', { token }),

  markRead: (token, id) => request(`/api/notifications/${id}/read`, { method: 'POST', token }),

  /**
   * `upTo` — время самой новой показанной строки: уведомление, пришедшее, пока человек нажимал, прочитанным
   * не становится.
   */
  markAllRead: (token, upTo) =>
    request(`/api/notifications/read-all${upTo ? `?upTo=${encodeURIComponent(upTo)}` : ''}`, {
      method: 'POST',
      token,
    }),
};
