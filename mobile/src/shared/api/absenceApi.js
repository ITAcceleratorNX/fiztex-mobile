import { request } from './client';

/**
 * Причина отсутствия за день — сторона родителя (ABSENCE-REASON-001,
 * `fiztex-back/docs/absence-reasons-contract.md`). Ребёнок указывается всегда: сервер сверяет связь
 * и на чужого ребёнка отвечает 403 так же, как на неуказанного.
 *
 * Ответ отправляется на пару «ребёнок + дата», а не по уроку: причина одна на все пропуски дня.
 */
export const absenceApi = {
  /** Дни отсутствия ребёнка в диапазоне — подсветка календаря и блок «Нужна причина». */
  days: (token, { childId, from, to }) =>
    request(
      `/api/absence-days/my?childId=${encodeURIComponent(childId)}`
        + `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { token },
    ),

  /** День целиком: уроки, итог, открытый запрос и свои ответы. */
  day: (token, { childId, date }) =>
    request(`/api/absence-days/my/${encodeURIComponent(date)}?childId=${encodeURIComponent(childId)}`, { token }),

  /** Ответ — по запросу классного руководителя, без запроса или уточнение после отклонения. */
  respond: (token, { childId, date, reason, comment }) =>
    request(
      `/api/absence-days/my/${encodeURIComponent(date)}/responses?childId=${encodeURIComponent(childId)}`,
      { method: 'POST', token, body: { reason, comment: comment || undefined } },
    ),
};
