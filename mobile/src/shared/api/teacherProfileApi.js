import { request } from './client';
import { apiFileUrl } from './config';

/**
 * Профиль преподавателя ребёнка и открытые родителю достижения
 * (контракт `fiztex-back/docs/teacher-achievements-contract.md`).
 *
 * Права сервер проверяет на каждом запросе — и на файле тоже: ссылка на PDF не постоянная,
 * после отзыва доступа она отвечает 404, даже если экран открыт.
 */
export function fetchChildTeacherProfile(childId, teacherId, token) {
  return request(`/api/children/${childId}/teachers/${teacherId}`, { token });
}

export function achievementFileUrl(childId, teacherId, achievementId) {
  return apiFileUrl(`/api/children/${childId}/teachers/${teacherId}/achievements/${achievementId}/content`);
}
