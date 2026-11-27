import { request } from './client';

/**
 * Сводки об учёбе ребёнка (`fiztex-back/docs/ai-student-reports-contract.md` → «Родитель»).
 * Только действующие публикации и только краткая версия, утверждённая учителем: чужой ребёнок —
 * 403, снятая или чужая публикация — 404. Связь с ребёнком сервер проверяет на каждом запросе.
 */
export const aiReportsApi = {
  list: (token, childId) => request(`/api/ai-reports/children/${childId}`, { token }),
  detail: (token, childId, reportId) => request(`/api/ai-reports/children/${childId}/${reportId}`, { token }),
};
