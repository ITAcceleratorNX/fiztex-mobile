import { API_BASE_URL } from '../config';

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const err = await res.json();
      message = err.message || err.detail || message;
    } catch {
      /* ignore */
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const entranceApi = {
  auth: (code) => request('/api/entrance/auth', { method: 'POST', body: { code } }),
  start: (token) => request('/api/entrance/start', { method: 'POST', token }),
  submitAnswer: (token, payload) =>
    request('/api/entrance/answers', { method: 'POST', token, body: payload }),
  logSuspicious: (token, payload) =>
    request('/api/entrance/suspicious-activity', { method: 'POST', token, body: payload }),
  finish: (token) => request('/api/entrance/finish', { method: 'POST', token }),
  result: (code) => request(`/api/entrance/result?code=${encodeURIComponent(code)}`),
};
