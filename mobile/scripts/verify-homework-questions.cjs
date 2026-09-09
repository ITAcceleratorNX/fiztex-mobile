#!/usr/bin/env node
/**
 * Проверка редактора вопросов теста с телефона.
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь. Компонент тут не нужен — вся логика, которую
 * можно ошибиться, живёт в чистом `homeworkQuestionsMap`.
 *
 * Что закреплено:
 *  — правила совпадают с серверными, и «Сохранить» объясняет нехватку до нажатия;
 *  — у закрытого вопроса нет фотографий, у открытого нет вариантов;
 *  — поле allowPhoto уходит явным, иначе снятая галочка не сохранится;
 *  — смена типа не оставляет вопрос в состоянии, которое сервер отвергнет.
 *
 * Запуск:
 *   node scripts/verify-homework-questions.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/shared/api/homeworkQuestionsMap.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

const module_ = { exports: {} };
new Function('require', 'module', 'exports', code)(() => ({}), module_, module_.exports);

const {
  addOption, dropOption, emptyQuestion, hasProblems, toDraft, toRequest, validate,
  withCorrect, withOption, withType,
} = module_.exports;

let failed = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ ${name}`);
    failed += 1;
  }
}

function open(overrides = {}) {
  return { ...withType(emptyQuestion(), 'OPEN_TEXT'), text: 'Как измерить плотность?', ...overrides };
}

console.log('\nПравила сохранения');

check('пустой текст не пропускается',
  validate([{ ...emptyQuestion(), text: '  ' }])[0].includes('Текст вопроса пустой'));

check('нулевой балл не пропускается',
  validate([{ ...open(), maxScore: 0 }])[0].includes('Балл должен быть больше нуля'));

const oneCorrect = emptyQuestion();
check('у «одного ответа» ровно одна отметка',
  validate([withCorrect(oneCorrect, 0)])[0].every((m) => !m.includes('ровно один'))
  && validate([{ ...oneCorrect, options: oneCorrect.options.map((o) => ({ ...o, correct: true })) }])[0]
      .includes('Отметьте ровно один правильный вариант'));

const multi = withType(emptyQuestion(), 'MULTIPLE_CHOICE');
check('у «нескольких» нужна хотя бы одна отметка',
  validate([{ ...multi, options: multi.options.map((o) => ({ ...o, correct: false })) }])[0]
      .includes('Отметьте хотя бы один правильный вариант'));

const filled = withOption(withOption(withCorrect(emptyQuestion(), 0), 0, 'Верно'), 1, 'Неверно');
check('заполненный закрытый вопрос сохраняется',
  !hasProblems(validate([{ ...filled, text: 'Вопрос' }])));

check('число фото вне диапазона объясняется до нажатия',
  validate([open({ allowPhoto: true, maxPhotos: 9 })])[0]
      .includes('Фотографий можно разрешить от одной до пяти'));

console.log('\nЧто уходит на сервер');

const request = toRequest([open({ allowPhoto: true, maxPhotos: 3 })]);
check('у открытого вопроса нет вариантов', request.questions[0].options.length === 0);
check('разрешение на фото уходит как есть',
  request.questions[0].allowPhoto === true && request.questions[0].maxPhotos === 3);

const closed = toRequest([{ ...filled, text: 'Вопрос', allowPhoto: true, maxPhotos: 4 }]);
check('у закрытого вопроса фото не отправляется',
  closed.questions[0].allowPhoto === false && closed.questions[0].maxPhotos === 1);

const unchecked = toRequest([open({ allowPhoto: false })]);
check('снятая галочка уходит явным false, а не пропуском',
  unchecked.questions[0].allowPhoto === false);

check('пустые эталон и критерии не отправляются пустыми строками',
  unchecked.questions[0].referenceAnswer === undefined
  && unchecked.questions[0].gradingCriteria === undefined);

console.log('\nСмена типа и варианты');

check('перевод в открытый убирает варианты',
  withType(filled, 'OPEN_TEXT').options.length === 0);

check('перевод в закрытый снимает разрешение на фото',
  withType(open({ allowPhoto: true, maxPhotos: 3 }), 'SINGLE_CHOICE').allowPhoto === false);

check('перевод в закрытый заводит два варианта, а не один',
  withType(open(), 'SINGLE_CHOICE').options.length === 2);

check('вариант добавляется неотмеченным',
  addOption(filled).options.at(-1).correct === false);

check('меньше двух вариантов удалить нельзя',
  dropOption(filled, 0).options.length === 2
  && dropOption(addOption(filled), 0).options.length === 2);

console.log('\nЧтение ответа сервера');

const draft = toDraft({
  id: 7, type: 'OPEN_TEXT', text: 'Вопрос', maxScore: 2,
  allowPhoto: true, maxPhotos: 2, options: [],
});
check('ответ сервера читается без потерь',
  draft.id === 7 && draft.allowPhoto === true && draft.maxPhotos === 2 && draft.maxScore === 2);

check('поля, которых сервер не прислал, получают умолчания',
  toDraft({ type: 'SINGLE_CHOICE', text: 'В' }).maxPhotos === 1);

if (failed > 0) {
  console.error(`\n${failed} проверок не прошло`);
  process.exit(1);
}
console.log('\n✓ редактор вопросов согласован с сервером');
