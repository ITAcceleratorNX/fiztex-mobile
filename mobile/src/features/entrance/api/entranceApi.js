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
};
