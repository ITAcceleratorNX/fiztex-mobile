// A demo capability is deliberately not a JWT and is never persisted or sent over HTTP.
let sequence = 0;
let session = null;
const roles = ['STUDENT', 'PARENT', 'TEACHER'];

export const DEMO_ROLES = [
  { value: 'STUDENT', label: 'Ученик', hint: 'Расписание, задания и оценки', name: 'Данияр Демо' },
  { value: 'PARENT', label: 'Родитель', hint: 'Двое детей, их задания и результаты', name: 'Алия Демо' },
  { value: 'TEACHER', label: 'Учитель', hint: 'Проверка работ, посещаемость и журнал', name: 'Марина Демо' },
];

export function isDemoToken(token) {
  return typeof token === 'string' && token.startsWith('fiztex-demo:');
}

export function demoIsActive() { return session !== null; }
export function demoSessionId() { return session?.id ?? null; }

export function beginDemo(role, { reset = false } = {}) {
  if (!roles.includes(role)) throw new Error('Неизвестная роль демо');
  if (!session || reset) session = { id: ++sequence, files: new Map() };
  // A new capability on every role transition also invalidates late calls from old screens.
  const token = `fiztex-demo:${session.id}:${++sequence}:${role}`;
  session.token = token;
  session.role = role;
  const selected = DEMO_ROLES.find((item) => item.value === role);
  return { token, role, fullName: selected.name, accountId: roles.indexOf(role) + 900001 };
}

export function endDemo() { session = null; }

export function demoRole(token) {
  if (!session || token !== session.token) {
    const error = new Error('Демо-сессия завершена. Откройте демо заново.');
    error.status = 409;
    throw error;
  }
  return session.role;
}

export function rememberDemoFile(path, uri) {
  if (session && /^(file:|content:|blob:|data:)/.test(uri || '')) session.files.set(path, uri);
}

export function demoFileUri(path) {
  // Native Image/WebView bypass the JSON client. Never return an HTTP URL in demo.
  return session?.files.get(path.split('?')[0]) || 'data:text/plain;charset=utf-8,Local%20demo';
}
