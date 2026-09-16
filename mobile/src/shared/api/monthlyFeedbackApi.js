import { request } from './client';

const childPath = (childId) => `/api/monthly-feedback/children/${childId}`;

/**
 * Ежемесячная обратная связь для родителя (MONTHLY-FEEDBACK-001,
 * `fiztex-back/docs/monthly-feedback-contract.md` §4).
 *
 * <p>Родитель видит только опубликованное, и это правило живёт в запросе сервера, а не здесь:
 * черновик учителя в ответ физически не попадает.
 */
export const monthlyFeedbackApi = {
  /** P1. Месяцы с опубликованными отзывами за всю историю ребёнка, от нового к старому. */
  months: (token, childId) => request(`${childPath(childId)}/months`, { token }),

  /** P2. Отзывы за месяц по предметам и краткое состояние анализа. */
  month: (token, childId, month) => request(`${childPath(childId)}/months/${month}`, { token }),

  /** P3. Анализ целиком — результат, основание, оговорка; им же опрашивается идущий анализ. */
  analysis: (token, childId, month) =>
    request(`${childPath(childId)}/months/${month}/ai-analysis`, { token }),

  /**
   * P4. Запуск анализа. Ответ — всегда представление P3: если анализ уже идёт или актуален,
   * вернётся он, и модель повторно не вызывается.
   *
   * `key` — новый на каждое нажатие и тот же при повторе после обрыва сети: иначе повторная
   * отправка на плохой связи стала бы вторым платным вызовом.
   */
  requestAnalysis: (token, childId, month, key) =>
    request(`${childPath(childId)}/months/${month}/ai-analysis`, {
      method: 'POST',
      token,
      extraHeaders: { 'Idempotency-Key': key },
    }),
};
