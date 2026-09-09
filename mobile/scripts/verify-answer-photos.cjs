#!/usr/bin/env node
/**
 * Проверка отбора фотографий решения (AIGRADE-003).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь. Компонент целиком тут не нужен — вся
 * логика, которую можно ошибиться, вынесена в чистую `fitPickedPhotos`.
 *
 * Что закреплено:
 *  — лишние снимки не уходят на сервер: отказ по лимиту стоил бы трафика впустую;
 *  — про отброшенные ученику говорят, иначе он решит, что приложено всё;
 *  — когда всё влезло, лишнего сообщения нет.
 *
 * Запуск:
 *   node scripts/verify-answer-photos.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/features/homework/AnswerPhotos.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

// Компонент тянет react-native и экранные модули — здесь они не нужны и заглушаются.
const noop = new Proxy({}, { get: () => () => null });
const module_ = { exports: {} };
new Function('require', 'module', 'exports', code)(() => noop, module_, module_.exports);

const { fitPickedPhotos } = module_.exports;

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failed += 1;
  }
}

const photos = ['a', 'b', 'c', 'd'];

const fits = fitPickedPhotos(photos.slice(0, 2), 3);
check('всё влезло — отправляем всё', fits.accepted.length === 2);
check('всё влезло — молчим', fits.notice === null);

const overflow = fitPickedPhotos(photos, 2);
check('лишние не уходят на сервер', overflow.accepted.length === 2);
check('про отброшенные сказано', /Приложено 2 из выбранных 4/.test(overflow.notice ?? ''));

const nothingLeft = fitPickedPhotos(photos, 0);
check('места нет — не отправляем ничего', nothingLeft.accepted.length === 0);
check('места нет — объясняем', Boolean(nothingLeft.notice));

const negative = fitPickedPhotos(photos, -1);
check('отрицательный остаток не переворачивает срез', negative.accepted.length === 0);

if (failed > 0) {
  console.error(`\n${failed} проверок не прошло`);
  process.exit(1);
}
console.log('\n✓ отбор фотографий решения корректен');
