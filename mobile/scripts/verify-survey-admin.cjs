#!/usr/bin/env node
/**
 * Проверка логики опросов психолога (PSYCHOLOGIST-002).
 *
 * Тот же приём, что у соседних verify-скриптов: настоящий исходник компилируется
 * babel-пресетом проекта и выполняется здесь. Экранов тут нет — всё, в чём можно
 * ошибиться незаметно, живёт в чистом `surveyAdminMap.js`.
 *
 * Что закреплено:
 *  — у опроса нет правильных ответов и баллов: проверка требует только текст и два
 *    непустых варианта у выбора;
 *  — открытый вопрос теряет варианты, а вернувшийся к выбору получает два пустых;
 *  — в запрос уходят только заполненные варианты — пустые сервер отверг бы;
 *  — чего не хватает для публикации, названо словами, а не «сервер отказал»;
 *  — именные ответы обещаются только у именного опроса.
 *
 * Запуск:
 *   node scripts/verify-survey-admin.cjs
 */

const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const file = path.join(ROOT, 'src/shared/api/surveyAdminMap.js');

const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file,
  presets: ['babel-preset-expo'],
  babelrc: false,
  configFile: false,
});

const fakeRequire = (id) => (id.startsWith('@babel/runtime') ? require(id) : {});
const module_ = { exports: {} };
new Function('require', 'module', 'exports', code)(fakeRequire, module_, module_.exports);

const {
  answerText,
  completionPercent,
  emptyQuestion,
  hasProblems,
  publishBlockers,
  respondedText,
  showsNames,
  statusMeta,
  toDraft,
  toRequest,
  validate,
  withType,
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

// ── Черновики и типы ──────────────────────────────────────────────────────────

const fresh = emptyQuestion();
check('новый вопрос — выбор с двумя пустыми вариантами', fresh.type === 'SINGLE_CHOICE' && fresh.options.length === 2);

const open = withType(fresh, 'OPEN_TEXT');
check('открытый вопрос теряет варианты', open.options.length === 0);
check('возврат к выбору снова даёт два варианта', withType(open, 'MULTIPLE_CHOICE').options.length === 2);

const loaded = toDraft({ id: 5, text: 'Как настроение?', type: 'SINGLE_CHOICE', options: [{ text: 'Хорошо' }] });
check('загруженный вопрос получает ключ и текст', loaded.key === 'q-5' && loaded.text === 'Как настроение?');

// ── Проверка перед сохранением ────────────────────────────────────────────────

check('пустой набор сохранять нечего', hasProblems(validate([])));

const noText = { key: 'a', text: '  ', type: 'SINGLE_CHOICE', options: [{ text: 'Да' }, { text: 'Нет' }] };
check('вопрос без текста не проходит', Boolean(validate([noText]).a));

const oneOption = { key: 'b', text: 'Вопрос', type: 'SINGLE_CHOICE', options: [{ text: 'Да' }, { text: '' }] };
check('выбор из одного варианта не проходит', Boolean(validate([oneOption]).b));

const duplicated = { key: 'c', text: 'Вопрос', type: 'MULTIPLE_CHOICE', options: [{ text: 'Да' }, { text: 'да' }] };
check('повторяющиеся варианты не проходят', Boolean(validate([duplicated]).c));

const goodChoice = { key: 'd', text: 'Вопрос', type: 'SINGLE_CHOICE', options: [{ text: 'Да' }, { text: 'Нет' }] };
const goodOpen = { key: 'e', text: 'Что тревожит?', type: 'OPEN_TEXT', options: [] };
check('выбор с двумя вариантами проходит', !hasProblems(validate([goodChoice])));
check('открытый вопрос без вариантов проходит — баллов у опроса нет', !hasProblems(validate([goodOpen])));

const request = toRequest([
  { key: 'f', text: ' Вопрос ', type: 'SINGLE_CHOICE', options: [{ text: 'Да' }, { text: ' ' }, { text: 'Нет' }] },
  goodOpen,
]);
check('текст обрезается', request[0].text === 'Вопрос');
check('пустые варианты в запрос не уходят', request[0].options.length === 2);
check('у открытого вопроса вариантов нет', request[1].options.length === 0);

// ── Публикация и сводка ───────────────────────────────────────────────────────

check('без вопросов публиковать нельзя', publishBlockers({ questionCount: 0, audienceClassIds: [1] }).length === 1);
check('без классов публиковать нельзя', publishBlockers({ questionCount: 3, audienceClassIds: [] }).length === 1);
check('готовый опрос публикуется', publishBlockers({ questionCount: 3, audienceClassIds: [1] }).length === 0);

check('состояние переведено', statusMeta('ACTIVE').label === 'Идёт приём');
check('незнакомое состояние не ломает экран', statusMeta('PAUSED').label === 'PAUSED');
check('сводка считается', respondedText({ recipientsTotal: 30, respondedCount: 12 }) === 'Ответили 12 из 30');
check('без получателей сводка говорит об этом', respondedText({ recipientsTotal: 0 }) === 'Получателей пока нет');
check('процент берётся с сервера', completionPercent({ recipientsTotal: 30, respondedCount: 12, completionPercent: 40 }) === 40);
check('процент считается, если сервер его не прислал', completionPercent({ recipientsTotal: 30, respondedCount: 15 }) === 50);

// ── Именные ответы ────────────────────────────────────────────────────────────

check('именной опрос показывает имена', showsNames({ mode: 'NAMED' }));
check('анонимный — не показывает', !showsNames({ mode: 'ANONYMOUS' }));
check('выбранные варианты склеиваются', answerText({ type: 'SINGLE_CHOICE', selectedOptionTexts: ['Да'] }) === 'Да');
check('пропущенный вопрос назван словами', answerText({ type: 'OPEN_TEXT', openText: '  ' }) === 'Нет ответа');

if (failed > 0) {
  console.error(`\n${failed} проверок не прошло`);
  process.exit(1);
}
console.log('\nВсё сходится');
