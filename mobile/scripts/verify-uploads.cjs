#!/usr/bin/env node
/**
 * Проверка того, как вложение попадает в multipart-форму (`appendUpload`).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь с подменённым `Platform`.
 *
 * Что закреплено:
 *  — на телефоне в форму уходит `{uri, name, type}`: нативный `FormData` читает файл
 *    по ссылке сам;
 *  — в браузере уходит `File`/`Blob` с именем, а не объект: браузер привёл бы его к
 *    строке `[object Object]`, и сервер принял бы работу без фотографий;
 *  — если пикер в браузере дал только `data:`-ссылку, из неё собирается `Blob`;
 *  — на телефоне форма уходит через `XMLHttpRequest`: `expo/fetch` (глобальный `fetch`
 *    с Expo SDK 57) часть `{uri}` не отправляет и падает до сети.
 *
 * Запуск:
 *   node scripts/verify-uploads.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/shared/api/upload.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

function load(os) {
  const module_ = { exports: {} };
  const fakeRequire = (name) => {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name.startsWith('@babel/runtime')) return require(name);
    return { isDemoToken: () => false };
  };
  new Function('require', 'module', 'exports', code)(fakeRequire, module_, module_.exports);
  return module_.exports;
}

class FakeForm {
  constructor() {
    this.parts = [];
  }

  append(field, value, fileName) {
    this.parts.push({ field, value, fileName });
  }
}

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failed += 1;
  }
}

console.log('Телефон');
{
  const { appendUpload } = load('ios');
  const form = new FakeForm();
  appendUpload(form, 'photos', { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' });
  const [part] = form.parts;
  check('уходит ссылка на файл', part.value.uri === 'file:///a.jpg');
  check('имя и тип на месте', part.value.name === 'a.jpg' && part.value.type === 'image/jpeg');
  check('имя третьим аргументом не передаётся', part.fileName === undefined);
}

console.log('Браузер: файл из пикера');
{
  const { appendUpload } = load('web');
  const picked = new Blob(['jpeg'], { type: 'image/jpeg' });
  const form = new FakeForm();
  appendUpload(form, 'photos', { uri: 'blob:x', name: 'page-1.jpg', type: 'image/jpeg', file: picked });
  const [part] = form.parts;
  check('уходит сам файл, а не объект', part.value === picked);
  check('имя файла передано третьим аргументом', part.fileName === 'page-1.jpg');
}

console.log('Браузер: только data:-ссылка');
{
  const { appendUpload } = load('web');
  const form = new FakeForm();
  const base64 = Buffer.from('hello').toString('base64');
  appendUpload(form, 'files', { uri: `data:text/plain;base64,${base64}`, name: 'a.txt' });
  const [part] = form.parts;
  check('собран Blob', part.value instanceof Blob);
  check('тип взят из ссылки', part.value.type === 'text/plain');
  check('размер совпадает с содержимым', part.value.size === 5);
  check('имя файла на месте', part.fileName === 'a.txt');
}

console.log('Браузер: порядок нескольких фотографий сохраняется');
{
  const { appendUpload } = load('web');
  const form = new FakeForm();
  const files = [1, 2, 3].map((n) => new Blob([String(n)], { type: 'image/jpeg' }));
  files.forEach((blob, i) => appendUpload(form, 'photos', { name: `p${i + 1}.jpg`, file: blob }));
  check('три части в исходном порядке', form.parts.map((p) => p.fileName).join(',') === 'p1.jpg,p2.jpg,p3.jpg');
}

/**
 * Транспорт multipart (`requestMultipart` в `client.js`).
 *
 * С Expo SDK 57 глобальный `fetch` на телефоне — `expo/fetch`, и часть `{uri, name, type}` он
 * не отправляет: бросает «Unsupported FormDataPart implementation» до сети. Подменный `fetch`
 * ниже ведёт себя так же, поэтому отправка с телефона обязана идти мимо него — через XHR.
 */
const clientFile = path.join(ROOT, 'src/shared/api/client.js');
const clientCode = babel.transformSync(fs.readFileSync(clientFile, 'utf8'), {
  filename: clientFile,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
}).code;

function loadClient(os) {
  const module_ = { exports: {} };
  const fakeRequire = (name) => {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === './config') return { API_BASE_URL: 'https://api.test' };
    if (name === '../demo/session') return { demoIsActive: () => false, isDemoToken: () => false };
    if (name === '../demo/api') return { demoRequest: () => { throw new Error('demo'); } };
    if (name.startsWith('@babel/runtime')) return require(name);
    throw new Error(`unexpected import ${name}`);
  };
  new Function('require', 'module', 'exports', clientCode)(fakeRequire, module_, module_.exports);
  return module_.exports;
}

const xhrs = [];
class FakeXHR {
  constructor() {
    this.headers = {};
    xhrs.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name, value) {
    this.headers[name] = value;
  }

  send(body) {
    this.body = body;
  }

  respond(status, text) {
    this.status = status;
    this.responseText = text;
    this.onload();
  }
}

const fetchCalls = [];
function expoLikeFetch(url, init) {
  fetchCalls.push({ url, init });
  const parts = init?.body?._parts ?? [];
  if (parts.some(([, value]) => value && typeof value === 'object' && 'uri' in value)) {
    return Promise.reject(new Error('Unsupported FormDataPart implementation'));
  }
  return Promise.resolve({ status: 200, ok: true, text: async () => '{"via":"fetch"}' });
}

function nativeForm() {
  return { _parts: [['body', 'Test'], ['photos', { uri: 'file:///IMG_0003.jpg', name: 'IMG_0003.jpg', type: 'image/jpeg' }]] };
}

async function rejection(promise) {
  try {
    await promise;
    return null;
  } catch (e) {
    return e;
  }
}

async function verifyTransport() {
  const savedXHR = globalThis.XMLHttpRequest;
  const savedFetch = globalThis.fetch;
  const savedWarn = console.warn;
  globalThis.XMLHttpRequest = FakeXHR;
  globalThis.fetch = expoLikeFetch;
  console.warn = () => {};
  try {
    console.log('Телефон: отправка работы с фото');
    {
      const { requestMultipart } = loadClient('ios');
      const form = nativeForm();
      const pending = requestMultipart('/api/homework/7/my-submission', form, { token: 't1' });
      const xhr = xhrs.at(-1);
      check('уходит через XHR, а не через fetch', xhr && fetchCalls.length === 0);
      check('POST на полный адрес', xhr.method === 'POST' && xhr.url === 'https://api.test/api/homework/7/my-submission');
      check('токен и Accept в заголовках', xhr.headers.Authorization === 'Bearer t1' && xhr.headers.Accept === 'application/json');
      check('Content-Type не ставится руками — границу пишет сеть', !('Content-Type' in xhr.headers));
      check('в тело уходит та же форма', xhr.body === form);
      check('потолок загрузки — три минуты', xhr.timeout === 180000);
      xhr.respond(201, '{"id":5,"status":"SUBMITTED"}');
      const result = await pending;
      check('ответ сервера разобран', result && result.id === 5 && result.status === 'SUBMITTED');
    }

    console.log('Телефон: отказ сервера');
    {
      const { requestMultipart } = loadClient('android');
      const pending = requestMultipart('/api/homework/7/my-submission', nativeForm(), { token: 't1' });
      xhrs.at(-1).respond(400, '{"message":"Работа пустая","code":"HOMEWORK_SUBMISSION_EMPTY"}');
      const error = await rejection(pending);
      check('текст и код сервера', error && error.status === 400 && error.message === 'Работа пустая'
        && error.code === 'HOMEWORK_SUBMISSION_EMPTY');
    }
    {
      const { requestMultipart, onSessionExpired } = loadClient('ios');
      let expired = 0;
      onSessionExpired(() => { expired += 1; });
      const pending = requestMultipart('/api/homework/7/my-submission', nativeForm(), { token: 't1' });
      xhrs.at(-1).respond(401, '');
      const error = await rejection(pending);
      check('401 — конец сессии', error && error.status === 401 && expired === 1);
    }

    console.log('Телефон: обрыв и таймаут');
    {
      const { requestMultipart } = loadClient('ios');
      const pending = requestMultipart('/api/homework/7/my-submission', nativeForm(), { token: 't1' });
      xhrs.at(-1).onerror();
      const error = await rejection(pending);
      check('обрыв — «нет связи»', error && error.status === 0 && /Нет связи/.test(error.message));
    }
    {
      const { requestMultipart } = loadClient('ios');
      const pending = requestMultipart('/api/homework/7/my-submission', nativeForm(), { token: 't1' });
      xhrs.at(-1).ontimeout();
      const error = await rejection(pending);
      check('таймаут — «долго не отвечает»', error && error.status === 0 && /долго не отвечает/.test(error.message));
    }

    console.log('Браузер: отправка через fetch');
    {
      const { requestMultipart } = loadClient('web');
      const before = xhrs.length;
      const result = await requestMultipart('/api/service-requests', { _parts: [['title', 'Лампа']] }, { token: 't1' });
      check('уходит через fetch', fetchCalls.length === 1 && xhrs.length === before && result.via === 'fetch');
    }
  } finally {
    globalThis.XMLHttpRequest = savedXHR;
    globalThis.fetch = savedFetch;
    console.warn = savedWarn;
  }
}

verifyTransport().then(() => {
  if (failed > 0) {
    console.error(`\n${failed} проверок не прошло`);
    process.exit(1);
  }
  console.log('\nВсе проверки прошли');
}, (e) => {
  console.error(e);
  process.exit(1);
});
