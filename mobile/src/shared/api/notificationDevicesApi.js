import { request } from './client';

/** Сколько ждать отвязки телефона при выходе: дольше — выход не ждёт, бэк всё равно отзовёт сессии. */
export const UNREGISTER_TIMEOUT_MS = 3_000;

/**
 * Телефон для push-уведомлений (`/api/notifications/devices`, PUSH-001 A§11.1).
 *
 * Аккаунт в теле не передаётся — бэк берёт его из токена. `installationId` — постоянный идентификатор
 * установки приложения (`shared/push/installationId`), по нему бэк понимает, что это тот же телефон.
 */
export const notificationDevicesApi = {
  /**
   * @param {{ token: string, platform: 'IOS'|'ANDROID', appVersion?: string|null, locale?: string|null }} device
   */
  register: (authToken, installationId, device) =>
    request(`/api/notifications/devices/${installationId}`, {
      method: 'PUT',
      token: authToken,
      body: device,
    }),

  /**
   * Перед выходом. `skipSessionExpiry`: сессия и так заканчивается — 401 здесь не повод
   * второй раз выкидывать на экран входа.
   */
  unregister: (authToken, installationId) =>
    request(`/api/notifications/devices/${installationId}`, {
      method: 'DELETE',
      token: authToken,
      skipSessionExpiry: true,
      timeoutMs: UNREGISTER_TIMEOUT_MS,
    }),
};
