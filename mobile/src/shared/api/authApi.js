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

  logout: (token) =>
    request('/api/auth/logout', {
      method: 'POST',
      token,
      skipSessionExpiry: true,
    }).catch(() => null),
};
