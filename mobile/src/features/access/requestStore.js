import * as SecureStore from '@shared/storage/secureStore';

/**
 * Заявка этого телефона.
 *
 * Токен заявки — единственный ключ к её судьбе: сервер хранит только его HMAC, по номеру или
 * ФИО статус не отдаёт, и потерянный токен не восстанавливается (контракт §2). Поэтому он лежит
 * в SecureStore, а не в памяти, и уходит отсюда только в тело запросов самой заявки. Номер и
 * этап рядом — чтобы экран знал, что показать, ещё до ответа сервера.
 */
const KEY = 'fiztex.accessRequest';

export async function readStoredRequest() {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value?.token ? value : null;
  } catch {
    return null;
  }
}

/** Ответ подачи или черновика (`AccessRequestTicketView`) — заявка этого телефона. */
export async function storeTicket(ticket, role) {
  const value = {
    token: ticket.token,
    requestId: ticket.requestId ?? null,
    stage: ticket.stage ?? null,
    role: role ?? null,
  };
  await SecureStore.setItemAsync(KEY, JSON.stringify(value));
  return value;
}

/** Свежий этап из статуса: по нему экран входа и A1 решают, что предлагать. */
export async function rememberStage(stored, stage) {
  if (!stored || stored.stage === stage) return stored;
  const value = { ...stored, stage };
  await SecureStore.setItemAsync(KEY, JSON.stringify(value));
  return value;
}

/** Сервер заявку не знает (истёк срок после решения или токен чужой): помнить нечего. */
export async function forgetRequest() {
  await SecureStore.deleteItemAsync(KEY);
}
