import { API_BASE_URL } from './config';

const REQUEST_TIMEOUT_MS = 15_000;

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

function networkError(message) {
  return new ApiError(
    0,
    message || `Не удалось соединиться с сервером (${API_BASE_URL}). Проверьте сеть и backend.`,
  );
}

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timer;
  const controller = new AbortController();
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(networkError(`Сервер не отвечает (${API_BASE_URL}). Проверьте сеть и что backend запущен.`));
    }, timeoutMs);
  });

  const fetchPromise = fetch(url, { ...options, signal: controller.signal }).catch((e) => {
    if (e?.name === 'AbortError') {
      throw networkError(`Сервер не отвечает (${API_BASE_URL}). Проверьте сеть и что backend запущен.`);
    }
    throw e;
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

async function parseError(res) {
  let message = `Ошибка ${res.status}`;
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
 * @param {{ method?: string, body?: unknown, token?: string|null, keepalive?: boolean, skipSessionExpiry?: boolean }} options
 */
export async function request(path, { method = 'GET', body, token, keepalive = false, skipSessionExpiry = false } = {}) {
  const headers = { Accept: 'application/json' };
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
 * @param {{ token?: string|null, skipSessionExpiry?: boolean }} options
 */
export async function requestMultipart(path, formData, { token, skipSessionExpiry = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
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
