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
 *  — если пикер в браузере дал только `data:`-ссылку, из неё собирается `Blob`.
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

if (failed > 0) {
  console.error(`\n${failed} проверок не прошло`);
  process.exit(1);
}
console.log('\nВсе проверки прошли');
