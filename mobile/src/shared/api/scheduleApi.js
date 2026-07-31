import { request } from './client';

/** `?date=` selects the week containing that day; omitted = current week. */
function weekPath(base, date) {
  return date ? `${base}?date=${encodeURIComponent(date)}` : base;
}

/** Role schedule views for student/teacher (me) and parent (children). */
export const scheduleApi = {
  meToday: (token) => request('/api/schedule/me/today', { token }),
  meWeek: (token, date) => request(weekPath('/api/schedule/me/week', date), { token }),
  childToday: (token, childId) => request(`/api/schedule/children/${childId}/today`, { token }),
  childWeek: (token, childId, date) =>
    request(weekPath(`/api/schedule/children/${childId}/week`, date), { token }),
};
