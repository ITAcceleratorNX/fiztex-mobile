import { request } from './client';

/** School account auth — parent/teacher/admin login + student code/PIN + activation. */
export const authApi = {
  login: (login, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: { login, password },
      skipSessionExpiry: true,
    }),

  studentLogin: (code, pin) =>
    request('/api/auth/student/login', {
      method: 'POST',
      body: { code, pin },
      skipSessionExpiry: true,
    }),

  activateStudent: (code, pin) =>
    request('/api/auth/student/activate', {
      method: 'POST',
      body: { code, pin },
      skipSessionExpiry: true,
    }),

  activateParent: (phone, code, password) =>
    request('/api/auth/parent/activate', {
      method: 'POST',
      body: { phone, code, password },
      skipSessionExpiry: true,
    }),

  activateTeacher: (phone, code, password) =>
    request('/api/auth/teacher/activate', {
      method: 'POST',
      body: { phone, code, password },
      skipSessionExpiry: true,
    }),

  /**
   * Хозяйственные службы и охрана (SERVICE-BE-002 §2) — свой путь активации, а не
   * учительский: бэкенд проверяет роль вместе с кодом, и чужой эндпоинт откажет.
   *
   * Поле называется `phone`, но принимает и почту: у сотрудника без школьного профиля
   * телефона может не быть вовсе, и бэкенд разбирает контакт сам.
   */
  activateStaff: (contact, code, password) =>
    request('/api/auth/staff/activate', {
      method: 'POST',
      body: { phone: contact, code, password },
      skipSessionExpiry: true,
    }),

  logout: (token) =>
    request('/api/auth/logout', {
      method: 'POST',
      token,
      skipSessionExpiry: true,
    }).catch(() => null),
};
