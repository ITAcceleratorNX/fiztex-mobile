#!/usr/bin/env node
/**
 * Вход для всех ролей (AUTH-FE-001, M1–M7): правила модели, сессия с временным паролем и
 * сигнал сервера «смените пароль».
 *
 * Тест-раннера в проекте нет, поэтому здесь тот же приём, что и в остальных `verify-*.cjs`:
 * настоящие исходники компилируются проектным babel-пресетом и выполняются с заглушками
 * вместо React и нативных модулей. Если рядом лежит бэкенд, алфавит персонального кода и
 * нормализация телефона сверяются с его исходниками — второй экземпляр правила разошёлся бы
 * с первым молча.
 *
 * Usage:
 *   node scripts/verify-sign-in.cjs
 */

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const backend = path.resolve(root, '../../fiztex-back/src/main/java/com/fiztex/account/service');
const compiled = new Map();

function runtime({ respond } = {}) {
  const cache = new Map();
  const slots = [];
  let cursor = 0;
  const stored = new Map();
  const requests = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => null,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      }];
    },
    useEffect: () => {},
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  const fetch = async (url, options = {}) => {
    requests.push({ url, options, body: options.body ? JSON.parse(options.body) : undefined });
    const { status = 200, body = null } = (respond && respond(url, options)) || {};
    return {
      status,
      ok: status >= 200 && status < 300,
      text: async () => (body == null ? '' : JSON.stringify(body)),
      json: async () => body,
    };
  };
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} };
    cache.set(filename, mod);
    if (!compiled.has(filename)) {
      compiled.set(filename, babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, presets: ['babel-preset-expo'], configFile: false, babelrc: false,
      }).code);
    }
    const req = (id) => {
      if (id.startsWith('@babel/runtime')) return require(id);
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (id === 'react-native') return { Platform: { OS: 'ios' } };
      if (id === 'expo-constants') return { expoConfig: {} };
      if (id === 'expo/virtual/env') return { env: {} };
      if (id === '@shared/storage/secureStore') {
        return {
          getItemAsync: async (key) => stored.get(key) ?? null,
          setItemAsync: async (key, value) => { stored.set(key, value); },
          deleteItemAsync: async (key) => { stored.delete(key); },
        };
      }
      if (id === '@shared/push/registration') return { unregisterThisDevice: async () => {} };
      if (id === './biometrics') {
        return {
          getBiometricsEnabled: async () => false,
          setBiometricsEnabled: async () => {},
          getBiometricAvailability: async () => ({ available: false, types: [] }),
          authenticateWithBiometrics: async () => ({ success: false }),
          biometricLabel: () => 'Face ID',
        };
      }
      let resolved;
      if (id.startsWith('@shared/')) resolved = path.join(root, 'src/shared', id.slice(8));
      else if (id.startsWith('@features/')) resolved = path.join(root, 'src/features', id.slice(10));
      else if (id.startsWith('.')) resolved = path.resolve(path.dirname(filename), id);
      else throw new Error(`Unexpected import ${id}`);
      return load(resolved.endsWith('.js') ? resolved : `${resolved}.js`);
    };
    new Function('require', 'module', 'exports', '__DEV__', 'fetch', compiled.get(filename))(
      req, mod, mod.exports, false, fetch);
    return mod.exports;
  }
  const renderAuth = () => {
    cursor = 0;
    return load('src/features/auth/AuthContext.js').AuthProvider({ children: null }).props.value;
  };
  return { load, stored, requests, renderAuth };
}

const model = runtime().load('src/features/auth/signInModel.js');

test('M1 решает «пароль или PIN» по форме логина, как сервер', () => {
  const { classifyLogin } = model;
  assert.deepEqual(classifyLogin('D6A44QAX'), { kind: 'code', login: 'D6A44QAX' });
  // Автозамена и дефис при переписывании с листочка не ломают код.
  assert.deepEqual(classifyLogin(' d6a4-4qax '), { kind: 'code', login: 'D6A44QAX' });
  assert.deepEqual(classifyLogin('D6A4 4QAX'), { kind: 'code', login: 'D6A44QAX' });
  assert.deepEqual(classifyLogin('+7 700 100 00 14'), { kind: 'phone', login: '+77001000014' });
  assert.deepEqual(classifyLogin('8 (700) 100-00-14'), { kind: 'phone', login: '+77001000014' });
  assert.deepEqual(classifyLogin('7001000014'), { kind: 'phone', login: '+77001000014' });
  assert.deepEqual(classifyLogin('super@fiztex.local'), { kind: 'email', login: 'super@fiztex.local' });
  assert.equal(classifyLogin('   ').kind, 'empty');
  // Восемь цифр 2–9 — форма кода и у сервера; ветку решает форма, а не догадка о человеке.
  assert.equal(classifyLogin('23456789').kind, 'code');
});

test('M1 подсказывает по форме ввода, а не по существованию человека', () => {
  const { classifyLogin, loginHint } = model;
  assert.equal(classifyLogin('D6A44QA0').reason, 'codeChars', 'O и 0 — частая путаница');
  assert.equal(classifyLogin('DOA44QAX').reason, 'codeChars');
  assert.equal(classifyLogin('48213907').reason, 'schoolCode', 'код от школы взрослому — не логин');
  assert.equal(classifyLogin('12345').reason, 'shape');
  assert.equal(classifyLogin('вася').reason, 'shape');
  assert.ok(loginHint(classifyLogin('48213907')).includes('Забыли пароль или PIN?'));
  assert.equal(loginHint(classifyLogin('+77001000014')), null);
  assert.equal(loginHint(classifyLogin('D6A44QAX')), null);
});

test('алфавит и длина персонального кода совпадают с бэкендом', { skip: !fs.existsSync(backend) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(path.join(backend, 'CredentialService.java'), 'utf8');
  const alphabet = /STUDENT_CODE_ALPHABET\s*=\s*"([^"]+)"/.exec(source)?.[1];
  const length = Number(/STUDENT_CODE_LENGTH\s*=\s*(\d+)/.exec(source)?.[1]);
  const activationLength = Number(/ACTIVATION_CODE_LENGTH\s*=\s*(\d+)/.exec(source)?.[1]);
  assert.equal(model.PERSONAL_CODE_ALPHABET, alphabet);
  assert.equal(model.PERSONAL_CODE_LENGTH, length);
  assert.equal(model.SCHOOL_CODE_LENGTH, activationLength);
  assert.match(source, /'0' \+ secureRandom\.nextInt\(10\)/, 'код активации — из одних цифр');
});

test('телефон нормализуется так же, как PhoneNormalizer', { skip: !fs.existsSync(backend) && 'бэкенд не рядом' }, () => {
  const source = fs.readFileSync(path.join(backend, 'PhoneNormalizer.java'), 'utf8');
  // Ветки сервера, которые повторяет клиент: 8XXXXXXXXXX и 7XXXXXXXXXX → +7…, 10 цифр → +7…, 00 → +.
  for (const branch of ['digits.startsWith("8") && digits.length() == 11', 'digits.length() == 10', 'startsWith("00")']) {
    assert.ok(source.includes(branch), `в PhoneNormalizer нет ветки ${branch}`);
  }
  const { normalizePhone } = model;
  assert.equal(normalizePhone('87001000014'), '+77001000014');
  assert.equal(normalizePhone('77001000014'), '+77001000014');
  assert.equal(normalizePhone('7001000014'), '+77001000014');
  assert.equal(normalizePhone('0077001000014'), '+77001000014');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  assert.equal(normalizePhone('700100'), null);
  assert.equal(normalizePhone('+7 700 abc'), null);
});

test('номер на карточке M2 пишется как в макете', () => {
  assert.equal(model.formatPhone('+77001000014'), '+7 700 100 00 14');
  assert.equal(model.formatPhone('+442079460958'), '+442079460958');
});

test('PIN, код от школы и правила нового пароля', () => {
  const { isPin, isSchoolCode, newPasswordRules, newPinState } = model;
  assert.equal(isPin('1234'), true);
  assert.equal(isPin('123456'), true);
  assert.equal(isPin('123'), false);
  assert.equal(isPin('1234567'), false);
  assert.equal(isPin('12a4'), false);
  assert.equal(isSchoolCode('48213907'), true);
  assert.equal(isSchoolCode('4821390'), false);
  assert.deepEqual(newPasswordRules('short', ''), { longEnough: false, matches: false, ready: false });
  assert.deepEqual(newPasswordRules('long-enough', 'long-enough'), { longEnough: true, matches: true, ready: true });
  // «Не совпадает» — только когда повтор набран целиком: на третьей цифре это не новость.
  assert.equal(newPinState('1234', '12').mismatch, false);
  assert.equal(newPinState('1234', '1235').mismatch, true);
  assert.equal(newPinState('1234', '1234').ready, true);
});

test('отказ — одной фразой ветки, сеть и роль — своими словами', () => {
  const { signInErrorMessage, pinSetupErrorMessage, schoolCodeErrorMessage, passwordChangeErrorMessage } = model;
  const rejected = { status: 400, message: 'Неверный логин или пароль. Проверьте раскладку и регистр.' };
  const offline = { status: 0, message: 'Нет связи с сервером. Проверьте интернет и попробуйте снова.' };
  assert.match(signInErrorMessage(rejected, 'phone'), /^Неверный телефон или пароль/);
  assert.match(signInErrorMessage(rejected, 'email'), /^Неверная почта или пароль/);
  assert.match(signInErrorMessage(rejected, 'code'), /придумайте PIN/);
  assert.equal(signInErrorMessage(offline, 'phone'), offline.message, 'обрыв связи — не «неверный пароль»');
  const role = Object.assign(new Error('Этот аккаунт не поддерживается мобильным приложением — войдите с компьютера.'), { status: 403 });
  assert.equal(signInErrorMessage(role, 'phone'), role.message);
  assert.match(pinSetupErrorMessage(rejected), /PIN по нему уже создан/);
  assert.equal(pinSetupErrorMessage(offline), offline.message);
  assert.match(schoolCodeErrorMessage(rejected), /неверный, уже использован или истёк/);
  assert.equal(passwordChangeErrorMessage({ status: 400, message: 'Текущий пароль не подошёл' }), 'Текущий пароль не подошёл');
});

test('код от школы перебирает пути активации и останавливается на сети', async () => {
  const { activateWithSchoolCode, ACTIVATION_PATHS } = model;
  const { authApi } = runtime().load('src/shared/api/authApi.js');
  for (const name of ACTIVATION_PATHS) assert.equal(typeof authApi[name], 'function', `authApi.${name}`);

  const calls = [];
  const rejected = Object.assign(new Error('Код активации неверный или уже использован'), { status: 400 });
  const fake = (results) => Object.fromEntries(ACTIVATION_PATHS.map((name, index) => [name, async (...args) => {
    calls.push([name, ...args]);
    const result = results[index];
    if (result instanceof Error) throw result;
    return result;
  }]));

  const teacher = { token: 't', role: 'TEACHER' };
  assert.equal(await activateWithSchoolCode(fake([rejected, teacher]), '+77001000014', '48213907', 'password1'), teacher);
  assert.deepEqual(calls.map(([name]) => name), ['activateParent', 'activateTeacher']);
  assert.deepEqual(calls[1].slice(1), ['+77001000014', '48213907', 'password1']);

  calls.length = 0;
  const offline = Object.assign(new Error('Нет связи'), { status: 0 });
  await assert.rejects(activateWithSchoolCode(fake([offline]), '+77001000014', '48213907', 'password1'), offline);
  assert.equal(calls.length, 1, 'после обрыва связи остальные пути не трогаются');

  calls.length = 0;
  await assert.rejects(
    activateWithSchoolCode(fake(ACTIVATION_PATHS.map(() => rejected)), '+77001000014', '48213907', 'password1'),
    { status: 400 });
  assert.equal(calls.length, ACTIVATION_PATHS.length);
});

test('единый вход идёт в /auth/sign-in, а не в прежние эндпоинты', async () => {
  const r = runtime({ respond: () => ({ body: { token: 'x', role: 'PARENT', mustChangePassword: false } }) });
  const { authApi } = r.load('src/shared/api/authApi.js');
  await authApi.signIn('D6A44QAX', '1234');
  assert.ok(r.requests[0].url.endsWith('/api/auth/sign-in'));
  assert.deepEqual(r.requests[0].body, { login: 'D6A44QAX', secret: '1234' });
  assert.equal(authApi.login, undefined, '/auth/login не отдаёт mustChangePassword');
  assert.equal(authApi.studentLogin, undefined);
});

const changed = { token: 'fresh-token', role: 'PARENT', fullName: 'Родитель', mustChangePassword: false };
const respondChange = (url) => (url.endsWith('/api/auth/password/change') ? { body: changed } : null);

test('вход временным паролем: отметка в профиле, секрет только в памяти, разделы закрыты', async () => {
  const r = runtime({ respond: respondChange });
  let auth = r.renderAuth();
  await auth.signInWithResponse(
    { token: 'temp-token', role: 'PARENT', fullName: 'Родитель', mustChangePassword: true },
    { secret: 'TEMPPASS42' });
  auth = r.renderAuth();
  assert.equal(auth.isAuthenticated, false, 'push, полоса урока и переходы держатся на isAuthenticated');
  assert.equal(auth.needsPasswordChange, true);
  assert.equal(auth.temporarySecret, 'TEMPPASS42');
  assert.equal(JSON.parse(r.stored.get('fiztex.auth.profile')).mustChangePassword, true);
  assert.ok(![...r.stored.values()].some((value) => String(value).includes('TEMPPASS42')), 'секрет не в хранилище');

  const response = await auth.changePassword(undefined, 'my-new-password');
  const sent = r.requests.at(-1);
  assert.ok(sent.url.endsWith('/api/auth/password/change'));
  assert.equal(sent.options.headers.Authorization, 'Bearer temp-token');
  assert.deepEqual(sent.body, { currentPassword: 'TEMPPASS42', newPassword: 'my-new-password' });

  await auth.signInWithResponse(response);
  auth = r.renderAuth();
  assert.equal(auth.isAuthenticated, true);
  assert.equal(auth.needsPasswordChange, false);
  assert.equal(auth.temporarySecret, null);
  assert.equal(auth.token, 'fresh-token');
  assert.equal(JSON.parse(r.stored.get('fiztex.auth.profile')).mustChangePassword, false);
});

test('после перезапуска временный пароль приходит из поля экрана', async () => {
  const r = runtime({ respond: respondChange });
  let auth = r.renderAuth();
  // Секрета в памяти нет — так выглядит сессия, восстановленная из хранилища.
  await auth.signInWithResponse({ token: 'temp-token', role: 'TEACHER', fullName: 'Учитель', mustChangePassword: true });
  auth = r.renderAuth();
  assert.equal(auth.temporarySecret, null);
  await auth.changePassword('TYPED-TEMP', 'my-new-password');
  assert.deepEqual(r.requests.at(-1).body, { currentPassword: 'TYPED-TEMP', newPassword: 'my-new-password' });
});

test('обычный вход не оставляет секрета в памяти', async () => {
  const r = runtime();
  let auth = r.renderAuth();
  await auth.signInWithResponse({ token: 'tok', role: 'STUDENT', fullName: 'Ученик', mustChangePassword: false }, { secret: '1234' });
  auth = r.renderAuth();
  assert.equal(auth.isAuthenticated, true);
  assert.equal(auth.temporarySecret, null);
});

test('403 PASSWORD_CHANGE_REQUIRED на запросе сессии зовёт подписчиков, остальное — нет', async () => {
  let answer = { status: 403, body: { status: 403, message: 'Смените временный пароль — после этого доступ откроется.', code: 'PASSWORD_CHANGE_REQUIRED' } };
  const r = runtime({ respond: () => answer });
  const client = r.load('src/shared/api/client.js');
  let calls = 0;
  const unsubscribe = client.onPasswordChangeRequired(() => { calls += 1; });

  await assert.rejects(client.request('/api/me/profile', { token: 'old-session' }), { status: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
  assert.equal(calls, 1);
  await assert.rejects(client.request('/api/auth/sign-in', { method: 'POST', body: {}, skipSessionExpiry: true }));
  assert.equal(calls, 1, 'без токена сессии сигнала нет');
  answer = { status: 403, body: { message: 'У вас нет доступа', code: 'FORBIDDEN' } };
  await assert.rejects(client.request('/api/me/profile', { token: 'old-session' }), { status: 403 });
  assert.equal(calls, 1, 'обычный 403 — не повод уводить на смену пароля');
  unsubscribe();
});
