import { request } from './client';

/** School account auth — единый вход, активация по коду, смена пароля, выход. */
export const authApi = {
  /**
   * Единая точка входа (AUTH-BE-001 §9): телефон или почта + пароль либо персональный код +
   * PIN — ветку сервер выбирает сам по форме логина. Прежние `/auth/login` и
   * `/auth/student/login` живы, но приложение через них больше не ходит: они не отдают
   * `mustChangePassword`, и человек с временным паролем вошёл бы в разделы, где сервер
   * отвечает 403 на всё.
   */
  signIn: (login, secret) =>
    request('/api/auth/sign-in', {
      method: 'POST',
      body: { login, secret },
      skipSessionExpiry: true,
    }),

  /**
   * Смена своего пароля — единственное, что открыто после входа временным. Сервер гасит все
   * сессии и отвечает новым токеном. 401 здесь — настоящее окончание сессии (токен уже
   * отозван), поэтому `skipSessionExpiry` не ставится: человек вернётся на вход.
   */
  changePassword: (token, currentPassword, newPassword) =>
    request('/api/auth/password/change', {
      method: 'POST',
      body: { currentPassword, newPassword },
      token,
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

  /**
   * Психолог (PSYCHOLOGIST-001 §1) — тот же путь, что у администратора: телефон/почта
   * + пароль, код `PASSWORD_RESET_CODE`. Бэкенд принимает обе роли одним эндпоинтом
   * (`ActivationService.activateAdmin`), поэтому один метод на них двоих, а не два
   * похожих. Поле называется `phone`, но принимает и почту — контакт разбирает бэкенд.
   */
  activateAdmin: (contact, code, password) =>
    request('/api/auth/admin/activate', {
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
