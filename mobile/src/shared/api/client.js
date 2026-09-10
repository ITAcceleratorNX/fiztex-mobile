import { API_BASE_URL } from './config';

const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Отдельный таймаут на загрузку файлов.
 *
 * <p>Пятнадцать секунд — мера для JSON-запроса: он либо отвечает быстро, либо связи нет.
 * Для multipart это не мера, а потолок: ТЗ HOMEWORK-003 разрешает 100 МБ вложений, и
 * работа с парой фотографий решения на школьном Wi-Fi уезжает дольше пятнадцати секунд.
 * Прежний общий таймаут обрывал именно такую отправку — ученик видел «сервер долго не
 * отвечает» на нормальной сети и не мог сдать работу с фото вообще.
 *
 * <p>Потолок всё-таки нужен: без него оборванное соединение висело бы до конца сессии.
 */
const UPLOAD_TIMEOUT_MS = 180_000;

const sessionExpiredListeners = new Set();

/** Subscribe to account-session expiry (HTTP 401). Returns unsubscribe. */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired() {
  for (const listener of sessionExpiredListeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

export class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Сеть недоступна.
 *
 * <p>Прежний текст показывал адрес сервера и слово «backend»: ученику это не говорит
 * ничего, а проверить он может ровно одно — свой интернет. Адрес остаётся в логе
 * разработчика, человеку — то, что он способен сделать.
 */
/** Ждали дольше таймаута. Для человека это то же самое, что нет связи. */
const TIMEOUT_MESSAGE = 'Сервер долго не отвечает. Проверьте интернет и попробуйте снова.';

function networkError(message) {
  if (!message) {
    console.warn(`Network request failed: ${API_BASE_URL}`);
  }
  return new ApiError(0, message || 'Нет связи с сервером. Проверьте интернет и попробуйте снова.');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timer;
  const controller = new AbortController();
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(networkError(TIMEOUT_MESSAGE));
    }, timeoutMs);
  });

  const fetchPromise = fetch(url, { ...options, signal: controller.signal }).catch((e) => {
    if (e?.name === 'AbortError') {
      throw networkError(TIMEOUT_MESSAGE);
    }
    throw e;
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ответ без внятного текста. «Ошибка 500» человеку не говорит ни что случилось, ни что
 * делать; код остаётся в `ApiError.status` — по нему разбирается экран, а не человек.
 */
function fallbackMessage(status) {
  if (status >= 500) return 'Сервер не ответил. Попробуйте ещё раз через минуту.';
  if (status === 404) return 'Не найдено. Возможно, это уже удалили.';
  if (status === 403) return 'У вас нет доступа к этому действию.';
  if (status === 409) return 'Данные изменились, пока вы работали. Обновите экран.';
  if (status === 413) return 'Файл слишком большой — выберите файл поменьше.';
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

async function parseError(res) {
  let message = fallbackMessage(res.status);
  let code;
  let details;
  try {
    const err = await res.json();
    message = err.message || err.detail || message;
    code = err.code;
    details = err.details;
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, message, code, details);
}

/**
 * Shared JSON request.
 * @param {string} path - absolute API path starting with /api
 * `extraHeaders` — для тех редких вызовов, где заголовок часть контракта, а не
 * транспорта: `Idempotency-Key` у генерации ДЗ. Токен и content-type он не
 * перекрывает — ставятся после него.
 *
 * @param {{ method?: string, body?: unknown, token?: string|null, keepalive?: boolean, skipSessionExpiry?: boolean, extraHeaders?: Record<string,string> }} options
 */
export async function request(
  path,
  { method = 'GET', body, token, keepalive = false, skipSessionExpiry = false, extraHeaders } = {},
) {
  const headers = { Accept: 'application/json', ...(extraHeaders || {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive,
    });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw networkError();
  }

  if (res.status === 401) {
    if (!skipSessionExpiry) notifySessionExpired();
    // На входе 401 означает «неверный код или пароль», а не конец сессии: показать там
    // «Сессия истекла. Войдите снова.» — значит объяснить неудачу тем, чего не было,
    // и человек пробует то же самое второй раз вместо того, чтобы исправить ввод.
    throw skipSessionExpiry
      ? await parseError(res)
      : new ApiError(401, 'Сессия истекла. Войдите снова.');
  }

  if (res.status === 204) return null;

  if (!res.ok) throw await parseError(res);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Multipart POST (e.g. photo upload).
 * @param {string} path
 * @param {FormData} formData
 * @param {{ token?: string|null, skipSessionExpiry?: boolean, timeoutMs?: number }} options
 */
export async function requestMultipart(
  path,
  formData,
  { token, skipSessionExpiry = false, timeoutMs = UPLOAD_TIMEOUT_MS } = {},
) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        method: 'POST',
        headers,
        body: formData,
      },
      timeoutMs,
    );
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw networkError();
  }

  if (res.status === 401) {
    if (!skipSessionExpiry) notifySessionExpired();
    throw skipSessionExpiry
      ? await parseError(res)
      : new ApiError(401, 'Сессия истекла. Войдите снова.');
  }

  if (!res.ok) throw await parseError(res);

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
