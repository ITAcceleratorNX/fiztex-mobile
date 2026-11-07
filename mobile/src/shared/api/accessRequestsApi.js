import { request } from './client';

/**
 * Заявка на доступ (AUTH-BE-001, контракт `fiztex-back/docs/access-request-contract.md`).
 *
 * Все вызовы — без токена сессии: у заявителя аккаунта ещё нет, и доказательство «заявка моя» —
 * её токен в теле. Отсюда `skipSessionExpiry`: 401 здесь не означает конец чьей-то сессии.
 */
export const accessRequestsApi = {
  /** Справочник классов для формы: `{ yearConfigured, grades: [{ grade, letters: [...] }] }`. */
  classes: () => request('/api/access-requests/classes', { skipSessionExpiry: true }),

  /** Черновик: без токена — создать, с токеном — дополнить. Принимает и неполную форму. */
  saveDraft: (form) =>
    request('/api/access-requests/draft', { method: 'POST', body: form, skipSessionExpiry: true }),

  /**
   * Отправить администратору. Без токена заявка создаётся и подаётся сразу; повторное
   * «Отправить» тем же токеном возвращает ту же заявку и ничего не создаёт.
   */
  submit: (form) =>
    request('/api/access-requests/submit', { method: 'POST', body: form, skipSessionExpiry: true }),

  /** Исправленная после отказа — новая заявка со своим номером и своим токеном. */
  resubmit: (form) =>
    request('/api/access-requests/resubmit', { method: 'POST', body: form, skipSessionExpiry: true }),

  /** Этап, следующий шаг и причина отказа — по токену и только по нему. */
  status: (token) =>
    request('/api/access-requests/status', { method: 'POST', body: { token }, skipSessionExpiry: true }),

  /** Телефон, на который придёт push об одобрении. Только у заявки на рассмотрении; ответа нет. */
  registerDevice: (device) =>
    request('/api/access-requests/device', { method: 'PUT', body: device, skipSessionExpiry: true }),
};
