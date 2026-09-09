#!/usr/bin/env node
/**
 * Проверка логики прохождения теста ДЗ и античита (HOMEWORK-BE-006 §6, ANTICHEAT-001).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь. Экран целиком не нужен — всё, в чём можно
 * ошибиться незаметно, лежит в чистом `homeworkTestModel`.
 *
 * Что закреплено:
 *  — пробел не считается ответом: иначе вопрос закрашивался бы в навигаторе как готовый;
 *  — пропущенные вопросы уезжают пустыми, а не выбрасываются: сервер требует все;
 *  — у обычного задания клиент шлёт только попытку скриншота (§4), у теста — уходы тоже.
 *
 * Запуск:
 *   node scripts/verify-homework-test.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/features/homework/homeworkTestModel.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

const module_ = { exports: {} };
new Function('require', 'module', 'exports', code)(() => ({}), module_, module_.exports);

const { isAnswered, answeredCount, toSubmitPayload, antiCheatEventsFor, allowsAntiCheatEvent } =
  module_.exports;

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failed += 1;
  }
}

console.log('Ответ дан или нет');
check('пусто — не ответ', !isAnswered(undefined) && !isAnswered({}));
check('выбранный вариант — ответ', isAnswered({ selectedOptionIds: [7] }));
check('текст — ответ', isAnswered({ openTextAnswer: 'плотность' }));
check('один пробел — не ответ', !isAnswered({ openTextAnswer: '   ' }));

console.log('Счётчик отвеченных');
const questions = [
  { id: 1, type: 'SINGLE_CHOICE' },
  { id: 2, type: 'OPEN_TEXT' },
  { id: 3, type: 'MULTI_CHOICE' },
];
const answers = { 1: { selectedOptionIds: [10] }, 2: { openTextAnswer: '' } };
check('считает только настоящие ответы', answeredCount(questions, answers) === 1);
check('пустой список — ноль', answeredCount([], {}) === 0);

console.log('Тело отправки');
const payload = toSubmitPayload(questions, answers);
check('уезжают все вопросы, включая пропущенные', payload.length === 3);
check('закрытый — списком вариантов', Array.isArray(payload[0].selectedOptionIds));
check('открытый — текстом', payload[1].openText === '');
check(
  'у пропущенного закрытого пустой список, а не undefined',
  Array.isArray(payload[2].selectedOptionIds) && payload[2].selectedOptionIds.length === 0,
);
check(
  'у закрытого нет поля openText, у открытого — selectedOptionIds',
  !('openText' in payload[0]) && !('selectedOptionIds' in payload[1]),
);

console.log('Античит: что вправе слать экран');
check(
  'у обычного задания только скриншот (§4)',
  antiCheatEventsFor('content').length === 1
    && allowsAntiCheatEvent('content', 'SCREENSHOT_ATTEMPT'),
);
check('уход из приложения у обычного ДЗ не шлётся', !allowsAntiCheatEvent('content', 'APP_BACKGROUND'));
check('у теста уходы шлются (§3)', allowsAntiCheatEvent('test', 'APP_BACKGROUND'));
check('возврат в тест тоже фиксируется', allowsAntiCheatEvent('test', 'RE_ENTRY'));
check('выход с экрана теста фиксируется', allowsAntiCheatEvent('test', 'PAGE_CLOSE'));

if (failed > 0) {
  console.error(`\n✗ провалено проверок: ${failed}`);
  process.exit(1);
}
console.log('\n✓ все проверки прошли');
