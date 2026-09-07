import { request } from './client';
import { uuid } from '../uuid';

/**
 * Генерация содержимого задания моделью (ТЗ HOMEWORK-BE-006).
 *
 * С телефона запускается только конспект: результат теста — вопросы с ключом, а редактора
 * вопросов в приложении нет, и сгенерировать то, чего нельзя поправить, значит отдать
 * классу непроверенный машинный тест. Конспект ложится в `description`, который правит
 * обычная форма задания, — цикл на телефоне замкнут.
 */
export const homeworkAiApi = {
  /** Остаток суточной квоты. Спрашивается при открытии шита. */
  quota: (token) => request('/api/homework/ai-quota', { token }),

  /**
   * Запуск. Отвечает `202` и строкой задачи — сама генерация идёт на сервере, поэтому
   * экран волен закрыться.
   *
   * `key` обязателен и создаётся один раз на открытие шита: повторное нажатие на плохой
   * сети не должно стать вторым платным вызовом модели.
   */
  start: (token, homeworkId, key, body) =>
    request(`/api/homework/${homeworkId}/ai-generations`, {
      method: 'POST',
      token,
      body,
      extraHeaders: { 'Idempotency-Key': key },
    }),

  /** Состояние одной задачи — по нему рисуется фаза ожидания. */
  job: (token, jobId) => request(`/api/homework/ai-generations/${jobId}`, { token }),

  /** Генерации задания: карточка узнаёт из них, что задача ещё идёт. */
  jobs: (token, homeworkId) => request(`/api/homework/${homeworkId}/ai-generations`, { token }),
};

/** Ключ идемпотентности на одно открытие шита. */
export function newIdempotencyKey() {
  return uuid();
}
