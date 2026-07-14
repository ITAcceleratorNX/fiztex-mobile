import { API_BASE_URL } from '../config';
import {
  clearEntranceSession,
  getEntranceToken,
  setEntranceToken,
} from './entranceSession';

async function parseError(res) {
  let message = `Ошибка ${res.status}`;
  try {
    const err = await res.json();
    message = err.message || err.detail || message;
  } catch {
    /* ignore */
  }
  const error = new Error(message);
  error.status = res.status;
  return error;
}

async function request(path, { method = 'GET', body, keepalive = false } = {}) {
  const token = await getEntranceToken();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive,
    });
  } catch {
    const error = new Error('Не удалось соединиться с сервером. Проверьте сеть и backend.');
    error.status = 0;
    throw error;
  }

  if (res.status === 401) {
    await clearEntranceSession();
    const error = new Error('Сессия истекла. Войдите по коду заново.');
    error.status = 401;
    throw error;
  }

  if (res.status === 204) return null;

  if (!res.ok) throw await parseError(res);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function requestMultipart(path, formData) {
  const token = await getEntranceToken();
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    const error = new Error('Не удалось соединиться с сервером. Проверьте сеть и backend.');
    error.status = 0;
    throw error;
  }

async function requestMultipart(path, { method = 'POST', token, formData } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body: formData });

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

  if (res.status === 401) {
    await clearEntranceSession();
    const error = new Error('Сессия истекла. Войдите по коду заново.');
    error.status = 401;
    throw error;
  }

  if (!res.ok) throw await parseError(res);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Admissions API — mirrors web `entranceApi.ts`. */
export const admissionsApi = {
  verifyCode: async (code) => {
    const result = await request('/api/admissions/access-code/verify', {
      method: 'POST',
      body: { code },
    });
    await setEntranceToken(result.accessToken);
    return result;
  },

  getAssignments: () => request('/api/admissions/applicant/assignments'),

  getResult: (assignmentId) =>
    request(`/api/admissions/assignments/${assignmentId}/result`),

  startAttempt: (assignmentId) =>
    request('/api/admissions/attempts/start', { method: 'POST', body: { assignmentId } }),

  getAttempt: (attemptId) => request(`/api/admissions/attempts/${attemptId}`),

  saveAnswer: (attemptId, payload) =>
    request(`/api/admissions/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: payload,
    }),

  submitAttempt: (attemptId) =>
    request(`/api/admissions/attempts/${attemptId}/submit`, { method: 'POST', body: {} }),

  logEvent: async (attemptId, type, details, keepalive = false) => {
    try {
      await request(`/api/admissions/attempts/${attemptId}/events`, {
        method: 'POST',
        body: { type, details },
        keepalive,
      });
    } catch {
      /* best-effort */
    }
  },

  uploadAnswerPhoto: async (attemptId, questionId, asset) => {
    const formData = new FormData();
    const name = asset.fileName || `photo-${Date.now()}.jpg`;
    const type = asset.mimeType || asset.type || 'image/jpeg';
    formData.append('file', { uri: asset.uri, name, type });
    return requestMultipart(
      `/api/admissions/attempts/${attemptId}/answers/${questionId}/photos`,
      formData,
    );
  },

  deleteAnswerPhoto: (attemptId, questionId, photoId) =>
    request(
      `/api/admissions/attempts/${attemptId}/answers/${questionId}/photos/${photoId}`,
      { method: 'DELETE' },
    ),
};

/** @deprecated Legacy `/api/entrance/*` — kept for D1, do not use in new screens. */
export const entranceApi = {
  verifyCode: (code) =>
    request('/api/admissions/access-code/verify', { method: 'POST', body: { code } }),

  getAssignments: (token) => request('/api/admissions/applicant/assignments', { token }),

  getResult: (token, assignmentId) =>
    request(`/api/admissions/assignments/${assignmentId}/result`, { token }),

  startAttempt: (token, assignmentId) =>
    request('/api/admissions/attempts/start', { method: 'POST', token, body: { assignmentId } }),

  getAttempt: (token, attemptId) => request(`/api/admissions/attempts/${attemptId}`, { token }),

  saveAnswer: (token, attemptId, payload) =>
    request(`/api/admissions/attempts/${attemptId}/answers`, { method: 'POST', token, body: payload }),

  submitAttempt: (token, attemptId) =>
    request(`/api/admissions/attempts/${attemptId}/submit`, { method: 'POST', token, body: {} }),

  logEvent: (token, attemptId, payload) =>
    request(`/api/admissions/attempts/${attemptId}/events`, { method: 'POST', token, body: payload }).catch(
      () => null
    ),

  uploadPhoto: (token, attemptId, questionId, fileUri) => {
    const name = fileUri.split('/').pop() || `photo_${Date.now()}.jpg`;
    const ext = (name.split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const formData = new FormData();
    formData.append('file', { uri: fileUri, name, type });
    return requestMultipart(`/api/admissions/attempts/${attemptId}/answers/${questionId}/photos`, {
      token,
      formData,
    });
  },

  deletePhoto: (token, attemptId, questionId, photoId) =>
    request(`/api/admissions/attempts/${attemptId}/answers/${questionId}/photos/${photoId}`, {
      method: 'DELETE',
      token,
    }),
  auth: (code) => request('/api/entrance/auth', { method: 'POST', body: { code } }),
  start: (token) =>
    fetch(`${API_BASE_URL}/api/entrance/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }).then(async (res) => {
      if (!res.ok) throw await parseError(res);
      return res.json();
    }),
  submitAnswer: (token, payload) =>
    fetch(`${API_BASE_URL}/api/entrance/answers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) throw await parseError(res);
      return res.json();
    }),
  logSuspicious: (token, payload) =>
    fetch(`${API_BASE_URL}/api/entrance/suspicious-activity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    }),
  finish: (token) =>
    fetch(`${API_BASE_URL}/api/entrance/finish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }).then(async (res) => {
      if (!res.ok) throw await parseError(res);
      return res.json();
    }),
  result: (code) => request(`/api/entrance/result?code=${encodeURIComponent(code)}`),
};

export { getEntranceToken, clearEntranceSession, setActiveAttemptId, getActiveAttemptId } from './entranceSession';
