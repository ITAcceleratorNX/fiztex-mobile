import { request as sharedRequest, requestMultipart as sharedMultipart } from '@shared/api/client';
import {
  clearEntranceSession,
  getEntranceToken,
  setEntranceToken,
} from './entranceSession';

async function request(path, options = {}) {
  const token = await getEntranceToken();
  try {
    return await sharedRequest(path, {
      ...options,
      token,
      skipSessionExpiry: true,
    });
  } catch (e) {
    if (e?.status === 401) {
      await clearEntranceSession();
      const error = new Error('Сессия истекла. Войдите по коду заново.');
      error.status = 401;
      throw error;
    }
    throw e;
  }
}

async function requestMultipart(path, formData) {
  const token = await getEntranceToken();
  try {
    return await sharedMultipart(path, formData, {
      token,
      skipSessionExpiry: true,
    });
  } catch (e) {
    if (e?.status === 401) {
      await clearEntranceSession();
      const error = new Error('Сессия истекла. Войдите по коду заново.');
      error.status = 401;
      throw error;
    }
    throw e;
  }
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

  logEvent: async (attemptId, type, details, opts = {}) => {
    try {
      const body = { type, details };
      if (opts.questionId != null) body.questionId = opts.questionId;
      await request(`/api/admissions/attempts/${attemptId}/events`, {
        method: 'POST',
        body,
        keepalive: Boolean(opts.keepalive),
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

export { getEntranceToken, clearEntranceSession, setActiveAttemptId, getActiveAttemptId } from './entranceSession';
