import { request } from './client';

/** Role schedule views for student/teacher (me) and parent (children). */
export const scheduleApi = {
  meToday: (token) => request('/api/schedule/me/today', { token }),
  meWeek: (token) => request('/api/schedule/me/week', { token }),
  childToday: (token, childId) => request(`/api/schedule/children/${childId}/today`, { token }),
  childWeek: (token, childId) => request(`/api/schedule/children/${childId}/week`, { token }),
};
