import { request } from './client';

// Share simultaneous reads from the home tile, list and refresh button. No caching of replies.
const inFlight = new Map();
function read(token, path) {
  const key = JSON.stringify([token, path]);
  if (!inFlight.has(key)) {
    const promise = request(path, { token }).finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
    inFlight.set(key, promise);
  }
  return inFlight.get(key);
}
const studentPath = (lessonId, studentId) => `/api/lessons/${lessonId}/parent-comments/students/${studentId}`;
export const parentCommentsApi = {
  sheet: (token, lessonId) => read(token, `/api/lessons/${lessonId}/parent-comments`),
  feed: (token, childId, subjectId = null, page = 0) => read(token,
    `/api/parent-comments/children/${childId}?page=${page}${subjectId == null ? '' : `&subjectId=${encodeURIComponent(subjectId)}`}`),
  publish: (token, lessonId, studentId, text, version) => request(studentPath(lessonId, studentId),
    { token, method: 'PUT', body: { text, version: version ?? null } }),
  improve: (token, lessonId, studentId, text) => request(`${studentPath(lessonId, studentId)}/improvement`,
    { token, method: 'POST', body: { text }, timeoutMs: 120000 }),
  markRead: (token, childId, commentId, version) => request(`/api/parent-comments/children/${childId}/comments/${commentId}/read`,
    { token, method: 'PUT', body: { version } }),
};
