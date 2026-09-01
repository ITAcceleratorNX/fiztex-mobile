import { request } from './client';

/**
 * Отметка по QR (AttendanceQrScanController).
 *
 * Урок в запросе не участвует: сканирующий его не знает, урок определяет токен. Клиент
 * payload **не разбирает** — рисует его учитель, а ученик присылает обратно целиком:
 * формат принадлежит серверу и однажды сменится без релиза приложения
 * (`fiztex-back/docs/attendance-qr-contract.md` §6).
 */
export const attendanceQrApi = {
  scan: (token, payload) =>
    request('/api/attendance/qr/scan', { token, method: 'POST', body: { payload } }),

  /** Состояние кода урока: можно ли открыть, показан ли сейчас, кто уже отсканировал. */
  state: (token, lessonId) => request(`/api/lessons/${lessonId}/attendance/qr`, { token }),

  /**
   * Открыть код или перевыпустить — одна команда: для учителя это одно действие
   * «показать классу код», а различает их наличие действующей версии.
   */
  open: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/attendance/qr`, { token, method: 'POST' }),

  close: (token, lessonId) =>
    request(`/api/lessons/${lessonId}/attendance/qr/close`, { token, method: 'POST' }),
};
